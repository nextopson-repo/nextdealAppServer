import express from 'express';

import rateLimiter from '@/common/middleware/rateLimiter';

<<<<<<< HEAD
import { login, signup, VerifyOTP } from '../../controllers/auth/signup';
=======
import { loginController, signup, VerifyOTP } from '../../controllers/auth/signup';
>>>>>>> 1845c37ed41f7b06c9e608291a9ff8825bfb68ed
import { authenticate } from '../../middlewares/auth/Authenticate';

const Router = express.Router();

// Apply rate limiting to auth routes
Router.use(rateLimiter);

// Public routes
Router.post('/signup', signup);
Router.post('/verify-otp', VerifyOTP);
Router.post("/login", loginController)

// Protected routes
Router.use(authenticate); // Apply authentication middleware to all routes below

export default Router;
