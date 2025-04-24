import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';

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
    let query = propertyRepo.createQueryBuilder('property')
      .leftJoinAndSelect('property.address', 'address')
      .leftJoinAndSelect('property.propertyImageKeys', 'propertyImageKeys');

    // Apply filters based on userType
    if (userType === 'admin') {
      // Admin can see all properties
      query = query.orderBy('property.createdAt', 'DESC');
    } else if (userType === 'agent') {
      // Agent can see their own properties and public properties
      query = query.where('property.userId = :userId OR property.isPublic = :isPublic', {
        userId,
        isPublic: true
      })
      .orderBy('property.createdAt', 'DESC');
    } else {
      // Regular users can only see their own properties
      query = query.where('property.userId = :userId', { userId })
        .orderBy('property.createdAt', 'DESC');
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

export const searchProperty = async (req: Request, res: Response, next: NextFunction) => {
  // Implementation for searching properties based on query parameters

try {
  const {category,subCategory, state,city } = req.body
  const propertyRepo = AppDataSource.getRepository(Property)
   const property = await propertyRepo.findOne({
      where: { category,subCategory },
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