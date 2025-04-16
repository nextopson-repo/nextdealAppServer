import { Request, Response } from 'express';
import { Property } from '../../models/PropertyModel';

const properties: Property[] = [];

export const createProperty = (req: Request, res: Response) => {
  const { availableFor, category, address } = req.body;

  if (!availableFor || !category || !address?.state || !address?.city || !address?.locality) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const newProperty: Property = {
    id: Date.now().toString(),
    availableFor,
    category,
    address
  };

  properties.push(newProperty);
  res.status(201).json({ message: 'Property created', property: newProperty });
};

export const getAllProperties = (_: Request, res: Response) => {
  res.status(200).json(properties);
};
