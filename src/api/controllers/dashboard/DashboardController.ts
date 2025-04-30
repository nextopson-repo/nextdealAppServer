import { SavedProperty } from './../../entity/SavedProperties';
// Dashboard controller

import { Request, Response, NextFunction, response } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';
import { UserAuth } from '@/api/entity/UserAuth';
import { Address } from '@/api/entity/Address';
import { In } from 'typeorm';
import { PropertyRequirement } from '@/api/entity/PropertyRequirement';

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
    isSold ?: boolean;
    conversion ?: string;
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
  isSold : boolean | null;
  conversion : string | null;
};



export const analyticProperty = async (req: PropertyRequest, res: Response) => {
  try {
    const { userId} = req.body;
    if (!userId) {
      throw new ErrorHandler('User ID is required', 400);
    }
    const propertyRepo = AppDataSource.getRepository(Property);
    const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
    const SavedPropertyRepo = AppDataSource.getRepository(SavedProperty);
  
   const property = await propertyRepo.find({
      where: { userId },
    });
 const requirement = await requirementRepo.find({
      where: { userId },
    });
 const savedProperties = await SavedPropertyRepo.find({
      where: { ownerId : userId },
    });

let inventoryValue = 0;
     for (let i = 0; i < property.length; i++) {
      inventoryValue += property[i].propertyPrice;
    }
    let soldInventoryValue = 0; 
    for (let i = 0; i < property.length; i++) {
      if (property[i].isSold) {
        soldInventoryValue += property[i].propertyPrice;
      }
    }
 let totalConversions = 0;
    for (let i = 0; i < property.length; i++) {
      if (property[i].conversion) {
        totalConversions += property[i].conversion.length;
      }
    }
const result = {
      propertyCount: property.length > 0 ? property.length : 0,
      requirementCount: requirement.length > 0 ? requirement.length : 0,
      inventoryValue: inventoryValue > 0 ? inventoryValue : 0,
      soldInventoryValue: soldInventoryValue > 0 ? soldInventoryValue : 0,
      impressionCount: savedProperties.length > 0 ? savedProperties.length : 0,
      conversionCount: totalConversions > 0 ? totalConversions : 0,
    };
    return res.status(200).json({
      message: 'Analytic properties retrieved successfully',
      result,
    });
  } catch (error: any) {
    res.status(500).json({ message: error });
  }
};

