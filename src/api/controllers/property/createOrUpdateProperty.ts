import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { Address } from '@/api/entity/Address';
import { PropertyImage } from '@/api/entity/PropertyImages';

// Property creation/update request type
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
  };
  user?: {
    id: string;
    userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
    email: string;
    mobileNumber: string;
    isAdmin?: boolean;
  };
}
export const createOrUpdateProperty = async (req: PropertyRequest, res: Response) => {
  const {
    propertyId,
    userId,
    addressState,
    addressCity,
    addressLocality,
    imageKeys,
    category,
    subCategory,
    projectName,
    propertyName,
    totalBathrooms,
    totalRooms,
    propertyPrice,
    carpetArea,
    buildupArea,
    bhks,
    furnishing,
    constructionStatus,
    propertyFacing,
    ageOfTheProperty,
    reraApproved,
    amenities,
    width,
    height,
    totalArea,
    plotArea,
    viewFromProperty,
    landArea,
    unit,
  } = req.body;
  try {
    // Validate required fields for new property
    if (!propertyId && !userId) {
      return res.status(400).json({ message: 'User ID is required for creating a new property' });
    }
    

    const propertyRepo = AppDataSource.getRepository(Property);
    const addressRepo = AppDataSource.getRepository(Address);
    const propertyImageRepo = AppDataSource.getRepository(PropertyImage);

    // Check if property exists for update
    if (propertyId) {
      const existingProperty = await propertyRepo.findOne({
        where: { id: propertyId },
        relations: ['address', 'propertyImageKeys'],
      });

      if (!existingProperty) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Update address if provided
      if (existingProperty.address && (addressState || addressCity || addressLocality)) {
        existingProperty.address.state = addressState || existingProperty.address.state;
        existingProperty.address.city = addressCity || existingProperty.address.city;
        existingProperty.address.locality = addressLocality || existingProperty.address.locality;
        await addressRepo.save(existingProperty.address);
      }

      // Update property images if provided
      if (imageKeys && Array.isArray(imageKeys)) {
        // Delete existing images
        await propertyImageRepo.delete({ property: existingProperty });

        // Create new images
        const newImages = imageKeys.map((imageKey: string) => {
          return propertyImageRepo.create({
            property: existingProperty,
            imageKey,
            imageName: imageKey.split('/').pop() || imageKey,
          });
        });

        await propertyImageRepo.save(newImages);
      }

      // Update property with only provided fields
      const propertyUpdateData: Partial<Property> = {};
      
      // Always update category and subCategory as they are required
      propertyUpdateData.category = category;
      propertyUpdateData.subCategory = subCategory;
      
      // Only include other fields that are provided in the request
      if (projectName) propertyUpdateData.projectName = projectName;
      if (propertyName) propertyUpdateData.propertyName = propertyName;
      if (totalBathrooms) propertyUpdateData.totalBathrooms = totalBathrooms;
      if (totalRooms) propertyUpdateData.totalRooms = totalRooms;
      if (propertyPrice) propertyUpdateData.propertyPrice = propertyPrice;
      if (carpetArea) propertyUpdateData.carpetArea = carpetArea;
      if (buildupArea) propertyUpdateData.buildupArea = buildupArea;
      if (bhks) propertyUpdateData.bhks = bhks;
      if (furnishing) propertyUpdateData.furnishing = furnishing;
      if (constructionStatus) propertyUpdateData.constructionStatus = constructionStatus;
      if (propertyFacing) propertyUpdateData.propertyFacing = propertyFacing;
      if (ageOfTheProperty) propertyUpdateData.ageOfTheProperty = ageOfTheProperty;
      if (reraApproved !== undefined) propertyUpdateData.reraApproved = reraApproved;
      if (amenities) propertyUpdateData.amenities = amenities;
      if (width) propertyUpdateData.width = width;
      if (height) propertyUpdateData.height = height;
      if (totalArea) propertyUpdateData.totalArea = totalArea;
      if (plotArea) propertyUpdateData.plotArea = plotArea;
      if (viewFromProperty) {
        propertyUpdateData.viewFromProperty = Array.isArray(viewFromProperty) ? viewFromProperty : [viewFromProperty];
      }
      if (landArea) propertyUpdateData.landArea = landArea;
      if (unit) propertyUpdateData.unit = unit;

      console.log('Property update data:', JSON.stringify(propertyUpdateData, null, 2));
      
      Object.assign(existingProperty, propertyUpdateData);

      const updatedProperty = await propertyRepo.save(existingProperty);
      console.log('Updated property:', JSON.stringify(updatedProperty, null, 2));
      
      // Fetch the updated property with all relations
      const propertyWithRelations = await propertyRepo.findOne({
        where: { id: updatedProperty.id },
        relations: ['address', 'propertyImageKeys'],
      });
      
      return res.status(200).json({ 
        success: true,
        message: 'Property updated successfully', 
        property: propertyWithRelations 
      });
    }

    // Create new property
    // Validate required fields for new property
    if (!addressState || !addressCity || !addressLocality) {
      return res.status(400).json({ message: 'Address details are required for creating a new property' });
    }

    const newAddress = addressRepo.create({
      state: addressState,
      city: addressCity,
      locality: addressLocality,
    });
    await addressRepo.save(newAddress);

    // Create new property with all required fields
    const newProperty = propertyRepo.create({
      userId,
      address: newAddress,
      category, // Required field
      subCategory, // Required field
      projectName,
      propertyName,
      totalBathrooms,
      totalRooms,
      propertyPrice,
      carpetArea,
      buildupArea,
      bhks,
      furnishing,
      constructionStatus,
      propertyFacing,
      ageOfTheProperty,
      reraApproved,
      amenities,
      width,
      height,
      totalArea,
      plotArea,
      viewFromProperty,
      landArea,
      unit,
    });

    // Log the property object before saving to debug
    console.log('Property to save:', JSON.stringify(newProperty, null, 2));

    const savedProperty = await propertyRepo.save(newProperty);
    console.log('Saved property:', JSON.stringify(savedProperty, null, 2));

    // Create property images if provided
    if (imageKeys && Array.isArray(imageKeys)) {
      const newImages = imageKeys.map((imageKey: string) => {
        return propertyImageRepo.create({
          property: savedProperty,
          imageKey,
          imageName: imageKey.split('/').pop() || imageKey,
        });
      });

      await propertyImageRepo.save(newImages);
    }

    // Fetch the created property with all relations
    const propertyWithRelations = await propertyRepo.findOne({
      where: { id: savedProperty.id },
      relations: ['address', 'propertyImageKeys'],
    });

    // Log the property after fetching to debug
    console.log('Property after fetch:', JSON.stringify(propertyWithRelations, null, 2));

    return res.status(201).json({ 
      success: true,
      message: 'Property created successfully', 
      property: propertyWithRelations 
    });
  } catch (error) {
    console.error('Error in createOrUpdateProperty:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};