import { PropertyTitleAndDescription } from './TitleAndDiscription';
import { Property } from '@/api/entity/Property';

// Sample training data (add more real examples for better results)
const trainingData = [
  {
    property: {
      category: 'Residential',
      subCategory: 'Apartment',
      propertyName: 'Sunshine Residency',
      projectName: 'Sunshine Residency',
      furnishing: 'Fully Furnished',
      address: { city: 'Bhopal', state: 'MP', locality: 'Arera Colony' } as any,
      amenities: ['Gym', 'Pool', 'Garden'],
      constructionStatus: 'Ready to Move',
      propertyFacing: 'East',
      ageOfTheProperty: '2 years',
      bhks: 3,
      carpetArea: 1500,
      buildupArea: 1700,
      propertyPrice: 6000000,
      totalBathrooms: 2,
      totalRooms: 5,
      addFurnishing: ['Modular Kitchen', 'Wardrobes'],
      isSale: true,
      isSold: false,
      reraApproved: true,
      viewFromProperty: ['Park', 'Pool'],
      parking: 'Covered',
      availablefor: 'Family',
      unit: 'sqft',
      soilType: 'Alluvial',
      approachRoad: 'Main Road',
      totalfloors: '10',
      officefloor: '',
      yourfloor: '3',
      cabins: '',
      washroom: '2',
    } as Property,
    title: 'Beautiful 3BHK Fully Furnished Apartment for Sale in Arera Colony, Bhopal - 1500 sqft, ₹60L',
    description: 'This spacious 3BHK apartment in Sunshine Residency, Arera Colony, Bhopal, is fully furnished and ready to move in. With 1500 sqft carpet area, 2 bathrooms, modern amenities like Gym, Pool, and Garden, east facing, and just 2 years old, it is perfect for families. Covered parking, modular kitchen, wardrobes, and RERA approved. Price: ₹60L.'
  },
  // Add more diverse property examples here for better training
];

(async () => {
  await PropertyTitleAndDescription.trainModel(trainingData);
  console.log('Model trained and saved!');
})(); 