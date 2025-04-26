import { PropertyImage } from '@/api/entity/PropertyImages';
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity/UserAuth';
import { generatePresignedUrl } from '@/api/controllers/s3/awsControllers';
// Interface for property image with presigned URL
interface PropertyImageWithUrl {
  id: string;
  imageKey: string;
  imageName: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  presignedUrl: string;
}

// Interface for property response with images that have presigned URLs
interface PropertyResponse {
  id: string;
  userId: string;
  address: any;
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
  propertyImageKeys: PropertyImageWithUrl[];
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
      relations: ['address', 'propertyImageKeys'],
    });

    if (!properties || properties.length === 0) {
      throw new ErrorHandler('No properties found', 404);
    }

    // Process each property to add presigned URLs to images
    const propertiesWithUrls = await Promise.all(
      properties.map(async (property) => {
        const propertyResponse: PropertyResponse = {
          ...property,
          propertyImageKeys: []
        };

        if (property.propertyImageKeys && property.propertyImageKeys.length > 0) {
          // Create a new array to store the updated image objects
          const updatedImages = await Promise.all(
            property.propertyImageKeys.map(async (image: PropertyImage) => {
              try {
                const presignedUrl = await generatePresignedUrl(image.imageKey);
                // Return a new object with the original image data plus the presigned URL
                return {
                  id: image.id,
                  imageKey: image.imageKey,
                  imageName: image.imageName,
                  createdBy: image.createdBy,
                  updatedBy: image.updatedBy,
                  createdAt: image.createdAt,
                  updatedAt: image.updatedAt,
                  presignedUrl
                } as PropertyImageWithUrl;
              } catch (error) {
                console.error(`Error generating presigned URL for key ${image.imageKey}:`, error);
                // Return the image without a presigned URL if generation fails
                return {
                  ...image,
                  presignedUrl: ''
                } as PropertyImageWithUrl;
              }
            })
          );
          
          // Update the property's image keys with the new objects that include presigned URLs
          propertyResponse.propertyImageKeys = updatedImages;
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
        const user = await userRepo.findOne({ where: { id: property.userId }, select: ["fullName"] });
        return {
          ...property,
          ownerName: user ? user.fullName : 'Unknown',
        };
      })
    );

    const propertiesWithImages = await Promise.all(
      propertiesWithOwner.map(async (property) => {
        const propertyImages = property.propertyImageKeys?.map(async (image) => {
          try {
            const presignedUrl = await generatePresignedUrl(image.imageKey);
            return {
              ...image,
              presignedUrl
            };
          } catch (error) {
            console.error(`Error generating presigned URL for key ${image.imageKey}:`, error);
            return {
              ...image,
              presignedUrl: ''
            };
          }
        }) || [];

        const resolvedImages = await Promise.all(propertyImages);
        
        return {
          ...property,
          propertyImages: resolvedImages
        };
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
