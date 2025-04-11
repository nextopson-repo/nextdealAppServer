import express from 'express';

import rateLimiter from '@/common/middleware/rateLimiter';

import { signup, VerifyOTP } from '../../controllers/auth/signup';
import { authenticate } from '../../middlewares/auth/Authenticate';

const Router = express.Router();

// Apply rate limiting to auth routes
Router.use(rateLimiter);

// Public routes
Router.post('/signup', signup);
Router.post('/verify-otp', VerifyOTP);

// Protected routes
Router.use(authenticate); // Apply authentication middleware to all routes below

export default Router;
