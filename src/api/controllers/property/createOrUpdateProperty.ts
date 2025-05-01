import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { Address } from '@/api/entity/Address';
import { UserAuth } from '@/api/entity';
import { PropertyImages } from '@/api/entity/PropertyImages';

// Property creation/update request type
export interface PropertyRequest extends Request {
  body: {
    propertyId?: string;
    userId?: string;
    addressState?: string;
    addressCity?: string;
    addressLocality?: string;
    imageKeys?: Array<{
      imageKey: string;
      imgClassifications: 'Bathroom' | 'Bedroom' | 'Dining' | 'Kitchen' | 'Livingroom';
      accurencyPercent: number;
    }>;
    category: string;
    subCategory: string;
    projectName?: string;
    propertyName?: string;
    isSale?: boolean;
    totalBathrooms?: number;
    totalRooms?: number;
    propertyPrice?: number;
    isSold?: boolean;
    conversion?: string[];
    carpetArea?: number;
    buildupArea?: number;
    bhks?: number;
    furnishing?: string;
    addFurnishing?: string[];
    constructionStatus?: string;
    propertyFacing?: string;
    ageOfTheProperty?: string;
    reraApproved?: boolean;
    amenities?: string[];
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
    isSale,
    totalBathrooms,
    totalRooms,
    propertyPrice,
    isSold,
    conversion,
    carpetArea,
    buildupArea,
    bhks,
    furnishing,
    addFurnishing,
    constructionStatus,
    propertyFacing,
    ageOfTheProperty,
    reraApproved,
    amenities,
  } = req.body;

  try {
    // Validate required fields for new property
    if (!propertyId && !userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required for creating a new property' 
      });
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const addressRepo = AppDataSource.getRepository(Address);
    const propertyImagesRepo = AppDataSource.getRepository(PropertyImages);
    const userRepo = AppDataSource.getRepository(UserAuth);

    const user = await userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if property exists for update
    if (propertyId) {
      const existingProperty = await propertyRepo.findOne({
        where: { id: propertyId },
        relations: ['address', 'propertyImages'],
      });

      if (!existingProperty) {
        return res.status(404).json({  
          success: false,
          message: 'Property not found' 
        });
      }

      // Update address if provided
      if (existingProperty.address && (addressState || addressCity || addressLocality)) {
        existingProperty.address.state = addressState || existingProperty.address.state;
        existingProperty.address.city = addressCity || existingProperty.address.city;
        existingProperty.address.locality = addressLocality || existingProperty.address.locality;
        await addressRepo.save(existingProperty.address);
      }

      // Update property with only provided fields
      const propertyUpdateData: Partial<Property> = {};
      
      // Always update category and subCategory as they are required
      propertyUpdateData.category = category;
      propertyUpdateData.subCategory = subCategory;
      
      // Only include other fields that are provided in the request
      if (projectName) propertyUpdateData.projectName = projectName;
      if (propertyName) propertyUpdateData.propertyName = propertyName;
      if (isSale !== undefined) propertyUpdateData.isSale = isSale;
      if (totalBathrooms) propertyUpdateData.totalBathrooms = totalBathrooms;
      if (totalRooms) propertyUpdateData.totalRooms = totalRooms;
      if (propertyPrice) propertyUpdateData.propertyPrice = propertyPrice;
      if (isSold !== undefined) propertyUpdateData.isSold = isSold;
      if (conversion) propertyUpdateData.conversion = conversion;
      if (carpetArea) propertyUpdateData.carpetArea = carpetArea;
      if (buildupArea) propertyUpdateData.buildupArea = buildupArea;
      if (bhks) propertyUpdateData.bhks = bhks;
      if (furnishing) propertyUpdateData.furnishing = furnishing;
      if (addFurnishing) propertyUpdateData.addFurnishing = addFurnishing;
      if (constructionStatus) propertyUpdateData.constructionStatus = constructionStatus;
      if (propertyFacing) propertyUpdateData.propertyFacing = propertyFacing;
      if (ageOfTheProperty) propertyUpdateData.ageOfTheProperty = ageOfTheProperty;
      if (reraApproved !== undefined) propertyUpdateData.reraApproved = reraApproved;
      if (amenities) propertyUpdateData.amenities = amenities;
      
      Object.assign(existingProperty, propertyUpdateData);

      // Handle property images update
      if (imageKeys && imageKeys.length > 0) {
        // Delete existing images
        if (existingProperty.propertyImages.length > 0) {
          await propertyImagesRepo.remove(existingProperty.propertyImages);
        }

        // Create new property images
        const propertyImages = imageKeys.map(imgData => {
          const propertyImage = new PropertyImages();
          propertyImage.imageKey = imgData.imageKey;
          propertyImage.imgClassifications = imgData.imgClassifications;
          propertyImage.accurencyPercent = imgData.accurencyPercent;
          propertyImage.property = existingProperty;
          return propertyImage;
        });

        existingProperty.propertyImages = await propertyImagesRepo.save(propertyImages);
      }

      const updatedProperty = await propertyRepo.save(existingProperty);
      
      // Fetch the updated property with all relations
      const propertyWithRelations = await propertyRepo.findOne({
        where: { id: updatedProperty.id },
        relations: ['address', 'propertyImages'],
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
      return res.status(400).json({ 
        success: false,
        message: 'Address details are required for creating a new property' 
      });
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
      category,
      subCategory,
      projectName,
      propertyName,
      isSale,
      totalBathrooms,
      totalRooms,
      propertyPrice: propertyPrice || 0,
      isSold: isSold || false,
      conversion,
      carpetArea,
      buildupArea,
      bhks,
      furnishing,
      addFurnishing,
      constructionStatus,
      propertyFacing,
      ageOfTheProperty,
      reraApproved,
      amenities,
      createdBy: userId,
      updatedBy: userId,
    });

    const savedProperty = await propertyRepo.save(newProperty);

    // Create property images if provided
    if (imageKeys && imageKeys.length > 0) {
      const propertyImages = imageKeys.map(imgData => {
        const propertyImage = new PropertyImages();
        propertyImage.imageKey = imgData.imageKey;
        propertyImage.imgClassifications = imgData.imgClassifications;
        propertyImage.accurencyPercent = imgData.accurencyPercent;
        propertyImage.property = savedProperty;
        return propertyImage;
      });

      await propertyImagesRepo.save(propertyImages);
    }

    // Fetch the new property with all relations
    const propertyWithRelations = await propertyRepo.findOne({
      where: { id: savedProperty.id },
      relations: ['address', 'propertyImages'],
    });

    return res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property: propertyWithRelations,
    });
  } catch (error) {
    console.error('Error in createOrUpdateProperty:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};