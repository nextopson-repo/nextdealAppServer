import express from 'express';
import { authenticate } from '../../middlewares/auth/Authenticate';
import { generateUploadUrl, getDocumentFromBucket, deleteObjectFromBucket } from '@/api/controllers/s3/awsControllers';
import rateLimiter from '@/common/middleware/rateLimiter';

const Router = express.Router();

// Apply rate limiting to auth routes
Router.use(rateLimiter);

// Public routes
Router.post('/imgtokey', generateUploadUrl);
Router.post('/keytoimg', getDocumentFromBucket);

// Protected routes
Router.use(authenticate); // Apply authentication middleware to all routes below
Router.post('/delete', deleteObjectFromBucket);

export default Router;
