import { Request } from 'express';
import { UserAuth } from '@/api/entity/UserAuth';

// Extend the Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
        email: string;
        mobileNumber: string;
        isAdmin?: boolean;
      };
    }
  }
}

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

// Property search request type
export interface PropertySearchRequest extends Request {
  body: {
    category?: string;
    subCategory?: string;
    city?: string;
    locality?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    bhks?: number;
    furnishing?: string;
    constructionStatus?: string;
    propertyFacing?: string;
    reraApproved?: boolean;
    amenities?: string[];
    page?: number;
    limit?: number;
  };
  user?: {
    id: string;
    userType: 'Agent' | 'Owner' | 'EndUser' | 'Investor';
    email: string;
    mobileNumber: string;
    isAdmin?: boolean;
  };
} 