import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { PropertyImages } from '@/api/entity/PropertyImages';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity/UserAuth';
import { generatePresignedUrl } from '@/api/controllers/s3/awsControllers';
import { Address } from '@/api/entity/Address';
import { In, Between, Not, ILike } from 'typeorm';
import { UserKyc } from '@/api/entity/userkyc';
import { authenticate } from '@/api/middlewares/auth/Authenticate';
import { PropertyEnquiry } from '@/api/entity/PropertyEnquiry';
import { Connections } from '@/api/entity/Connection';
import { RepublishProperty } from '@/api/entity/RepublishProperties';
import { sendEmailNotification } from '@/common/utils/mailService';

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
  enquiries?: {
    viewProperty: number;
    calling: number;
  };
  ownerDetails?: {
    name: string | null;
    email: string | null;
    mobileNumber: string | null;
  };
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
    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const userRepo = AppDataSource.getRepository(UserAuth);
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
        
        // Get property enquiries for this property
        const propertyEnquiries = await propertyEnquiryRepo.find({
          where: { propertyId: property.id },
          order: { createdAt: 'DESC' }
        });

        const propertyOwner = await userRepo.findOne({
          where: { id: property.userId },
          select: ['fullName', 'email', 'mobileNumber']
        });

        return {
          ...propertyResponse,
          enquiries: {
            viewProperty: propertyEnquiries.length,
            calling: propertyEnquiries.filter(enquiry => enquiry.calling).length,
          },
          ownerDetails: {
            name: propertyOwner?.fullName || null,
            email: propertyOwner?.email || null,
            mobileNumber: propertyOwner?.mobileNumber || null,
          }
        };
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
    const { propertyId, userId, republishId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const propertyRepublishRepo = AppDataSource.getRepository(RepublishProperty);
    const userRepo = AppDataSource.getRepository(UserAuth);
    
    let property: Property;
    let republishProperty: RepublishProperty | null = null;
    
    if (republishId) {
      republishProperty = await propertyRepublishRepo.findOne({
        where: { id: republishId },
        relations: ['address', 'propertyImages'],
      });
      if (!republishProperty) {
        return res.status(404).json({ message: 'Republished property not found' });
      }
      // Get the original property for republished properties
      const originalProperty = await propertyRepo.findOne({
        where: { id: republishProperty.propertyId },
        relations: ['address', 'propertyImages'],
      });
      if (!originalProperty) {
        return res.status(404).json({ message: 'Original property not found' });
      }
      property = originalProperty;
    } else {
      const foundProperty = await propertyRepo.findOne({
        where: { id: propertyId },
        relations: ['address', 'propertyImages'],
      });
      if (!foundProperty) {
        return res.status(404).json({ message: 'Property not found' });
      }
      property = foundProperty;
    }

    let user;
    if (republishId) {
      user = await userRepo.findOne({
        where: { id: republishProperty?.ownerId },
        select: ['fullName', 'mobileNumber', 'email', 'userProfileKey', "userType"],
      });
    } else {
      user = await userRepo.findOne({
        where: { id: property.userId },
        select: ['fullName', 'mobileNumber', 'email', 'userProfileKey', "userType"],
      });
    }

    const userKycRepo = AppDataSource.getRepository(UserKyc);
    let userKyc;
    if (republishId) {
      userKyc = await userKycRepo.findOne({
        where: { userId: republishProperty?.ownerId },
      });
    } else {
      userKyc = await userKycRepo.findOne({
        where: { userId: property.userId },
      });
    }

    // Get connection status if userId is provided
    let connectionStatus = null;
    if (republishId) {
      connectionStatus = republishProperty?.status;
    } else {
      if (userId) {
        if (userId === property.userId) {
          connectionStatus = "";
        } else {
          const connectionRepo = AppDataSource.getRepository(Connections);
          const connection = await connectionRepo.findOne({
            where: [
              { requesterId: userId, receiverId: property.userId },
              { requesterId: property.userId, receiverId: userId }
            ]
          });
          connectionStatus = connection ? connection.status : null;
        }
      }
    }

    // Handle user profile image
    let userProfileImage = "https://randomuser.me/api/portraits/men/1.jpg";
    if (user?.userProfileKey) {
      try {
        const presignedUrl = await generatePresignedUrl(user.userProfileKey);
        if (presignedUrl && presignedUrl.startsWith('http')) {
          userProfileImage = presignedUrl;
        }
      } catch (error) {
        console.error('Error generating presigned URL:', error);
      }
    }

    const propertyResponse = await mapPropertyResponse(property);
    return res.status(200).json({
      message: 'Property retrieved successfully',
      property: propertyResponse,
      owner: {
        fullName: user?.fullName,
        mobileNumber: user?.mobileNumber,
        email: user?.email,
        userProfile: userProfileImage,
        userType: user?.userType,
      },
      rera: userKyc?.rera,
      connectionStatus
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getAllProperties = async (req: Request, res: Response) => {
  try {
    const {userType} = req.body
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

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

    // Filter properties based on userType and WorkingWithAgent
    const filteredProperties = await Promise.all(
      properties.map(async (property) => {
        const propertyOwner = await userRepo.findOne({
          where: { id: property.userId },
          select: ['userType', 'WorkingWithAgent']
        });

        // If requesting user is an agent and property owner is an owner who doesn't work with agents
        if (userType === 'Agent' && 
            propertyOwner?.userType === 'Owner' && 
            propertyOwner?.WorkingWithAgent === false) {
          return null;
        }
        return property;
      })
    );

    // Remove null values from filtered properties
    const validProperties = filteredProperties.filter(property => property !== null);

    const propertiesWithUrls = await Promise.all(
      validProperties.map(async (property) => {
        const propertyResponse = await mapPropertyResponse(property);
        return propertyResponse;
      })
    );

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      properties: propertiesWithUrls,
      totalCount: validProperties.length,
      currentPage: Number(page),
      totalPages: Math.ceil(validProperties.length / Number(limit)),
      hasMore: skip + validProperties.length < totalCount
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
    sort = 'newest',
    userType
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

    // Filter properties based on userType and WorkingWithAgent
    const filteredProperties = await Promise.all(
      properties.map(async (property) => {
        const propertyOwner = await userRepo.findOne({
          where: { id: property.userId },
          select: ['userType', 'WorkingWithAgent']
        });

        // If requesting user is an agent and property owner is an owner who doesn't work with agents
        if (userType === 'Agent' && 
            propertyOwner?.userType === 'Owner' && 
            propertyOwner?.WorkingWithAgent === false) {
          return null;
        }
        return property;
      })
    );

    // Remove null values from filtered properties
    const validProperties = filteredProperties.filter(property => property !== null);

    // Add owner information to properties
    const propertiesWithOwner = await Promise.all(
      validProperties.map(async (property) => {
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
    const inventoryValue = validProperties.reduce((total, property) => {
      return total + (property.propertyPrice || 0);
    }, 0);

    return res.status(200).json({
      message: 'Properties retrieved successfully',
      property: propertiesWithOwner,
      inventoryValue: inventoryValue.toString(),
      totalCount: validProperties.length,
      currentPage: page,
      totalPages: Math.ceil(validProperties.length / limit),
      hasMore: skip + validProperties.length < totalCount
    }); 
  } catch (error) {
    console.error('Error in searchProperty:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const trendingProperty = async (req: Request, res: Response) => {
  try {
    const { subCategory, userType, city, state } = req.body;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!subCategory) {
      return res.status(400).json({ message: 'subCategory is required' });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);
    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const republishPropertyRepo = AppDataSource.getRepository(RepublishProperty);

    // Build where clause for property
    const whereClause: any = {
      subCategory: ILike(`%${subCategory}%`)
    };

    // Add address filters if provided
    if (city || state) {
      whereClause.address = {};
      if (city) whereClause.address.city = ILike(`%${city}%`);
      if (state) whereClause.address.state = ILike(`%${state}%`);
    }

    // Get all properties with debug info
    const properties = await propertyRepo.find({
      where: whereClause,
      relations: ['address', 'propertyImages'],
      order: {
        createdAt: 'DESC'
      }
    });

    // Get republished properties
    const republishedProperties = await republishPropertyRepo.find({
      where: {
        status: 'Accepted'
      }
    });

    // Get property enquiries
    const propertyEnquiries = await propertyEnquiryRepo.find({
      where: {
        propertyId: In(properties.map(p => p.id))
      }
    });

    // Count enquiries
    const enquiryCounts = propertyEnquiries.reduce((acc, enquiry) => {
      acc[enquiry.propertyId] = (acc[enquiry.propertyId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get unique property IDs from both regular and republished properties
    const allPropertyIds = new Set([
      ...properties.map(p => p.id),
      ...republishedProperties.map(rp => rp.propertyId)
    ]);

    // Get all properties with their details
    const allProperties = await propertyRepo.find({
      where: {
        id: In(Array.from(allPropertyIds))
      },
      relations: ['address', 'propertyImages']
    });

    // Sort properties by enquiry count
    const sortedProperties = allProperties.sort((a, b) => 
      (enquiryCounts[b.id] || 0) - (enquiryCounts[a.id] || 0)
    );

    if (!sortedProperties.length) {
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

    // Filter properties based on userType and WorkingWithAgent
    const filteredProperties = await Promise.all(
      sortedProperties.map(async (property) => {
        const propertyOwner = await userRepo.findOne({
          where: { id: property.userId },
          select: ['userType', 'WorkingWithAgent']
        });

        // If requesting user is an agent and property owner is an owner who doesn't work with agents
        if (userType === 'Agent' && 
            propertyOwner?.userType === 'Owner' && 
            propertyOwner?.WorkingWithAgent === false) {
          return null;
        }
        return property;
      })
    );

    // Remove null values from filtered properties
    const validProperties = filteredProperties.filter(property => property !== null);

    // Get user details for all properties
    const userIds = [...new Set(validProperties.map((p) => p.userId))];
    const users = userIds.length > 0
      ? await userRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'fullName', 'userType', 'userProfileKey', 'mobileNumber']
        })
      : [];

    const userMap = new Map(users.map((user) => [user.id, user]));

    // Map properties with details
    const propertiesWithDetails = await Promise.all(
      validProperties.map(async (property) => {
        const propertyResponse = await mapPropertyResponse(property);
        const user = userMap.get(property.userId);
        const republishInfo = republishedProperties.find(rp => rp.propertyId === property.id);

        return {
          ...propertyResponse,
          ownerDetails: {
            name: user?.fullName || 'Unknown',
            userType: user?.userType,
            userProfileKey: user?.userProfileKey,
            mobileNumber: user?.mobileNumber
          },
          isRepublished: !!republishInfo,
          republishDetails: republishInfo ? {
            republishId: republishInfo.id,
            republisherId: republishInfo.republisherId,
            status: republishInfo.status,
            republishedAt: republishInfo.createdAt
          } : null
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Properties retrieved successfully',
      properties: propertiesWithDetails,
      totalCount: sortedProperties.length,
      currentPage: Number(page),
      totalPages: Math.ceil(sortedProperties.length / Number(limit)),
      hasMore: skip + validProperties.length < sortedProperties.length
    });
  } catch (error) {
    console.error('Error in trendingProperty:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

//offering Property controller
export const offeringProperty = async (req: Request, res: Response) => {
  try {
    const { filter, userType, city, state } = req.body;
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

    // Add address filters if provided
    if (city || state) {
      whereClause.address = {};
      if (city) whereClause.address.city = ILike(`%${city}%`);
      if (state) whereClause.address.state = ILike(`%${state}%`);
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

    // Filter properties based on userType and WorkingWithAgent
    const filteredProperties = await Promise.all(
      properties.map(async (property) => {
        const propertyOwner = await userRepo.findOne({
          where: { id: property.userId },
          select: ['userType', 'WorkingWithAgent']
        });

        // If requesting user is an agent and property owner is an owner who doesn't work with agents
        if (userType === 'Agent' && 
            propertyOwner?.userType === 'Owner' && 
            propertyOwner?.WorkingWithAgent === false) {
          return null;
        }
        return property;
      })
    );

    // Remove null values from filtered properties
    const validProperties = filteredProperties.filter(property => property !== null);

    // Map properties with presigned URLs
    const propertiesWithUrls = await Promise.all(
      validProperties.map(async (property) => {
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
    const validPropertiesWithUrls = propertiesWithUrls.filter(property => property !== null);

    // Get owner information for each property
    const propertiesWithOwner = await Promise.all(
      validPropertiesWithUrls.map(async (property) => {
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
        totalCount: validPropertiesWithUrls.length,
        currentPage: Number(page),
        totalPages: Math.ceil(validPropertiesWithUrls.length / Number(limit)),
        hasMore: skip + validPropertiesWithUrls.length < totalCount
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

// delete property 
export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const { propertyId, userId } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required',
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);
    const propertyImagesRepo = AppDataSource.getRepository(PropertyImages);
    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);

    // Get the property with relations
    const property = await propertyRepo.findOne({
      where: { id: propertyId },
      relations: ['propertyImages', 'address']
    });

    const user = await userRepo.findOne({
      where: { id: userId },
    });
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check authorization
    if (!user.isAdmin && property.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Start a transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete related records first
      if (property.propertyImages && property.propertyImages.length > 0) {
        await propertyImagesRepo.remove(property.propertyImages);
      }

      // Delete property enquiries
      await propertyEnquiryRepo.delete({ propertyId: property.id });

      // Delete the property
      await propertyRepo.remove(property);

      // Commit the transaction
      await queryRunner.commitTransaction();

      return res.status(200).json({
        success: true,
        message: user.isAdmin ? 'Property deleted by admin successfully' : 'Property deleted successfully',
      });
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error in deleteProperty:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};  

// update isSold to true or false
export const updateIsSold = async (req: Request, res: Response) => {
  try {
    const { propertyId, isSold, userId } = req.body;

    // Validate required fields
    if (!propertyId || userId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and User ID are required',
      });
    }

    // Validate isSold is a boolean
    if (typeof isSold !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isSold must be a boolean value',
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Get the property
    const property = await propertyRepo.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Get the user
    const user = await userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check authorization
    if (!user.isAdmin && property.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this property',
      });
    }

    // Update the property
    property.isSold = isSold;
    await propertyRepo.save(property);

    return res.status(200).json({
      success: true,
      message: 'Property status updated successfully',
      property: {
        id: property.id,
        isSold: property.isSold
      }
    });
  } catch (error) {
    console.error('Error in updateIsSold:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


// update property status
export const updatePropertyStatus = async (req: Request, res: Response) => {
  try {
    const { propertyId, isActive, userId } = req.body;

    if (!propertyId || userId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and User ID are required',
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Get the property
    const property = await propertyRepo.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Get the user
    const user = await userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user owns the property
    if (property.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this property',
      });
    }

    // TODO: If trying to activate, check the limit based on user type. it's already in frontend
    // if (isActive) {
    //   const maxActiveProperties = user.userType === 'Agent' ? 5 : 1;
    //   const activePropertiesCount = await propertyRepo.count({
    //     where: { 
    //       userId: userId,
    //       isActive: true,
    //       id: Not(propertyId) // Exclude current property
    //     }
    //   });

    //   if (activePropertiesCount >= maxActiveProperties) {
    //     return res.status(400).json({
    //       success: false,
    //       message: `You can only have ${maxActiveProperties} active propert${maxActiveProperties > 1 ? 'ies' : 'y'} at a time`,
    //     });
    //   }
    // }

    // Update the property status
    property.isActive = isActive;
    await propertyRepo.save(property);

    return res.status(200).json({
      success: true,
      message: `Property ${isActive ? 'activated' : 'deactivated'} successfully`,
      property: {
        id: property.id,
        isActive: property.isActive
      }
    });
  } catch (error) {
    console.error('Error in updatePropertyStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// get property leands
export const getPropertyLeands = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.body;

    const propertyRepo = AppDataSource.getRepository(Property);
    const propertyEnquiriesRepo = AppDataSource.getRepository(PropertyEnquiry);
    const userRepo = AppDataSource.getRepository(UserAuth);
    const property = await propertyRepo.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }
    const propertyEnquiries = await propertyEnquiriesRepo.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
    });

    // Fetch user details for each enquiry
    const userIds = propertyEnquiries.map(e => e.userId);
    const users = userIds.length > 0
      ? await userRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'fullName', 'userType', 'userProfileKey', 'mobileNumber']
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const leads = propertyEnquiries.map(enquiry => {
      const user = userMap.get(enquiry.userId);
      return {
        enquiryId: enquiry.id,
        createdAt: enquiry.createdAt,
        userId: enquiry.userId,
        fullName: user?.fullName || 'Unknown',
        userType: user?.userType || 'User',
        userProfileImage: user?.userProfileKey  ? generatePresignedUrl(user?.userProfileKey) : "https://randomuser.me/api/portraits/men/1.jpg",
        mobileNumber: user?.mobileNumber || null,
      };
    });

    return res.status(200).json({
      success: true,
      leads,
      total: leads.length,
    });
  } catch (error) {
    console.error('Error in getPropertyLeands:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


//  share property email notification
export const sharePropertyEmailNotification = async (req: Request, res: Response) => {
  try {
    const { propertyId, userId } = req.body;

    if (!propertyId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and User ID are required',
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Get property with relations
    const property = await propertyRepo.findOne({
      where: { id: propertyId },
      relations: ['address', 'propertyImages'],
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Get user who is sharing
    const user = await userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get property owner
    const propertyOwner = await userRepo.findOne({
      where: { id: property.userId },
    });

    if (!propertyOwner || !propertyOwner.email) {
      return res.status(404).json({
        success: false,
        message: 'Property owner not found or email not available',
      });
    }

    // Get property image URL
    let propertyImageUrl = '';
    if (property.propertyImages && property.propertyImages.length > 0) {
      const firstImage = property.propertyImages[0];
      if (firstImage.presignedUrl) {
        propertyImageUrl = firstImage.presignedUrl;
      } else if (firstImage.imageKey) {
        propertyImageUrl = await generatePresignedUrl(firstImage.imageKey);
      }
    }

    const email = propertyOwner.email;
    const subject = `NextDeal : ${user.fullName} sharing your property ${property.propertyName || property.projectName}`;
    const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
      <div style="background-color: #001A48; padding: 20px; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Property Details</h1>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="color: #666666; font-size: 16px; line-height: 1.5;">Dear ${propertyOwner.fullName},</p>
        <p style="color: #666666; font-size: 16px; line-height: 1.5;">We are pleased to share the following property details with you:</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #001A48; margin-top: 0; font-size: 20px;">${property.propertyName || property.projectName}</h2>
        
        <div style="margin: 15px 0; padding: 15px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e0e0e0;">
          <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0;">${property.description || 'No description available'}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin: 15px 0;">
          <div style="flex: 1;">
            <p style="color: #001A48; font-size: 18px; font-weight: bold; margin: 0;">₹${property.propertyPrice || 'Price not available'}</p>
          </div>
          <div style="flex: 1; text-align: right;">
            <p style="color: #666666; font-size: 15px; margin: 0;">${property.address?.locality || property.address?.city || 'Location not available'}</p>
          </div>
        </div>
      </div>

      ${propertyImageUrl ? `
      <div style="margin-bottom: 20px;">
        <img src="${propertyImageUrl}" alt="Property Image" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
      </div>
      ` : ''}

      <div style="text-align: center; margin: 25px 0;">
        <a href="https://nextdeal.in/property/${property.id}" style="display: inline-block; background-color: #001A48; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Property Details</a>
      </div>

      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 20px;">
        <p style="color: #666666; font-size: 14px; margin: 0;">Shared by: ${user.fullName}</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666666; font-size: 14px; margin: 0;">Best regards,</p>
        <p style="color: #001A48; font-size: 16px; font-weight: bold; margin: 5px 0 0 0;">NextDeal Team</p>
      </div>
    </div>
    `;

    await sendEmailNotification(email, subject, body);

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error in sharePropertyEmailNotification:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}