import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { RepublishProperty } from '@/api/entity/RepublishProperties';
import { Property } from '@/api/entity/Property';
import { PropertyImages } from '@/api/entity/PropertyImages';
import { UserAuth } from '@/api/entity/UserAuth';
import { ErrorHandler } from '@/api/middlewares/error';
import { PropertyEnquiry } from '@/api/entity/PropertyEnquiry';
import { generateNotification } from '../notification/NotificationController';


// Controller: Create Republisher
export const createRepublisher = async (req: Request, res: Response) => {
  const { userId:republisherId,  propertyId } = req.body;

  try {
    if (!republisherId  || !propertyId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: republisherId, propertyId',
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);
    const republisherRepo = AppDataSource.getRepository(RepublishProperty);

    // Check if property exists
    const property = await propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) {
      return res.status(400).json({
        success: false,
        message: 'Invalid propertyId — property does not exist',
      });
    }

    // Check if republisher exists
    const republisher = await userRepo.findOne({ where: { id: republisherId } });
    if (!republisher) {
      return res.status(400).json({
        success: false,
        message: 'Invalid republisherId — republisher does not exist',
      });
    }

    // Check if republish request already exists
    const existingRequest = await republisherRepo.findOne({
      where: { propertyId, republisherId }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'A republish request already exists for this property',
      });
    }

    const newRepublisher = republisherRepo.create({
      republisherId,
      ownerId: property.userId,
      propertyId,
      status: 'Pending'
    });

    const saved = await republisherRepo.save(newRepublisher);

    if (property && republisher) {
      generateNotification(
        property.userId,
        `Your property ${property.propertyName || property.projectName} has received a republish request from ${republisher.fullName}`,
        property.propertyImages?.[0]?.imageKey,
        'republish',
        republisher.fullName,
        'Approve',
        {
          title: property.title || property.propertyName || property.projectName || '',
          price: property.propertyPrice ? `₹${property.propertyPrice}` : '',
          location: property.address?.locality || '',
          image: property.propertyImages?.[0]?.imageKey || ''
        },
        'Pending'
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Republish request created successfully',
      republisher: saved,
    });
  } catch (error) {
    console.error('Error in createRepublisher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: errorMessage,
    });
  }
};

// get Republish Request list
export const republishRequest = async (req: Request, res: Response) => {
  const { ownerId, page = 1, limit = 10, status } = req.body;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'ownerId is required',
      });
    }

    const republisherRepo = AppDataSource.getRepository(RepublishProperty);
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    const [republishRequests, total] = await Promise.all([
      republisherRepo.find({
        where: { ownerId },
        skip,
        take: Number(limit),
        order: { createdAt: 'DESC' }
      }),
      republisherRepo.count({ where: { ownerId, status: status ? status : 'Pending' } })
    ]);

    if (!republishRequests.length) {
      return res.status(200).json({
        success: true,
        message: 'No republish requests found',
        requests: [],
        total: 0,
        currentPage: Number(page),
        totalPages: 0
      });
    }

    const requestsWithDetails = await Promise.all(republishRequests.map(async (republisher) => {
      const [requester, property] = await Promise.all([
        userRepo.findOne({ 
          where: { id: republisher.republisherId },
          select: ['id', 'fullName', 'email', 'mobileNumber']
        }),
        propertyRepo.findOne({
          where: { id: republisher.propertyId },
          relations: ['address', 'propertyImages']
        })
      ]);

      return {
        id: republisher.id,
        status: republisher.status,
        requester: {
          id: requester?.id,
          name: requester?.fullName,
          email: requester?.email,
          mobileNumber: requester?.mobileNumber,
          requestTimeStamp: republisher.createdAt,
          profileImage: requester?.userProfileKey || null
        },
        property: {
          id: property?.id,
          name: property?.propertyName || property?.projectName,
          price: property?.propertyPrice,
          location: property?.address?.locality,
          images: property?.propertyImages?.map(img => img.imageKey),
          isSale: property?.isSale,
          bhks: property?.bhks,
          carpetArea: property?.carpetArea,
          buildupArea: property?.buildupArea,
          address: property?.address,
          category: property?.category,
          subCategory: property?.subCategory,
        }
      };
    }));

    const totalPages = Math.ceil(total / Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Republish requests found',
      requests: requestsWithDetails,
      total,
      currentPage: Number(page),
      totalPages,
      hasMore: skip + republishRequests.length < total
    });
  } catch (error) {
    console.error('Error in republishRequest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, message: 'Server error', error: errorMessage });
  }
};


