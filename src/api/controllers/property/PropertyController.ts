import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { PropertyImages } from '@/api/entity/PropertyImages';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity/UserAuth';
import { generatePresignedUrl } from '@/api/controllers/s3/awsControllers';
import { Address } from '@/api/entity/Address';
import { In, Between } from 'typeorm';

// Custom type for request user
type RequestUser = {
  id: string;
  userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
  email: string;
  mobileNumber: string;
  isAdmin?: boolean;
};

// Property creation/update request type
export interface PropertyRequest extends Omit<Request, 'user'> {
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
    isSale?: boolean;
    totalBathrooms?: number;
    totalRooms?: number;
    propertyPrice?: number;
    isSold?: boolean;
    conversion?: string[];
    carpetArea?: number;
    buildupArea?: number;
    bhks?: number;
    furnishing?: string;
    addFurnishing?: string[];
    constructionStatus?: string;
    propertyFacing?: string;
    ageOfTheProperty?: string;
    reraApproved?: boolean;
    amenities?: string[];
  };
  user?: RequestUser;
}

// Interface for property image with presigned URL
interface PropertyImageWithUrl {
  id: string;
  imageKey: string;
  presignedUrl: string;
  imgClassifications: 'Bathroom' | 'Bedroom' | 'Dining' | 'Kitchen' | 'Livingroom';
  accurencyPercent: number;
}

// Type for property response with images that have presigned URLs
type PropertyResponseType = {
  id: string;
  userId: string;
  address: Address;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  projectName: string | null;
  propertyName: string | null;
  isSale: boolean | null;
  totalBathrooms: number | null;
  totalRooms: number | null;
  propertyPrice: number;
  isSold: boolean;
  conversion: string[] | null;
  carpetArea: number | null;
  buildupArea: number | null;
  bhks: number | null;
  furnishing: string | null;
  addFurnishing: string[] | null;
  constructionStatus: string | null;
  propertyFacing: string | null;
  ageOfTheProperty: string | null;
  reraApproved: boolean | null;
  amenities: string[] | null;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  propertyImages: PropertyImageWithUrl[];
};

// Helper to map PropertyImages to PropertyImageWithUrl (with presigned URLs)
async function mapPropertyImages(images: PropertyImages[]): Promise<PropertyImageWithUrl[]> {
  return Promise.all(
    (images || [])
      .filter(img => img.imageKey)
      .map(async (img) => ({
        id: img.id,
        imageKey: img.imageKey,
        presignedUrl: img.presignedUrl || await generatePresignedUrl(img.imageKey),
        imgClassifications: img.imgClassifications as PropertyImageWithUrl['imgClassifications'],
        accurencyPercent: img.accurencyPercent,
      }))
  );
}

// Consistent mapping for a single property
async function mapPropertyResponse(property: Property): Promise<PropertyResponseType> {
  const propertyImages = await mapPropertyImages(property.propertyImages || []);
  return {
    ...property,
    propertyImages,
  };
}

