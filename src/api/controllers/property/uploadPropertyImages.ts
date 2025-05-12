import { PropertyImages } from '@/api/entity/PropertyImages';
import imageClassificationService from '@/api/imageClassification/imageClassificationService';
import nsfwDetectionService from '@/api/nsfw/nsfwDetectionService';
import { AppDataSource } from '@/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// AWS Configuration with retry logic
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  region: process.env.AWS_REGION,
  maxAttempts: 3,
  retryMode: 'standard',
  requestHandler: {
    timeout: 5000
  }
});

// Validate AWS configuration
function validateAWSConfig() {
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
  }
}

// Retry function for AWS operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

// Generate unique key using timestamp and random number
function generateUniqueKey(originalname: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${timestamp}-${random}-${originalname}`;
}

export const uploadPropertyImagesController = async (req: Request, res: Response) => {
  try {
    validateAWSConfig();
    
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

    // Upload to S3 with retry logic
    console.log('Uploading to S3...');
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    });

    await retryOperation(() => s3.send(command));
    console.log('S3 upload successful');

    // Generate the public URL
    const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // If classification is requested
    if (forClassify === 'true') {
      console.log('Classifying image...');
      const classificationResult = await imageClassificationService.classifyImage(imageBuffer);
      console.log('Classification result:', classificationResult);

      return res.status(200).json({
        status: 'success',
        message: 'Image uploaded and classified successfully',
        data: {
          url,
          key,
          imgClassifications: classificationResult.classification,
          accurencyPercent: classificationResult.confidence.toString(),
        },
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: {
        url,
        key,
      },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};
