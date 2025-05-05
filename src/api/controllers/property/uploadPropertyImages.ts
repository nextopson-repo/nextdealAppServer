import { Property } from '@/api/entity/Property';
import { PropertyImages } from '@/api/entity/PropertyImages';
import imageClassificationService from '@/api/imageClassification/imageClassificationService';
import nsfwDetectionService from '@/api/nsfw/nsfwDetectionService';
import { AppDataSource } from '@/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Define types for better type safety
interface GenerateUploadUrlRequest {
  key: string;
  contentType: string;
  expDate?: number; // Optional, we'll provide a default
  propertyId: string;
  forClassify?: boolean;
}

interface GenerateUploadUrlResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    url: string;
    key: string;
    imgClassifications?: string;
    accurencyPercent?: string;
    expiresIn: number;
  };
}

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  region: process.env.AWS_REGION,
}); 

const DEFAULT_EXPIRATION = 3600; 

const generateUrlForUploading = async (bucketName: string, key: string, expDate: number, type: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: type,
  });

  return getSignedUrl(s3, command, { expiresIn: expDate });
};

export const uploadPropertyImages = upload.single('image');

export const uploadPropertyImagesController = async (req: Request, res: Response<GenerateUploadUrlResponse>) => {
  try {
    // Check if file exists in the request
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error',
        message: 'No file uploaded.',
      });
    }

    const { key, contentType, expDate = DEFAULT_EXPIRATION, propertyId, forClassify } = req.body as GenerateUploadUrlRequest;
    const bucketName = process.env.AWS_S3_BUCKET;
    const imageBuffer = req.file.buffer;

    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    const propertyRepo = AppDataSource.getRepository(Property)
    const property = await propertyRepo.findOne({ where: { id: propertyId } })
    if (!property) {
      return res.status(400).json({
        status: 'error',
        message: 'Property not found',
      });
    }

    if (!key || !contentType) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide key and contentType.',
      });
    }

    // Validate content type
    if (!contentType.match(/^[a-zA-Z]+\/[a-zA-Z0-9\-\+\.]+$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid content type format',
      });
    }

    // Check NSFW content first
    const nsfwResult = await nsfwDetectionService.predict(imageBuffer);
    if (nsfwResult.isAdult) {
      return res.status(400).json({
        status: 'error',
        message: 'Image contains inappropriate content and cannot be uploaded',
      });
    }

    const propertyImageRepo = AppDataSource.getRepository(PropertyImages)

    // Generate upload URL
    const url = await generateUrlForUploading(bucketName, key, expDate, contentType);

    // Classify the image
    const classificationResult = await imageClassificationService.predictRoom(imageBuffer);

    // Save the image to the database
    const propertyImage = new PropertyImages();
    propertyImage.presignedUrl = url;
    propertyImage.imageKey = key;
    propertyImage.propertyId = propertyId;
    if (forClassify) {
      propertyImage.imgClassifications = classificationResult.label;
      propertyImage.accurencyPercent = Number(classificationResult.confidence);
    }
    const image = await propertyImageRepo.save(propertyImage);

    return res.status(200).json({
      status: 'success',
      message: 'Image processed successfully',
      data: {
        url,
        key,
        imgClassifications: image.imgClassifications,
        accurencyPercent: image.accurencyPercent.toString(),
        expiresIn: expDate
      },
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};
