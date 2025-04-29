import { Request, Response, NextFunction, response } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity/UserAuth';
import { generatePresignedUrl } from '@/api/controllers/s3/awsControllers';
import { Address } from '@/api/entity/Address';
import { In } from 'typeorm';

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
  };
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
  viewFromProperty: string | string[] | null;
  landArea: number | null;
  unit: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  imagekeys: string[];
  propertyImages: PropertyImageWithUrl[];
};

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
      relations: ['address'],
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
          propertyImages:
            property.imagekeys?.length > 0
              ? await Promise.all(
                  property.imagekeys.map(async (key) => ({
                    imageKey: key,
                    presignedUrl: await generatePresignedUrl(key),
                  }))
                )
              : [],
        };

        return propertyResponse;
      })
    );

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      properties: propertiesWithUrls,
      count: propertiesWithUrls.length,
    });
  } catch (error) {
    throw new ErrorHandler('Server error', 500);
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
      relations: ['address'],
    });
    if (!properties || properties.length === 0) {
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
        // Define the type for propertyResponse
        const propertyResponse: PropertyResponseType & { ownerName: string } = {
          ...property,
          propertyImages: [],
        };

        if (property.imagekeys && property.imagekeys.length > 0) {
          // Process all image keys in parallel
          const imageUrls = await Promise.all(
            property.imagekeys.map(async (imageKey) => {
              try {
                const presignedUrl = await generatePresignedUrl(imageKey);
                return {
                  imageKey,
                  presignedUrl,
                };
              } catch (error) {
                console.error(`Error generating presigned URL for key ${imageKey}:`, error);
                return {
                  imageKey,
                  presignedUrl: '',
                };
              }
            })
          );

          propertyResponse.propertyImages = imageUrls;
        }

        return propertyResponse;
      })
    );

    return res.status(200).json({
      message: 'Property retrieved successfully',
      property: propertiesWithImages,
    });
  } catch (error) {
    throw new ErrorHandler('server error', 500);
  }
};

export const trendingProperty = async (req: Request, res: Response) => {
  try {
    const { category, subCategory } = req.body;

    if (!category || !subCategory) {
      throw new ErrorHandler('Category and subCategory are required', 400);
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Get properties with their addresses using find
    const properties = await propertyRepo.find({
      where: {
        category,
        subCategory,
      },
      relations: ['address'],
    });

    if (!properties.length) {
      return res.status(200).json({
        success: true,
        message: 'No properties found',
        properties: [],
      });
    }

    // Get all unique user IDs
    const userIds = [...new Set(properties.map((p) => p.userId))];

    // Fetch all users using find
    const users = await userRepo.find({
      where: {
        id: In(userIds),
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    // Create a map of user IDs to names for quick lookup
    const userMap = new Map(users.map((user) => [user.id, user.fullName]));

    // Process properties and generate image URLs in parallel
    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        const propertyResponse = {
          ...property,
          ownerName: userMap.get(property.userId) || 'Unknown',
          propertyImagesUrl: property.imagekeys?.length > 0 ? await generatePresignedUrl(property.imagekeys[0]) : null,
        };

        return propertyResponse;
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Properties retrieved successfully',
      properties: propertiesWithDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error,
    });
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
    const userRepo = AppDataSource.getRepository(UserAuth);
    const existingProperties = await propertyRepo.find({
      where: { subCategory: filter },
      relations: ['address'],
    });

    if (!existingProperties) {
      return res.status(400).json({
        message: 'filter not found',
      });
    }

    const propertiesWithUrls = await Promise.all(
      existingProperties.map(async (property) => {
        const propertyResponse: PropertyResponseType = {
          ...property,
          propertyImages: property.imagekeys?.length
            ? await Promise.all(
                property.imagekeys.map(async (key) => ({
                  imageKey: key,
                  presignedUrl: await generatePresignedUrl(key),
                }))
              )
            : [],
        };
        return propertyResponse;
      })
    );

    // Add owner information to properties
    const propertiesWithOwner = await Promise.all(
      propertiesWithUrls.map(async (property) => {
        const user = await userRepo.findOne({
          where: { id: property.userId },
          select: ['fullName'],
        });
        return {
          ...property,
          ownerName: user ? user.fullName : 'Unknown',
        };
      })
    );

    return res.status(200).json({
      message: 'Property offered successfully',
      property: propertiesWithOwner,
    });
  } catch (error) {
    throw new ErrorHandler('server error', 500);
  }
};
