import { PropertyEnquiry } from './../../entity/PropertyEnquiry';
import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { ErrorHandler } from '@/api/middlewares/error';

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

export const createPropertyEnquiry = async (req: PropertyRequest, res: Response) => {
  try {
    const { propertyId, userId, ownerId, addressState, addressCity, imageKeys, category, subCategory } = req.body;
    if (!propertyId || !userId || !ownerId || !addressState || !addressCity || !category || !subCategory) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const propertyEnquiry = propertyEnquiryRepo.create({
      propertyId,
      userId,
      ownerId,
      address: {
        state: addressState,
        city: addressCity,
      },
      imageKeys,
      category,
      subCategory,
    });

    const newPropertyEnquiry = await propertyEnquiryRepo.save(propertyEnquiry);
    res.status(201).json({ message: 'Property enquiry  created succesfull', newPropertyEnquiry });
  } catch (error) {
    res.status(500).json({ message: 'Error creating property enquiry' });
  }
};

// Get all property enquiries

export const getAllPropertyEnquiries = async (req: PropertyRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const propertyEnquiryRepo = AppDataSource.getRepository(PropertyEnquiry);
    const propertyEnquiries = await propertyEnquiryRepo.find({ where: { userId } });
    res.status(200).json({ message: 'Property enquiries retrieved successfully', propertyEnquiries });
    } catch (error) {
    res.status(500).json({ message: 'Error retrieving property enquiries' });
  }
};
