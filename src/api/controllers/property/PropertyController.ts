import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { PropertyImages } from '@/api/entity/PropertyImages';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity/UserAuth';
import { generatePresignedUrl } from '@/api/controllers/s3/awsControllers';
import { Address } from '@/api/entity/Address';
import { In, Between, Not } from 'typeorm';
import { UserKyc } from '@/api/entity/userkyc';
import { authenticate } from '@/api/middlewares/auth/Authenticate';

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
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    
    // Get total count
    const totalCount = await propertyRepo.count({
      where: { userId }
    });

    const properties = await propertyRepo.find({
      where: { userId },
      relations: ['address', 'propertyImages'],
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: Number(limit)
    });

    if (!properties || properties.length === 0) {
      return res.status(200).json({ 
        message: 'No properties found for this user',
        properties: [],
        totalCount: 0,
        currentPage: Number(page),
        totalPages: 0,
        hasMore: false
      });
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
      totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      hasMore: skip + properties.length < totalCount
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId , userId } = req.body;

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

    const userRepo = AppDataSource.getRepository(UserAuth);
    const user = await userRepo.findOne({
      where: { id: property.userId },
      select: ['fullName', 'mobileNumber', 'email', 'userProfileKey', "userType"],
    });

    const userKycRepo = AppDataSource.getRepository(UserKyc)
    const userKyc = await userKycRepo.findOne({
      where: { userId: property.userId },
    });

    const propertyResponse = await mapPropertyResponse(property);
    return res.status(200).json({
      message: 'Property retrieved successfully',
      property: propertyResponse,
      owner: user,
      rera: userKyc?.rera,
      connectionStatues: "Pending"

    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getAllProperties = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = (req.user as RequestUser)?.id;
    const userType = (req.user as RequestUser)?.userType;

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);
    
    // Get total count
    const totalCount = await propertyRepo.count();

    // Get properties with pagination
    const properties = await propertyRepo.find({
      relations: ['address', 'propertyImages', 'user'],
      skip,
      take: Number(limit),
      order: {
        createdAt: 'DESC'
      }
    });

    if (!properties || properties.length === 0) {
      return res.status(200).json({ 
        message: 'No properties found',
        properties: [],
        totalCount: 0,
        currentPage: Number(page),
        totalPages: 0,
        hasMore: false
      });
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
      totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      hasMore: skip + properties.length < totalCount
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
    const { subCategory } = req.body;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!subCategory) {
      return res.status(400).json({ message: 'subCategory is required' });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Get total count
    const totalCount = await propertyRepo.count({
      where: { subCategory }
    });

    // Get properties with pagination
    const properties = await propertyRepo.find({
      where: { subCategory },
      relations: ['address', 'propertyImages'],
      skip,
      take: Number(limit),
      order: {
        createdAt: 'DESC'
      }
    });

    if (!properties.length) {
      return res.status(200).json({
        success: true,
        message: 'No properties found',
        properties: [],
        totalCount: 0,
        currentPage: Number(page),
        totalPages: 0,
        hasMore: false
      });
    }

    const userIds = [...new Set(properties.map((p) => p.userId))];
    const users = await userRepo.find({
      where: { id: In(userIds) },
      select: { id: true, fullName: true }
    });

    const userMap = new Map(users.map((user) => [user.id, user.fullName]));

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
      totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      hasMore: skip + properties.length < totalCount
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

//offering Property controller
export const offeringProperty = async (req: Request, res: Response) => {
  try {
    const { filter } = req.body;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!filter) {
      return res.status(400).json({
        success: false,
        message: 'filter required',
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);
    
    // Build where clause
    let whereClause: any = {};
    if (filter !== 'All') {
      whereClause.subCategory = filter;
    }
    
    // Get total count
    const totalCount = await propertyRepo.count({
      where: whereClause
    });

    // Get properties with pagination
    const properties = await propertyRepo.find({
      where: whereClause,
      relations: ['address', 'propertyImages'],
      skip,
      take: Number(limit),
      order: {
        createdAt: 'DESC'
      }
    });

    if (!properties || properties.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No properties found',
        data: {
          property: [],
          totalCount: 0,
          currentPage: Number(page),
          totalPages: 0,
          hasMore: false
        }
      });
    }

    // Map properties with presigned URLs
    const propertiesWithUrls = await Promise.all(
      properties.map(async (property) => {
        try {
          const propertyResponse = await mapPropertyResponse(property);
          return propertyResponse;
        } catch (error) {
          console.error('Error mapping property:', error);
          return null;
        }
      })
    );

    // Filter out any null values from failed mappings
    const validProperties = propertiesWithUrls.filter(property => property !== null);

    // Get owner information for each property
    const propertiesWithOwner = await Promise.all(
      validProperties.map(async (property) => {
        try {
          const user = await userRepo.findOne({
            where: { id: property.userId },
            select: ['fullName', 'userType'],
          });
          return {
            ...property,
            ownerName: user ? user.fullName : 'Unknown',
            ownerType: user ? user.userType : 'Unknown'
          };
        } catch (error) {
          console.error('Error getting owner info:', error);
          return {
            ...property,
            ownerName: 'Unknown',
            ownerType: 'Unknown'
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Properties fetched successfully',
      data: {
        property: propertiesWithOwner,
        totalCount,
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
        hasMore: skip + properties.length < totalCount
      }
    });
  } catch (error) {
    console.error('Error in offeringProperty:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
