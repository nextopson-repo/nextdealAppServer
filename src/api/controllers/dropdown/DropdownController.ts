import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { DropdownOptions } from '@/api/entity/DropdownOptions';
import { AppDataSource } from '@/server';

const app = express();
app.use(express.json());

export const uploadPropertyDropdown = async (_req: Request, res: Response) => {
  try {
    const dropdownRepo = AppDataSource.getRepository(DropdownOptions);
    const options = await dropdownRepo.find({
      select: [
        'residential',
        'commercial',
        'propertyType',
        'state',
        'city',
        'furnishing',
        'propertyFacing',
        'viewsOfProperty',
        'amenities',
        'BHKs',
        'constructionStatus',
        'ageOfProperty',
        'reraApproved',
        'fencing',
        'soilType',
        'approachRoad',
        'washrooms',
        'parking',
      ],
    });
    res.status(200).json(options);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving dropdown options', error });
  }
};

export const userRequirements = async (_req: Request, res: Response) => {
  try {
    const dropdownRepo = AppDataSource.getRepository(DropdownOptions);
    const options = await dropdownRepo.find({
      select: ['lookingFor', 'needFor', 'furnishingType', 'BHKType'],
    });
    res.status(200).json(options);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user requirements', error });
  }
};

export const imageFilter = async (_req: Request, res: Response) => {
  try {
    const dropdownRepo = AppDataSource.getRepository(DropdownOptions);
    const options = await dropdownRepo.find({
      select: ['images'],
    });
    res.status(200).json(options);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving image options', error });
  }
};