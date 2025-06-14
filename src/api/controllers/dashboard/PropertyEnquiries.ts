import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { ErrorHandler } from '@/api/middlewares/error';
import { Property } from '@/api/entity/Property';
import { PropertyEnquiry } from '@/api/entity/PropertyEnquiry';
import { Address } from '@/api/entity/Address';
import { UserAuth } from '@/api/entity/UserAuth';

type PropertyResponseType = {
  id: string;
  userId: string;
  address: Address;
  category: string;
  subCategory: string;
};

// Create a property enquiry

export const createPropertyEnquiry = async (req: Request, res: Response) => {
  try {
    const { propertyId, userId } = req.body;

    if (!propertyId || !userId) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const propertyRepo = AppDataSource.getRepository(Property);

    // Fetch property details
    const propertyDetails = await propertyRepo.findOne({ where: { id: propertyId } });

    if (!propertyDetails) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (propertyDetails.userId === userId) {
      return res.status(403).json({ message: 'You cannot create an enquiry for your own property' });
    }
    const propertyEnquiry = propertyEnquiryRepo.create({
      propertyId,
      userId,
      ownerId: propertyDetails.userId,
    });
    const newPropertyEnquiry = await propertyEnquiryRepo.save(propertyEnquiry);
    res.status(201).json({
      message: 'Property enquiry created successfully',
      enquiry: newPropertyEnquiry,
      propertyDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating property enquiry' });
  }
};


// Get all property enquiries for a user

export const getAllPropertyEnquiries = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Fetch all property enquiries for the user, including property and owner info
    const propertyEnquiries = await propertyEnquiryRepo.find({
      where: { userId },
      relations: ['property'],
      order: { createdAt: 'DESC' }
    });

    // Get S3 bucket from env
    const S3_BUCKET = process.env.AWS_S3_BUCKET || 'nextdealapp';
    const S3_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;

    // For each enquiry, fetch the owner (agent) info
    const formatted = await Promise.all(propertyEnquiries.map(async (enquiry) => {
     
       const  agent = await userRepo.findOne({ where: { id: enquiry?.ownerId } });
      

      return {
        id: enquiry.id,
        agentName: agent?.fullName ,
        agentRole: agent?.userType ,
        agentAvatar: agent?.userProfileKey
          ? `${S3_BASE_URL}${agent.userProfileKey}`
          : 'https://randomuser.me/api/portraits/men/1.jpg',
        timeAgo: timeAgo(enquiry.createdAt),
        propertId:enquiry.property?.id,
        propertyType: enquiry.property?.category || '',
        propertyTitle: enquiry.property?.title || '',
      };
    }));

    return res.status(200).json({
      message: 'Property enquiries retrieved successfully',
      propertyEnquiries: formatted,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error retrieving property enquiries' });
  }
};

// Helper to format time ago
function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `just now`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return `${Math.floor(diff / 604800)} week${Math.floor(diff / 604800) > 1 ? 's' : ''} ago`;
}

