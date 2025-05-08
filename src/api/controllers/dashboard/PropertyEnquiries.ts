
import { PropertyEnquiry } from './../../entity/PropertyEnquiry';
import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { ErrorHandler } from '@/api/middlewares/error';
import { Property } from '@/api/entity/Property';

export interface PropertyRequest extends Request {
  body: {
    propertyId?: string;
    userId?: string;
    ownerId?: string;
    addressState?: string;
    addressCity?: string;
    imageKeys?: string[];
    category: string;
    subCategory: string;
  };
  user?: {
    id: string;
    userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
    email: string;
    mobileNumber: string;
    isAdmin?: boolean;
  };
}

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
    const { propertyId, userId} = req.body;

    if (!propertyId || !userId ) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const propertyRepo = AppDataSource.getRepository(Property);

    // Fetch property details
    const propertyDetails = await propertyRepo.findOne({ where: { id: propertyId } });

    if (!propertyDetails) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if(propertyDetails.userId === userId) {
      return res.status(403).json({ message: 'You cannot create an enquiry for your own property' });
    }
    const propertyEnquiry = propertyEnquiryRepo.create({
      propertyId,
      userId,
      ownerId:propertyDetails.userId,
    
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
export const getAllPropertyEnquiries = async (req: Request, res: Response) =>
  {
    try {
      const { userId } = req.body;
      const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
      const propertyEnquiries = await propertyEnquiryRepo.find({ where: { userId } });
      res.status(200).json({ message: 'Property enquiries retrieved successfully', propertyEnquiries });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving property enquiries' });
    }
  };


