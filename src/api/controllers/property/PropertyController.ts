import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { Address } from '@/api/entity/Address';
import { PropertyImage } from '@/api/entity/PropertyImages';

export const createOrUpdateProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      propertyId,
      userId,
      addressState,
      addressCity,
      addressLocality,
      imageKeys,
      propertyCategory,
      propertyType,
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

      // Update address
      if (existingProperty.address) {
        existingProperty.address.state = addressState;
        existingProperty.address.city = addressCity;
        existingProperty.address.locality = addressLocality;
        await addressRepo.save(existingProperty.address);
      }

      // Update property images
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

      // Update property
      Object.assign(existingProperty, {
        propertyCategory,
        propertyType,
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

      const updatedProperty = await propertyRepo.save(existingProperty);
      return res.status(200).json({ message: 'Property updated successfully', property: updatedProperty });
    }

    // Create new property
    const newAddress = addressRepo.create({
      state: addressState,
      city: addressCity,
      locality: addressLocality,
    });
    await addressRepo.save(newAddress);

    const newProperty = propertyRepo.create({
      userId,
      address: newAddress,
      propertyCategory,
      propertyType,
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

    const savedProperty = await propertyRepo.save(newProperty);

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

    return res.status(201).json({ message: 'Property created successfully', property: savedProperty });
  } catch (error) {
    next(error);
  }
};

