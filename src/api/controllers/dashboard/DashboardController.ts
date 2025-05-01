import { SavedProperty } from './../../entity/SavedProperties';
import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { ErrorHandler } from '@/api/middlewares/error';
import { PropertyRequirement } from '@/api/entity/PropertyRequirement';

export interface PropertyRequest extends Request {
  body: {
    propertyId?: string;
    userId?: string;
    isSold?: boolean;
    conversion?: string;
  };
}

type PropertyResponseType = {
  id: string;
  userId: string;
  isSold: boolean | null;
  conversion: string | null;
};

export const analyticProperty = async (req: PropertyRequest, res: Response) => {
  try {
    const { userId } = req.body;
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
      where: { ownerId: userId },
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
