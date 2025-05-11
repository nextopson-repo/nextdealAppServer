import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { DropdownOptions } from '@/api/entity/DropdownOptions';
import { AppDataSource } from '@/server';
import { Location } from '@/api/entity/Location';
const app = express();
app.use(express.json());


export const uploadLocationDropdown = async (_req: Request, res: Response) => {
  try {
    const dropdownRepo = AppDataSource.getRepository(Location);
    const options = await dropdownRepo.find({
      order: { id: 'ASC' }
    });
    res.status(200).json(options);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving location options', error });
  }
};


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
        'locality',
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

// Get all unique states
export const getStates = async (req: Request, res: Response) => {
  try {
    const locationRepo = AppDataSource.getRepository(Location);
    const locations = await locationRepo.find({ select: ['state'] });
    // Remove duplicates and sort
    const states = [...new Set(locations.map(loc => loc.state))].filter(Boolean).sort();
    res.status(200).json(states);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch states' });
  }
};

// Get cities for a selected state
export const getCities = async (req: Request, res: Response) => {
  try {
    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ message: 'State is required' });
    }

    const locationRepo = AppDataSource.getRepository(Location);
    const locations = await locationRepo.find({
      where: { state },
      select: ['city'],
    });

    const cityList = [...new Set(locations.map(loc => loc.city))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    res.status(200).json(cityList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

// Get localities for a selected city
export const getLocalities = async (req: Request, res: Response) => {
  try {
    const { state, city } = req.body;
    if (!state || !city) {
      return res.status(400).json({ message: 'State and city are required' });
    }

    const locationRepo = AppDataSource.getRepository(Location);
    const locations = await locationRepo.find({
      where: { state, city },
      select: ['locality'],
    });
    
    const localityList = [...new Set(locations.map(loc => loc.locality))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    res.status(200).json(localityList);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving localities', error });
  }
};