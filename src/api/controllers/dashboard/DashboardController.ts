import { PropertyImages } from '@/api/entity/PropertyImages';
import { SavedProperty } from './../../entity/SavedProperties';
import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';
import { PropertyRequirement } from '@/api/entity/PropertyRequirement';
import { UserAuth } from '@/api/entity';
import { Address } from '@/api/entity/Address';
import { In, Between } from 'typeorm';

// Custom type for request user
type RequestUser = {
  id: string;
  userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
  email: string;
  mobileNumber: string;
  isAdmin?: boolean;
  isSold?: boolean;
  conversion?: string;
};

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
    isSold?: boolean;
    conversion?: string;
    // Analytics filter fields
    dateRangeType?: 'lastMonth' | 'last3Months' | 'lastYear' | 'custom';
    fromDate?: string; // ISO string, required if dateRangeType is 'custom'
    toDate?: string;   // ISO string, required if dateRangeType is 'custom'
  };
  user?: RequestUser;
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
  isSold: boolean | null;
  conversion: string | null;
};

export const analyticProperty = async (req: PropertyRequest, res: Response) => {
  try {
    const { userId, dateRangeType, fromDate, toDate } = req.body;
    if (!userId) {
      throw new ErrorHandler('User ID is required', 400);
    }
    // Date range calculation
    let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;
    const today = new Date();
    switch (dateRangeType) {
      case 'lastMonth': {
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        break;
      }
      case 'last3Months': {
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 3);
        break;
      }
      case 'lastYear': {
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(prevEndDate);
        prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
        break;
      }
      case 'custom': {
        if (!fromDate || !toDate) {
          throw new ErrorHandler('Custom date range requires fromDate and toDate', 400);
        }
        startDate = new Date(fromDate);
        endDate = new Date(toDate);
        // Calculate previous period
        const diff = endDate.getTime() - startDate.getTime();
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(startDate.getTime() - diff);
        break;
      }
      default: {
        throw new ErrorHandler('Invalid dateRangeType', 400);
      }
    }
    // Helper to get metrics for a period
    const getMetrics = async (start: Date, end: Date) => {
      const propertyRepo = AppDataSource.getRepository(Property);
      const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
      const SavedPropertyRepo = AppDataSource.getRepository(SavedProperty);
      // Listings
      const property = await propertyRepo.find({
        where: { userId, createdAt: Between(start, end) },
      });
      // Requirements
      const requirement = await requirementRepo.find({
        where: { userId, createdAt: Between(start, end) },
      });
      // Impressions (saved properties)
      const savedProperties = await SavedPropertyRepo.find({
        where: { ownerId: userId, createdAt: Between(start, end) },
      });
      // Inventory Value
      let inventoryValue = 0;
      let soldInventoryValue = 0;
      let totalConversions = 0;
      let dealsClosed = 0;
      for (let i = 0; i < property.length; i++) {
        inventoryValue += property[i].propertyPrice;
        if (property[i].isSold) {
          soldInventoryValue += property[i].propertyPrice;
          dealsClosed++;
        }
        if (property[i].conversion) {
          totalConversions += property[i].conversion.length;
        }
      }
      return {
        propertyCount: property.length,
        requirementCount: requirement.length,
        inventoryValue,
        soldInventoryValue,
        impressionCount: savedProperties.length,
        conversionCount: totalConversions,
        dealsClosed,
      };
    };
    // Get current and previous period metrics
    const [current, previous] = await Promise.all([
      getMetrics(startDate, endDate),
      getMetrics(prevStartDate, prevEndDate),
    ]);
    // Helper for percent change
    const percentChange = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return ((curr - prev) / prev) * 100;
    };
    // Build response
    const result = {
      listings: {
        value: current.propertyCount,
        percentChange: percentChange(current.propertyCount, previous.propertyCount),
      },
      requirements: {
        value: current.requirementCount,
        percentChange: percentChange(current.requirementCount, previous.requirementCount),
      },
      inventoryValue: {
        value: current.inventoryValue,
        percentChange: percentChange(current.inventoryValue, previous.inventoryValue),
      },
      impressions: {
        value: current.impressionCount,
        percentChange: percentChange(current.impressionCount, previous.impressionCount),
      },
      conversions: {
        value: current.conversionCount,
        percentChange: percentChange(current.conversionCount, previous.conversionCount),
      },
      dealsClosed: {
        value: current.dealsClosed,
        percentChange: percentChange(current.dealsClosed, previous.dealsClosed),
      },
      period: {
        from: startDate,
        to: endDate,
      },
    };
    return res.status(200).json({
      message: 'Analytic properties retrieved successfully',
      result,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error });
  }
};

// create saved property
export const createSavedProperty = async (req: Request, res: Response) => {
  try {
    const { propertyId, userId } = req.body;
    if (!propertyId || !userId) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const savedPropertyRepo = AppDataSource.getRepository(SavedProperty);
    const propertyRepo = AppDataSource.getRepository(Property);

    // First check if property exists
    const propertyDetails = await propertyRepo.findOne({
      where: { id: propertyId },
      relations: ['propertyImages', 'address'],
    });

    if (!propertyDetails) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const savedProperty = savedPropertyRepo.create({
      propertyId,
      ownerId: propertyDetails.userId,
      userId,
    });
    const newProperty = await savedPropertyRepo.save(savedProperty);

    return res.status(201).json({
      message: 'Saved property created successfully',
      newProperty,
      propertyDetails,
    });
  } catch (error: any) {
    console.error('Error in createSavedProperty:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
      error: error,
    });
  }
};
 
// saved property
export const getSavedProperties = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const savedPropertyRepo = AppDataSource.getRepository(SavedProperty);
    const propertyRepo = AppDataSource.getRepository(Property);
    const userRepo = AppDataSource.getRepository(UserAuth);

    const user = await userRepo.findOne({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const savedProperties = await savedPropertyRepo.find({
      where: { userId },
    });

    if (!savedProperties || savedProperties.length === 0) {
      return res.status(404).json({ message: 'No saved properties found' });
    }
    const propertyIds = savedProperties.map((sp) => sp.propertyId);
    const properties = await propertyRepo.find({
      where: { id: In(propertyIds) },
      relations: ['propertyImages', 'address'],
    });
    const propertyMap = new Map(properties.map((p) => [p.id, p]));
    const result = savedProperties.map((sp) => ({
      savedProperty: sp,
      property: propertyMap.get(sp.propertyId) || null,
    }));
    return res.status(200).json({
      message: 'Saved properties retrieved successfully',
      result: {
        savedProperties: result,
        user,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// remove saved property
export const removeSavedProperty = async (req: Request, res: Response) => {
  try {
    const { savedPropertyId, userId } = req.body;
    if (!savedPropertyId || !userId) {
      return res.status(400).json({ message: 'Saved property ID and user ID are required' });
    }
    const savedPropertyRepo = AppDataSource.getRepository(SavedProperty);
    const savedProperty = await savedPropertyRepo.findOne({
      where: { propertyId: savedPropertyId, userId },
    });

    if (!savedProperty) {
      return res.status(404).json({ message: 'Saved property not found' });
    }
    await savedPropertyRepo.remove(savedProperty);
    return res.status(200).json({ message: 'Saved property removed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};
