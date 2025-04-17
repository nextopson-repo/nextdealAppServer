import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ServiceResponse, ResponseStatus } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
import { AppDataSource } from '@/server';
import { UserAuth } from '@/api/entity';
import { z } from 'zod';

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_ATTEMPTS = 3;
const OTP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Track failed attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Input sanitization schema
const sanitizeInputSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  mobileNumber: z.string().trim().regex(/^[0-9]{10}$/),
  fullName: z.string().trim().min(2).max(100),
  otp: z.string().trim().regex(/^[0-9]{6}$/),
  password: z.string().min(8).max(100),
});

// Validate and sanitize input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    const sanitizedData = sanitizeInputSchema.parse(req.body);
    req.body = sanitizedData;
    next();
  } catch (error) {
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Failed,
        'Invalid input data',
        null,
        StatusCodes.BAD_REQUEST
      ),
      res
    );
  }
};

// Check for suspicious patterns
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  const now = Date.now();

  // Check for rapid consecutive requests
  if (failedAttempts.has(ip)) {
    const attempts = failedAttempts.get(ip)!;
    if (now - attempts.lastAttempt < 1000) { // Less than 1 second between attempts
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Too many requests. Please try again later.',
          null,
          StatusCodes.TOO_MANY_REQUESTS
        ),
        res
      );
      return;
    }
  }

  // Check for suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Failed,
        'Invalid request',
        null,
        StatusCodes.BAD_REQUEST
      ),
      res
    );
    return;
  }

  next();
};

// Track failed login attempts
export const trackLoginAttempts = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const now = Date.now();

  if (failedAttempts.has(ip)) {
    const attempts = failedAttempts.get(ip)!;
    if (now - attempts.lastAttempt > LOGIN_WINDOW_MS) {
      failedAttempts.delete(ip);
    } else if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Too many failed attempts. Please try again later.',
          null,
          StatusCodes.TOO_MANY_REQUESTS
        ),
        res
      );
      return;
    }
  }

  next();
};

// Track failed OTP attempts
export const trackOTPAttempts = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.body;
  const now = Date.now();

  if (failedAttempts.has(userId)) {
    const attempts = failedAttempts.get(userId)!;
    if (now - attempts.lastAttempt > OTP_WINDOW_MS) {
      failedAttempts.delete(userId);
    } else if (attempts.count >= MAX_OTP_ATTEMPTS) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Too many failed OTP attempts. Please request a new OTP.',
          null,
          StatusCodes.TOO_MANY_REQUESTS
        ),
        res
      );
      return;
    }
  }

  next();
};

// Check for account lockout
export const checkAccountLockout = async (req: Request, res: Response, next: NextFunction) => {
  const { email, mobileNumber } = req.body;
  
  try {
    const userRepository = AppDataSource.getRepository(UserAuth);
    const user = await userRepository.findOne({
      where: [{ email }, { mobileNumber }],
    });

    if (user && user.isLocked) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Account is temporarily locked. Please try again later.',
          null,
          StatusCodes.FORBIDDEN
        ),
        res
      );
      return;
    }

    next();
  } catch (error) {
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Failed,
        'Error checking account status',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      ),
      res
    );
  }
};

// Update failed attempts
export const updateFailedAttempts = (identifier: string) => {
  const now = Date.now();
  if (failedAttempts.has(identifier)) {
    const attempts = failedAttempts.get(identifier)!;
    attempts.count += 1;
    attempts.lastAttempt = now;
  } else {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
  }
};

// Reset failed attempts
export const resetFailedAttempts = (identifier: string) => {
  failedAttempts.delete(identifier);
}; 