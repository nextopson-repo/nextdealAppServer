import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import {RepublishProperty } from '@/api/entity/republishedEntity';
import { Property } from '@/api/entity/Property';
import { PropertyImages } from '@/api/entity/PropertyImages';
import { UserAuth } from '@/api/entity/UserAuth';
import { ErrorHandler } from '@/api/middlewares/error';


// Controller: Create Republisher
export const createRepublisher = async (req: Request, res: Response) => {
    const { republisherId, ownerId, propertyId } = req.body;
  
    try {
      if (!republisherId || !ownerId || !propertyId) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required: republisherId, ownerId, propertyId',
        });
      }
  
      const propertyRepo = AppDataSource.getRepository(Property);
      const userRepo = AppDataSource.getRepository(UserAuth);
      const republisherRepo = AppDataSource.getRepository(RepublishProperty);
  
      const property = await propertyRepo.findOne({ where: { id: propertyId } });
      if (!property) {
        return res.status(400).json({
          success: false,
          message: 'Invalid propertyId — property does not exist',
        });
      }
  
      const owner = await userRepo.findOne({ where: { id: ownerId } });
      if (!owner) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ownerId — owner does not exist',
        });
      }
  
      const newRepublisher = republisherRepo.create({
        republisherId,
        ownerId,
        propertyId
      });
  
      const saved = await republisherRepo.save(newRepublisher);
  
      return res.status(201).json({
        success: true,
        message: 'Republisher created successfully',
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

// Controller: Republish Request
export const republishRequest = async (req: Request, res: Response) => {
  const { ownerId } = req.body;

  try {
    const republisherRepo = AppDataSource.getRepository(RepublishProperty);
    const propertyRepo = AppDataSource.getRepository(Property);

    const republisher = await republisherRepo.findOne({ where: { ownerId } });

    if (!republisher) {
      return res.status(404).json({ success: false, message: 'Republisher not found' });
    }

    const property = await propertyRepo.findOne({ where: { id: republisher.propertyId } });

    return res.status(200).json({
      success: true,
      message: 'Republisher found',
      republisher,
      property,
    });
  } catch (error) {
    console.error('Error in republishRequest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Server error', error: errorMessage });
  }
};


// Controller: Status Update
export const statusUpdate = async (req: Request, res: Response) => {
  const { propertyId ,status} = req.body;

  try {
    const republisherRepo = AppDataSource.getRepository(RepublishProperty);
    const propertyRepo = AppDataSource.getRepository(Property);

    const republisher = await republisherRepo.findOne({ where: { propertyId } });

    if (!republisher) {
      return res.status(404).json({ success: false, message: 'Republisher not found' });
    }

    republisher.status = status;
    const updated = await republisherRepo.save(republisher);
    const property = await propertyRepo.findOne({ where: { id: updated.propertyId } });

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      republisher: updated,
      property,
    });
  } catch (error) {
    console.error('Error in statusUpdate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Server error', error: errorMessage });
  }
};


export const myUserRepublisher = async (req: Request, res: Response) => {
  const { propertyId } = req.body;

  try {
    const propertyRepo = AppDataSource.getRepository(Property);
    const imageRepo = AppDataSource.getRepository(PropertyImages);

    const property = await propertyRepo.findOne({
      where: { id: propertyId },
      relations: ['address', 'propertyImages']
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const images = await imageRepo.find({
      where: { propertyId }
    });

    res.status(200).json({
      success: true,
      message: 'User republisher property list',
      property,
      images
    });
  } catch (error) {
    console.error('Error in myUserRepublisher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Server error', error: errorMessage });
  }
};
