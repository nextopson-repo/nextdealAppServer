import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { Property } from '@/api/entity/Property';
import { Address } from '@/api/entity/Address';
import { UserAuth } from '@/api/entity';
import { PropertyImages } from '@/api/entity/PropertyImages';
import { PropertyTitleAndDescription } from '@/ml-models/property/TitleAndDiscription';
import { generateNotification } from '../notification/NotificationController';

// Custom type for request user
type RequestUser = {
  id: string;
  userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
  email: string;
  mobileNumber: string;
  isAdmin?: boolean;
};

// Property creation/update request type
export interface PropertyRequest extends Omit<Request, 'user'> {
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
  user?: RequestUser;
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

        // Create new property images (only with valid imageKey)
        const propertyImages = imageKeys
          .filter(imgData => imgData.imageKey)
          .map(imgData => {
            const propertyImage = new PropertyImages();
            propertyImage.imageKey = imgData.imageKey;
            propertyImage.imgClassifications = imgData.imgClassifications;
            propertyImage.accurencyPercent = imgData.accurencyPercent;
            propertyImage.property = existingProperty;
            return propertyImage;
          });

        if (propertyImages.length > 0) {
          existingProperty.propertyImages = await propertyImagesRepo.save(propertyImages);
        } else {
          existingProperty.propertyImages = [];
        }
      }

      const updatedProperty = await propertyRepo.save(existingProperty);

      // Generate title and description for updated property
      try {
        const { title, description } = await PropertyTitleAndDescription.generate(updatedProperty);
        if (title && description) {
          updatedProperty.title = title;
          updatedProperty.description = description;
          await propertyRepo.save(updatedProperty);
        }
      } catch (error) {
        console.error('Error generating title and description:', error);
        // Generate detailed fallback title and description if ML generation fails
        updatedProperty.title = `${updatedProperty.category} ${updatedProperty.subCategory} for ${updatedProperty.isSale ? 'Sale' : 'Rent'} in ${updatedProperty.address?.locality || ''}, ${updatedProperty.address?.city || ''} - ${updatedProperty.bhks || ''} BHK, ${updatedProperty.carpetArea || updatedProperty.buildupArea || ''} sqft, ₹${updatedProperty.propertyPrice || ''}${updatedProperty.furnishing ? ', ' + updatedProperty.furnishing : ''}${updatedProperty.projectName ? ', ' + updatedProperty.projectName : ''}`.replace(/\s+/g, ' ').trim();
        updatedProperty.description = `Discover a ${updatedProperty.bhks || ''} BHK ${updatedProperty.furnishing ? updatedProperty.furnishing + ' ' : ''}${updatedProperty.subCategory.toLowerCase()}${updatedProperty.projectName ? ' in project ' + updatedProperty.projectName : ''} located at ${updatedProperty.address?.locality || ''}, ${updatedProperty.address?.city || ''}, ${updatedProperty.address?.state || ''}. ${updatedProperty.propertyFacing ? 'Facing: ' + updatedProperty.propertyFacing + '. ' : ''}${updatedProperty.ageOfTheProperty ? 'Age: ' + updatedProperty.ageOfTheProperty + '. ' : ''}${updatedProperty.carpetArea ? 'Carpet Area: ' + updatedProperty.carpetArea + ' sqft. ' : ''}${updatedProperty.buildupArea ? 'Buildup Area: ' + updatedProperty.buildupArea + ' sqft. ' : ''}${updatedProperty.propertyPrice ? 'Price: ₹' + updatedProperty.propertyPrice + '. ' : ''}${updatedProperty.totalBathrooms ? 'Bathrooms: ' + updatedProperty.totalBathrooms + '. ' : ''}${updatedProperty.totalRooms ? 'Rooms: ' + updatedProperty.totalRooms + '. ' : ''}${updatedProperty.addFurnishing && updatedProperty.addFurnishing.length ? 'Additional Furnishing: ' + updatedProperty.addFurnishing.join(', ') + '. ' : ''}${updatedProperty.amenities && updatedProperty.amenities.length ? 'Amenities: ' + updatedProperty.amenities.join(', ') + '. ' : ''}${updatedProperty.constructionStatus ? 'Construction Status: ' + updatedProperty.constructionStatus + '. ' : ''}${updatedProperty.reraApproved ? 'RERA Approved. ' : ''}${updatedProperty.viewFromProperty && updatedProperty.viewFromProperty.length ? 'View: ' + updatedProperty.viewFromProperty.join(', ') + '. ' : ''}${updatedProperty.parking ? 'Parking: ' + updatedProperty.parking + '. ' : ''}${updatedProperty.availablefor ? 'Available for: ' + updatedProperty.availablefor + '. ' : ''}${updatedProperty.unit ? 'Unit: ' + updatedProperty.unit + '. ' : ''}${updatedProperty.soilType ? 'Soil Type: ' + updatedProperty.soilType + '. ' : ''}${updatedProperty.approachRoad ? 'Approach Road: ' + updatedProperty.approachRoad + '. ' : ''}${updatedProperty.totalfloors ? 'Total Floors: ' + updatedProperty.totalfloors + '. ' : ''}${updatedProperty.officefloor ? 'Office Floor: ' + updatedProperty.officefloor + '. ' : ''}${updatedProperty.yourfloor ? 'Your Floor: ' + updatedProperty.yourfloor + '. ' : ''}${updatedProperty.cabins ? 'Cabins: ' + updatedProperty.cabins + '. ' : ''}${updatedProperty.washroom ? 'Washroom: ' + updatedProperty.washroom + '. ' : ''}`.replace(/\s+/g, ' ').trim();
        await propertyRepo.save(updatedProperty);
      }
      
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
      const propertyImages = imageKeys
        .filter(imgData => imgData.imageKey)
        .map(imgData => {
          const propertyImage = new PropertyImages();
          propertyImage.imageKey = imgData.imageKey;
          propertyImage.imgClassifications = imgData.imgClassifications;
          propertyImage.accurencyPercent = imgData.accurencyPercent;
          propertyImage.property = savedProperty;
          return propertyImage;
        });

      if (propertyImages.length > 0) {
        await propertyImagesRepo.save(propertyImages);
      }
    }

    // Generate title and description for new property
    try {
      const { title, description } = await PropertyTitleAndDescription.generate(savedProperty);
      if (title && description) {
        savedProperty.title = title;
        savedProperty.description = description;
        await propertyRepo.save(savedProperty);
      }
    } catch (error) {
      console.error('Error generating title and description:', error);
      // Generate detailed fallback title and description if ML generation fails
      savedProperty.title = `${savedProperty.category} ${savedProperty.subCategory} for ${savedProperty.isSale ? 'Sale' : 'Rent'} in ${savedProperty.address?.locality || ''}, ${savedProperty.address?.city || ''} - ${savedProperty.bhks || ''} BHK, ${savedProperty.carpetArea || savedProperty.buildupArea || ''} sqft, ₹${savedProperty.propertyPrice || ''}${savedProperty.furnishing ? ', ' + savedProperty.furnishing : ''}${savedProperty.projectName ? ', ' + savedProperty.projectName : ''}`.replace(/\s+/g, ' ').trim();
      savedProperty.description = `Discover a ${savedProperty.bhks || ''} BHK ${savedProperty.furnishing ? savedProperty.furnishing + ' ' : ''}${savedProperty.subCategory.toLowerCase()}${savedProperty.projectName ? ' in project ' + savedProperty.projectName : ''} located at ${savedProperty.address?.locality || ''}, ${savedProperty.address?.city || ''}, ${savedProperty.address?.state || ''}. ${savedProperty.propertyFacing ? 'Facing: ' + savedProperty.propertyFacing + '. ' : ''}${savedProperty.ageOfTheProperty ? 'Age: ' + savedProperty.ageOfTheProperty + '. ' : ''}${savedProperty.carpetArea ? 'Carpet Area: ' + savedProperty.carpetArea + ' sqft. ' : ''}${savedProperty.buildupArea ? 'Buildup Area: ' + savedProperty.buildupArea + ' sqft. ' : ''}${savedProperty.propertyPrice ? 'Price: ₹' + savedProperty.propertyPrice + '. ' : ''}${savedProperty.totalBathrooms ? 'Bathrooms: ' + savedProperty.totalBathrooms + '. ' : ''}${savedProperty.totalRooms ? 'Rooms: ' + savedProperty.totalRooms + '. ' : ''}${savedProperty.addFurnishing && savedProperty.addFurnishing.length ? 'Additional Furnishing: ' + savedProperty.addFurnishing.join(', ') + '. ' : ''}${savedProperty.amenities && savedProperty.amenities.length ? 'Amenities: ' + savedProperty.amenities.join(', ') + '. ' : ''}${savedProperty.constructionStatus ? 'Construction Status: ' + savedProperty.constructionStatus + '. ' : ''}${savedProperty.reraApproved ? 'RERA Approved. ' : ''}${savedProperty.viewFromProperty && savedProperty.viewFromProperty.length ? 'View: ' + savedProperty.viewFromProperty.join(', ') + '. ' : ''}${savedProperty.parking ? 'Parking: ' + savedProperty.parking + '. ' : ''}${savedProperty.availablefor ? 'Available for: ' + savedProperty.availablefor + '. ' : ''}${savedProperty.unit ? 'Unit: ' + savedProperty.unit + '. ' : ''}${savedProperty.soilType ? 'Soil Type: ' + savedProperty.soilType + '. ' : ''}${savedProperty.approachRoad ? 'Approach Road: ' + savedProperty.approachRoad + '. ' : ''}${savedProperty.totalfloors ? 'Total Floors: ' + savedProperty.totalfloors + '. ' : ''}${savedProperty.officefloor ? 'Office Floor: ' + savedProperty.officefloor + '. ' : ''}${savedProperty.yourfloor ? 'Your Floor: ' + savedProperty.yourfloor + '. ' : ''}${savedProperty.cabins ? 'Cabins: ' + savedProperty.cabins + '. ' : ''}${savedProperty.washroom ? 'Washroom: ' + savedProperty.washroom + '. ' : ''}`.replace(/\s+/g, ' ').trim();
      await propertyRepo.save(savedProperty);
    }

    // Fetch the new property with all relations
    const propertyWithRelations = await propertyRepo.findOne({
      where: { id: savedProperty.id },
      relations: ['address', 'propertyImages'],
    });
    if (propertyWithRelations && propertyWithRelations.userId) {
      generateNotification(
        propertyWithRelations.userId,
        `Your ${savedProperty.propertyName ? 'property' : 'project'} ${savedProperty.propertyName || savedProperty.projectName} has been successfully published on our platform`,
        propertyWithRelations.propertyImages?.[0]?.imageKey,
        'property',
        user.fullName,
        'View Property',
        {
          title: savedProperty.title,
          price: propertyWithRelations.propertyPrice ? `₹${propertyWithRelations.propertyPrice}` : '',
          location: savedProperty.address?.locality || '',
          image: propertyWithRelations.propertyImages?.[0]?.imageKey || ''
        },
        'Published'
      );
    }
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