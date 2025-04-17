import express from 'express';

import rateLimiter from '@/common/middleware/rateLimiter';

import {  login, signup, VerifyOTP } from '../../controllers/auth/signup';
import { resendEmailOtp, resendMobileOtp } from '../../controllers/auth/resendOtp';
import { authenticate } from '../../middlewares/auth/Authenticate';
import { validateOTPRequest, validateOTP } from '@/common/middleware/otpMiddleware';
import {
  sanitizeInput,
  detectSuspiciousActivity,
  trackLoginAttempts,
  trackOTPAttempts,
  checkAccountLockout,
} from '@/common/middleware/securityMiddleware';

const Router = express.Router();

// Apply rate limiting to auth routes
Router.use(rateLimiter);

// Public routes with security middleware
Router.post('/signup', 
  // sanitizeInput,
  // detectSuspiciousActivity,
  // checkAccountLockout,
  signup
);

Router.post('/verify-otp',
  // sanitizeInput,
  // detectSuspiciousActivity,
  // trackOTPAttempts,
  // validateOTP,
  VerifyOTP
);

Router.post('/resend-email-otp',
  // sanitizeInput,
  // detectSuspiciousActivity,
  // trackOTPAttempts,
  // validateOTPRequest,
  resendEmailOtp
);

Router.post('/resend-mobile-otp',
  // sanitizeInput,
  // detectSuspiciousActivity,
  // trackOTPAttempts,
  // validateOTPRequest,
  resendMobileOtp
);

Router.post('/login',
  // sanitizeInput,
  // detectSuspiciousActivity,
  // trackLoginAttempts,
  // checkAccountLockout,
  login
);

// Protected routes
Router.use(authenticate); // Apply authentication middleware to all routes below

export default Router;
