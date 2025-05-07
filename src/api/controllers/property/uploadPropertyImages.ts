import { PropertyImages } from '@/api/entity/PropertyImages';
import imageClassificationService from '@/api/imageClassification/imageClassificationService';
import nsfwDetectionService from '@/api/nsfw/nsfwDetectionService';
import { AppDataSource } from '@/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Define types for better type safety
interface UploadResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    url: string;
    key: string;
    imgClassifications?: string;
    accurencyPercent?: string;
  };
}

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  region: process.env.AWS_REGION,
});

// Generate unique key using timestamp and random number
function generateUniqueKey(originalname: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${timestamp}-${random}-${originalname}`;
}

export const uploadPropertyImagesController = async (req: Request, res: Response<UploadResponse>) => {
  try {
    console.log('Received upload request:', {
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    // Check if file exists in the request
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ 
        status: 'error',
        message: 'No file uploaded.',
      });
    }

    const { propertyId, forClassify } = req.body;
    const bucketName = process.env.AWS_S3_BUCKET;
    const imageBuffer = req.file.buffer;
    const contentType = req.file.mimetype;

    console.log('Processing upload:', {
      propertyId,
      forClassify,
      bucketName,
      contentType
    });

    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    // Generate a unique key for the S3 object using timestamp and random number
    const key = `property-images/${propertyId || 'temp'}/${generateUniqueKey(req.file.originalname)}`;
    console.log('Generated S3 key:', key);

    // Check NSFW content first
    console.log('Checking NSFW content...');
    const nsfwResult = await nsfwDetectionService.predict(imageBuffer);
    console.log('NSFW check result:', nsfwResult);
    
    if (nsfwResult.isAdult) {
      return res.status(400).json({
        status: 'error',
        message: 'Image contains inappropriate content and cannot be uploaded',
      });
    }

    // Upload to S3
    console.log('Uploading to S3...');
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    });

    await s3.send(command);
    console.log('S3 upload successful');

    // Generate the public URL
    const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log('Generated public URL:', url);

    // Classify the image if requested
    let classificationResult = null;
    if (forClassify === 'true') {
      console.log('Classifying image...');
      classificationResult = await imageClassificationService.predictRoom(imageBuffer);
      console.log('Classification result:', classificationResult);
    }

    // Save the image to the database
    console.log('Saving to database...');
    const propertyImageRepo = AppDataSource.getRepository(PropertyImages);
    const propertyImage = new PropertyImages();
    propertyImage.imageKey = key;
    propertyImage.presignedUrl = url;
    if (classificationResult) {
      propertyImage.imgClassifications = classificationResult.label;
      const confidence = Number(classificationResult.confidence);
      if (!isNaN(confidence)) {
        propertyImage.accurencyPercent = confidence;
      }
    }
    const image = await propertyImageRepo.save(propertyImage);
    console.log('Database save successful:', image);

    return res.status(200).json({
      status: 'success',
      message: 'Image uploaded and processed successfully',
      data: {
        url,
        key,
        imgClassifications: image.imgClassifications,
        accurencyPercent: image.accurencyPercent?.toString(),
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