// Status Update
export const statusUpdate = async (req: Request, res: Response) => {
  const { propertyId, status, ownerId } = req.body;

  try {
    // Log incoming request for debugging
    console.log('Status update request:', { propertyId, status, ownerId });

    // Validate required fields
    if (!propertyId || !status || !ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: propertyId, status, and ownerId are required',
      });
    }

    // Validate status value
    if (!['Accepted', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: Accepted, Rejected, Pending',
      });
    }

    const republisherRepo = AppDataSource.getRepository(RepublishProperty);
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Check if owner exists
    const owner = await userRepo.findOne({ where: { id: ownerId } });
    if (!owner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Owner not found' 
      });
    }

    // First check if property exists
    const property = await propertyRepo.findOne({ 
      where: { id: propertyId }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }
    
    // Find the republish request with more detailed query
    const republisher = await republisherRepo.findOne({ 
      where: { 
        propertyId: propertyId,
        ownerId: ownerId,
        status: 'Pending' // Only update if status is Pending
      }
    });

    console.log('Found republish request:', republisher);

    if (!republisher) {
      return res.status(404).json({ 
        success: false, 
        message: 'No pending republish request found for this property and owner' 
      });
    }

    // Update status
    republisher.status = status;
    const updated = await republisherRepo.save(republisher);

    // Get updated property details with relations
    const updatedProperty = await propertyRepo.findOne({ 
      where: { id: updated.propertyId },
      relations: ['address', 'propertyImages']
    });

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status} successfully`,
      republisher: updated,
      property: updatedProperty,
    });
  } catch (error) {
    console.error('Error in statusUpdate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: errorMessage 
    });
  }
};


export const PropertyRepublisherList = async (req: Request, res: Response) => {
  const { propertyId } = req.body;

  try {
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'propertyId is required',
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const republisherRepo = AppDataSource.getRepository(RepublishProperty);
    const userRepo = AppDataSource.getRepository(UserAuth);
    const enquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const propertyImagesRepo = AppDataSource.getRepository(PropertyImages);

    const [property, republishers] = await Promise.all([
      propertyRepo.findOne({
        where: { id: propertyId },
        relations: ['address', 'propertyImages']
      }),
      republisherRepo.find({
        where: { propertyId },
        order: { createdAt: 'DESC' }
      })
    ]);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const republishersWithDetails = await Promise.all(republishers.map(async (republisher) => {
      const requester = await userRepo.findOne({
        where: { id: republisher.republisherId },
        select: ['id', 'fullName', 'email', 'mobileNumber']
      });

      return {
        id: republisher.id,
        status: republisher.status,
        requester: {
          id: requester?.id,
          name: requester?.fullName,
          email: requester?.email,
          mobileNumber: requester?.mobileNumber
        },
        createdAt: republisher.createdAt
      };
    }));

    const images = await propertyImagesRepo.find({
      where: { propertyId }
    });

    return res.status(200).json({
      success: true,
      message: 'Property republisher list retrieved successfully',
      property,
      images,
      republishers: republishersWithDetails
    });
  } catch (error) {
    console.error('Error in PropertyRepublisherList:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, message: 'Server error', error: errorMessage });
  }
};

// Get user republished properties
export const getuserRepublishedProperties = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, userId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    const republisherRepo = AppDataSource.getRepository(RepublishProperty);
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);
    const enquiryRepo = AppDataSource.getRepository(PropertyEnquiry);

    const [republishRequests, total] = await Promise.all([
      republisherRepo.find({
        where: { ownerId: userId as string },
        skip,
        take: Number(limit),
        order: { createdAt: 'DESC' }
      }),
      republisherRepo.count({ where: { republisherId: userId as string, status: 'Accepted' } })
    ]);

    if (!republishRequests.length) {
      return res.status(200).json({
        success: true,
        message: 'No republish requests found',
        requests: [],
        total: 0,
        currentPage: Number(page),
        totalPages: 0
      });
    }

    const requestsWithDetails = await Promise.all(republishRequests.map(async (request) => {
      const [property, requester, enquiries] = await Promise.all([
        propertyRepo.findOne({
          where: { id: request.propertyId },
          relations: ['address', 'propertyImages']
        }),
        userRepo.findOne({
          where: { id: request.republisherId },
          select: ['id', 'fullName', 'email', 'mobileNumber']
        }),
        enquiryRepo.find({
          where: { propertyId: request.propertyId }
        })
      ]);

      const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 14) return '1 week ago';
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays < 60) return '1 month ago';
        return `${Math.ceil(diffDays / 30)} months ago`;
      };

      const formatPrice = (price: number) => {
        if (price >= 10000000) {
          return `₹ ${(price / 10000000).toFixed(1)} Cr`;
        } else if (price >= 100000) {
          return `₹ ${(price / 100000).toFixed(1)} L`;
        } else if (price >= 1000) {
          return `₹ ${(price / 1000).toFixed(1)} K`;
        }
        return `₹ ${price}`;
      };

      return {
        id: request.id,
        status: request.status,
        timeAgo: getTimeAgo(request.createdAt),
        requester: {
          id: requester?.id,
          name: requester?.fullName || 'Unknown User',
          email: requester?.email,
          mobileNumber: requester?.mobileNumber,
          message: `${requester?.fullName || 'Someone'} has requested to republish this property.`
        },
        property: {
          id: property?.id,
          name: property?.propertyName || property?.projectName || 'Unnamed Property',
          category: property?.category,
          subCategory: property?.subCategory,
          price: property?.propertyPrice ? formatPrice(property.propertyPrice) : 'Price not available',
          location: property?.address ? `${property.address.locality}, ${property.address.city}` : 'Location not available',
          address: property?.address,
          images: property?.propertyImages || [],
          primaryImage: property?.propertyImages?.[0]?.imageKey || null,
          isSale: property?.isSale,
          bhks: property?.bhks,
          carpetArea: property?.carpetArea,
          buildupArea: property?.buildupArea
        },
        enquiries: {
          viewProperty: enquiries.length,
          calling: enquiries.filter(enquiry => enquiry.calling).length,
        },
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      };
    }));

    const totalPages = Math.ceil(total / Number(limit));

    return res.status(200).json({
      success: true,
      message: 'Republish requests retrieved successfully',
      requests: requestsWithDetails,
      total,
      currentPage: Number(page),
      totalPages,
      hasMore: skip + republishRequests.length < total
    });
  } catch (error) {
    console.error('Error in getuserRepublishedProperties:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: errorMessage
    });
  }
};