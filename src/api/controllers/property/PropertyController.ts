import { PropertyImage } from '@/api/entity/PropertyImages';
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity';
import { generatePresignedUrl } from '../s3/awsControllers';

export const getUserProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ErrorHandler('User ID is required', 400);
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const properties = await propertyRepo.find({
      where: { userId },
      relations: ['address', 'propertyImageKeys'],
      order: {
        createdAt: 'DESC',
      },
    });

    if (!properties || properties.length === 0) {
      throw new ErrorHandler('No properties found for this user', 404);
    }

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      properties,
      count: properties.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      throw new ErrorHandler('Property ID is required', 400);
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const property = await propertyRepo.findOne({
      where: { id: propertyId },
      relations: ['address', 'propertyImageKeys'],
    });

    if (!property) {
      throw new ErrorHandler('Property not found', 404);
    }

    return res.status(200).json({
      message: 'Property retrieved successfully',
      property,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, userType } = req.body;

    if (!userId || !userType) {
      throw new ErrorHandler('User ID and User Type are required', 400);
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    let query = propertyRepo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.address', 'address')
      .leftJoinAndSelect('property.propertyImageKeys', 'propertyImageKeys');

    // Apply filters based on userType
    if (userType === 'admin') {
      // Admin can see all properties
      query = query.orderBy('property.createdAt', 'DESC');
    } else if (userType === 'agent') {
      // Agent can see their own properties and public properties
      query = query
        .where('property.userId = :userId OR property.isPublic = :isPublic', {
          userId,
          isPublic: true,
        })
        .orderBy('property.createdAt', 'DESC');
    } else {
      // Regular users can only see their own properties
      query = query.where('property.userId = :userId', { userId }).orderBy('property.createdAt', 'DESC');
    }

    const properties = await query.getMany();

    if (!properties || properties.length === 0) {
      throw new ErrorHandler('No properties found', 404);
    }

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      properties,
      count: properties.length,
    });
  } catch (error) {
    next(error);
  }
};

// Search property
interface PropertySearch {
  category?: string;
  subCategory?: string;
  city?: string;
  locality?: string;
  state?: string;
}

export const searchProperty = async (req: Request, res: Response) => {
  const propertySearch: PropertySearch = req.body;
  const { category, subCategory, state, city } = propertySearch;
  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    const property = await propertyRepo.find({
      where: {
        category,
        subCategory,
        address: {
          ...(state && { state }),
          ...(city && { city }),
        },
      },
      relations: ['address', 'propertyImageKeys'],
    });
    if (!property) {
      throw new ErrorHandler('Property not found', 404);
    }
    return res.status(200).json({
      message: 'Property retrieved successfully',
      property,
    });
  } catch (error) {
    throw new ErrorHandler('server error', 500);
  }
};

// trending Property

export const trendingProperty = async (req: Request, res: Response) => {
  const { category, subCategory } = req.body;

  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    const properties = await propertyRepo.find({
      where: { category, subCategory },
      relations: ['address', 'propertyImageKeys'],
    });

    if (!properties || properties.length === 0) {
      throw new ErrorHandler('Property not found', 404);
    }

    const propertiesWithOwner = await Promise.all(
      properties.map(async (property) => {
        const user = await userRepo.findOne({ where: { id: property.userId },select:["fullName"] });
        return {
          ...property,
          ownerName: user ? user.fullName : 'Unknown',
        };
      })
    );

     const propertiesImages= await Promise.all(
       properties.map(async (property) => {
         
         return {
           ...property,
           propertiesImages: property.propertyImageKeys?.imageKey ?  await generatePresignedUrl(property.propertyImageKeys?.imageKey ) :null,
         };
       })
     );

    return res.status(200).json({
      message: 'Property retrieved successfully',
      property: [propertiesWithOwner,propertiesImages]
    });
  } catch (error) {
    console.error(error);
    throw new ErrorHandler('Server error', 500);
  }
};

//offering Property

export const offeringProperty = async (req: Request, res: Response) => {
  const { filter } = req.body;
  if (!filter) {
    return res.status(400).json({
      message: 'filter required',
    });
  }
  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    const existingProperties = await propertyRepo.find({
      where: { subCategory: filter },
      relations: ['address', 'propertyImageKeys'],
    });

    if (!existingProperties) {
      return res.status(400).json({
        message: 'filter not found',
      });
    }

    return res.status(201).json({
      message: 'Property offered successfully',
      property: existingProperties,
    });
  } catch (error) {
    throw new ErrorHandler('server error', 500);
  }
};
