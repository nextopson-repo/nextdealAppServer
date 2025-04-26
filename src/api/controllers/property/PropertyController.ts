import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity/UserAuth';
import { generatePresignedUrl } from '@/api/controllers/s3/awsControllers';
import { Address } from '@/api/entity/Address';
import { promise } from 'zod';
import { PropertyImage } from '@/api/entity/PropertyImages';

// Property creation/update request type
export interface PropertyRequest extends Request {
  body: {
    propertyId?: string;
    userId?: string;
    addressState?: string;
    addressCity?: string;
    addressLocality?: string;
    imageKeys?: string[];
    category: string;
    subCategory: string;
    projectName?: string;
    propertyName?: string;
    totalBathrooms?: number;
    totalRooms?: number;
    propertyPrice?: number;
    carpetArea?: number;
    buildupArea?: number;
    bhks?: number;
    furnishing?: string;
    constructionStatus?: string;
    propertyFacing?: string;
    ageOfTheProperty?: string;
    reraApproved?: boolean;
    amenities?: string[];
    width?: number;
    height?: number;
    totalArea?: number;
    plotArea?: number;
    viewFromProperty?: string;
    landArea?: number;
    unit?: string;
  };
  user?: {
    id: string;
    userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
    email: string;
    mobileNumber: string;
    isAdmin?: boolean;
  }
}

// Interface for property image with presigned URL
interface PropertyImageWithUrl {
  imageKey: string;
  presignedUrl: string;
}

// Type for property response with images that have presigned URLs
type PropertyResponseType = {
  id: string;
  userId: string;
  address: Address;
  category: string;
  subCategory: string;
  projectName: string | null;
  propertyName: string | null;
  isSale: boolean | null;
  totalBathrooms: number | null;
  totalRooms: number | null;
  propertyPrice: number;
  carpetArea: number | null;
  buildupArea: number | null;
  bhks: number | null;
  furnishing: string | null;
  constructionStatus: string | null;
  propertyFacing: string | null;
  ageOfTheProperty: string | null;
  reraApproved: boolean | null;
  amenities: string[] | null;
  width: number | null;
  height: number | null;
  totalArea: number | null;
  plotArea: number | null;
  viewFromProperty: string | null;
  landArea: number | null;
  unit: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  imagekeys: string[];
  propertyImages: PropertyImageWithUrl[];
}

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
    const propertyRepo = AppDataSource.getRepository(Property);
    
    // Get all properties with their relations
    const properties = await propertyRepo.find({
      relations: ['address'],
    });

    if (!properties || properties.length === 0) {
      throw new ErrorHandler('No properties found', 404);
    }

    // Process each property to add presigned URLs to images
    const propertiesWithUrls = await Promise.all(
      properties.map(async (property) => {
        const propertyResponse: PropertyResponseType = {
          ...property,
          propertyImages: []
        };

        if (property.imagekeys && property.imagekeys.length > 0) {
          // Create a new array to store the updated image objects
          const updatedImages = await Promise.all(
            property.imagekeys.map(async (imageKey): Promise<PropertyImageWithUrl> => {
              try {
                const presignedUrl = await generatePresignedUrl(imageKey);
                return {
                  imageKey,
                  presignedUrl
                };
              } catch (error) {
                console.error(`Error generating presigned URL for key ${imageKey}:`, error);
                return {
                  imageKey,
                  presignedUrl: ''
                };
              }
            })
          );
          
          propertyResponse.propertyImages = updatedImages;
        }
        
        return propertyResponse;
      })
    );

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      properties: propertiesWithUrls,
      count: propertiesWithUrls.length,
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
    const userRepo = AppDataSource.getRepository(UserAuth);
    const properties = await propertyRepo.find({
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
    if (!properties || properties.length === 0){
      throw new ErrorHandler('Property not found', 404);
    }

    // Add owner information to properties
    const propertiesWithOwner = await Promise.all(
      properties.map(async (property) => {
        const user = await userRepo.findOne({ where: { id: property.userId }, select: ['fullName'] });
        return {
          ...property,
          ownerName: user ? user.fullName : 'Unknown',
        };
      })
    );

    // Add presigned URLs to property images
    const propertiesWithImages = await Promise.all(
      propertiesWithOwner.map(async (property) => {
        const propertyResponse: PropertyResponseType & { ownerName: string } = {
          ...property,
          propertyImages: []
        };

        if (property.imagekeys && property.imagekeys.length > 0) {
          const propertyImages = await Promise.all(
            property.imagekeys.map(async (imageKey): Promise<PropertyImageWithUrl> => {
              try {
                const presignedUrl = await generatePresignedUrl(imageKey);
                return {
                  imageKey,
                  presignedUrl
                };
              } catch (error) {
                console.error(`Error generating presigned URL for key ${imageKey}:`, error);
                return {
                  imageKey,
                  presignedUrl: ''
                };
              }
            })
          );

          propertyResponse.propertyImages = propertyImages;
        }
        
        return propertyResponse;
      })
    );

    return res.status(200).json({
      message: 'Property retrieved successfully',
      property: propertiesWithImages
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
      relations: ['address'],
    });

    if (!properties || properties.length === 0) {
      throw new ErrorHandler('Property not found', 404);
    }

    const propertiesWithOwner = await Promise.all(
      properties.map(async (property) => {
        const user = await userRepo.findOne({ where: { id: property.userId }, select: ["fullName"] });
        return {
          ...property,
          ownerName: user ? user.fullName : 'Unknown',
        };
      })
    );

    const propertiesWithImages = await Promise.all(
      propertiesWithOwner.map(async (property) => {
        const propertyResponse: PropertyResponseType & { ownerName: string } = {
          ...property,
          propertyImages: []
        };

        if (property.imagekeys && property.imagekeys.length > 0) {
          const propertyImages = await Promise.all(
            property.imagekeys.map(async (imageKey): Promise<PropertyImageWithUrl> => {
              try {
                const presignedUrl = await generatePresignedUrl(imageKey);
                return {
                  imageKey,
                  presignedUrl
                };
              } catch (error) {
                console.error(`Error generating presigned URL for key ${imageKey}:`, error);
                return {
                  imageKey,
                  presignedUrl: ''
                };
              }
            })
          );

          propertyResponse.propertyImages = propertyImages;
        }
        
        return propertyResponse;
      })
    );

    return res.status(200).json({
      message: 'Property retrieved successfully',
      property: propertiesWithImages
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