export const getUserProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const properties = await propertyRepo.find({
      where: { userId },
      relations: ['address', 'propertyImages'],
      order: {
        createdAt: 'DESC',
      },
    });

    if (!properties || properties.length === 0) {
      return res.status(404).json({ message: 'No properties found for this user' });
    }

    const propertiesWithUrls = await Promise.all(
      properties.map(async (property) => {
        const propertyResponse = await mapPropertyResponse(property);
        return propertyResponse;
      })
    );

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      properties: propertiesWithUrls,
      count: properties.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const property = await propertyRepo.findOne({
      where: { id: propertyId },
      relations: ['address', 'propertyImages'],
    });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const propertyResponse = await mapPropertyResponse(property);
    return res.status(200).json({
      message: 'Property retrieved successfully',
      property: propertyResponse,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getAllProperties = async (req: Request, res: Response) => {
  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    // Get all properties with their relations
    const properties = await propertyRepo.find({
      relations: ['address', 'propertyImages'],
    });
    if (!properties || properties.length === 0) {
      return res.status(404).json({ message: 'No properties found' });
    }
    // Process each property to add presigned URLs to images
    const propertiesWithUrls = await Promise.all(
      properties.map(async (property) => {
        const propertyResponse = await mapPropertyResponse(property);
        return propertyResponse;
      })
    );
    return res.status(200).json({
      message: 'Properties retrieved successfully',
      properties: propertiesWithUrls,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
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
  const { 
    subCategory = "All", 
    state, 
    city,
    isSale,
    furnishingType,
    bhkTypes,
    propertyTypes,
    priceRange,
    page = 1,
    limit = 5,
    sort = 'newest'
  } = req.body;

  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Build dynamic where clause
    
    const whereClause: any = {};

    // Only add subCategory filter if it's not "All"
    if (subCategory && subCategory !== 'All') {
      whereClause.subCategory = subCategory;
    }
    // Add filters only if they are provided
    if (isSale !== undefined) {
      whereClause.isSale = isSale;
    }

    if (furnishingType) {
      whereClause.furnishing = furnishingType;
    }

    if (bhkTypes && bhkTypes.length > 0) {
      whereClause.bhks = In(bhkTypes.map((bhk: string) => parseInt(bhk)));
    }

    if (propertyTypes && propertyTypes.length > 0) {
      whereClause.subCategory = In(propertyTypes);
    }

    if (priceRange) {
      whereClause.propertyPrice = Between(priceRange.min, priceRange.max);
    }

    // Add address filters if provided
    if (state || city) {
      whereClause.address = {};
      if (state) whereClause.address.state = state;
      if (city) whereClause.address.city = city;
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await propertyRepo.count({
      where: whereClause,
    });

    // Get properties with pagination and sorting
    const properties = await propertyRepo.find({
      where: whereClause,
      relations: ['address', 'propertyImages'],
      skip: skip,
      take: limit,
      order: {
        createdAt: sort === 'newest' ? 'DESC' : 'ASC'
      }
    });

    if (!properties || properties.length === 0) {
      return res.status(200).json({ 
        message: 'No properties found',
        property: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0
      });
    }

    // Add owner information to properties
    const propertiesWithOwner = await Promise.all(
      properties.map(async (property) => {
        const user = await userRepo.findOne({ 
          where: { id: property.userId }, 
          select: ['fullName', "mobileNumber",'email'] 
        });
        const propertyResponse = await mapPropertyResponse(property);
        return {
          ...propertyResponse,
         ...user
        };
      })
    );

    // Calculate total inventory value
    const inventoryValue = properties.reduce((total, property) => {
      return total + (property.propertyPrice || 0);
    }, 0);

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      property: propertiesWithOwner,
      inventoryValue: inventoryValue.toString(),
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + properties.length < totalCount
    });
  } catch (error) {
    console.error('Error in searchProperty:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const trendingProperty = async (req: Request, res: Response) => {
  try {
    const {  subCategory } = req.body;
    if (!subCategory) {
      return res.status(400).json({ message: 'subCategory is required' });
    }
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);
    // Get properties with their addresses using find
    const properties = await propertyRepo.find({
      where: {
        subCategory,
      },
      relations: ['address', 'propertyImages'],
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
        const propertyResponse = await mapPropertyResponse(property);
        return {
          ...propertyResponse,
          ownerName: userMap.get(property.userId) || 'Unknown',
        };
      })
    );
    return res.status(200).json({
      success: true,
      message: 'Properties retrieved successfully',
      properties: propertiesWithDetails,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

//offering Property controller
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
    const existingProperties = filter == 'All' ? await propertyRepo.find({
      relations: ['address', 'propertyImages'],
    }) : await propertyRepo.find({
      where: { subCategory: filter },
      relations: ['address', 'propertyImages'],
    });
    if (!existingProperties) {
      return res.status(400).json({
        message: 'filter not found',
      });
    }
    const propertiesWithUrls = await Promise.all(
      existingProperties.map(async (property) => {
        const propertyResponse = await mapPropertyResponse(property);
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
    return res.status(500).json({ message: 'Server error' });
  }
};
