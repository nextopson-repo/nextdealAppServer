import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { UserAuth } from '@/api/entity/UserAuth';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { env } from '@/common/utils/envConfig';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
import { AppDataSource } from '@/server';

// Validation schema for signup request
const signupSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
    email: z.string().email('Invalid email address'),
    userType: z.enum(['Agent', 'Owner', 'EndUser', 'Investor'], {
      errorMap: () => ({ message: 'Invalid user type' }),
    }),
  }),
});

// Validation schema for OTP verification
const verifyOTPSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID'),
    otpType: z.enum(['email', 'mobile'], {
      errorMap: () => ({ message: 'Invalid OTP type' }),
    }),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

// Error handling wrapper
export const withErrorHandling = (handler: (req: Request, res: Response) => Promise<void>) => {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Error in handler:', error);
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'An error occurred while processing your request',
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        ),
        res
      );
    }
  };
};

// Signup handler
const signupHandler = async (req: Request, res: Response): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Validate request body
    const validationResult = signupSchema.safeParse({ body: req.body });
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((err) => err.message).join(', ');
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.BAD_REQUEST),
        res
      );
      return;
    }

    const { fullName, mobileNumber, email, userType } = req.body;

    // Check if user already exists
    const userLoginRepository = queryRunner.manager.getRepository(UserAuth);
    const existingUser = await userLoginRepository.findOne({
      where: [{ mobileNumber }, { email }],
    });

    if (existingUser) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'User with this mobile number or email already exists',
          null,
          StatusCodes.CONFLICT
        ),
        res
      );
      return;
    }

    // Create new user
    const newUser = userLoginRepository.create({
      fullName,
      mobileNumber,
      email,
      userType,
      createdBy: 'system',
      updatedBy: 'system',
    });

    // Generate OTPs
    newUser.generateEmailOTP();
    newUser.generateMobileOTP();

    // Save user
    const savedUser = await userLoginRepository.save(newUser);

    // In a real application, you would send the OTPs via email and SMS here
    // For now, we'll just return them in the response for testing purposes
    const emailOTP = newUser.emailOTP;
    const mobileOTP = newUser.mobileOTP;

    // Clear OTPs from response for security
    newUser.emailOTP = null;
    newUser.mobileOTP = null;

    // Commit transaction
    await queryRunner.commitTransaction();

    // Return success response with user ID and OTPs
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Success,
        'User registered successfully. Please verify your email and mobile number.',
        {
          user: {
            id: savedUser.id,
            fullName: savedUser.fullName,
            email: savedUser.email,
            userType: savedUser.userType,
          },
          // In production, these would be sent via email/SMS, not returned in the response
          emailOTP,
          mobileOTP,
        },
        StatusCodes.CREATED
      ),
      res
    );
  } catch (error) {
    // Rollback transaction on error
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // Release query runner
    await queryRunner.release();
  }
};

// OTP verification handler
const verifyOTPHandler = async (req: Request, res: Response): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Validate request body
    const validationResult = verifyOTPSchema.safeParse({ body: req.body });
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((err) => err.message).join(', ');
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.BAD_REQUEST),
        res
      );
      return;
    }

    const { userId, otpType, otp } = req.body;

    // Find user
    const userLoginRepository = queryRunner.manager.getRepository(UserAuth);
    const user = await userLoginRepository.findOne({ where: { id: userId } });

    if (!user) {
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND),
        res
      );
      return;
    }

    // Verify OTP based on type
    let isVerified = false;
    if (otpType === 'email') {
      isVerified = user.verifyEmailOTP(otp);
    } else if (otpType === 'mobile') {
      isVerified = user.verifyMobileOTP(otp);
    }

    if (!isVerified) {
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, 'Invalid OTP', null, StatusCodes.BAD_REQUEST),
        res
      );
      return;
    }

    // Save updated user
    await userLoginRepository.save(user);

    // Check if user is fully verified
    const isFullyVerified = user.isFullyVerified();

    // Generate JWT token if fully verified
    let token = null;
    if (isFullyVerified) {
      token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          userType: user.userType,
        },
        env.ACCESS_SECRET_KEY,
        { expiresIn: '1d' }
      );
    }

    // Commit transaction
    await queryRunner.commitTransaction();

    // Return success response
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Success,
        isFullyVerified
          ? 'User verified successfully'
          : `${otpType} verified successfully. Please verify your ${otpType === 'email' ? 'mobile number' : 'email'}.`,
        {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            userType: user.userType,
            isEmailVerified: user.isEmailVerified,
            isMobileVerified: user.isMobileVerified,
          },
          isFullyVerified,
          token,
        },
        StatusCodes.OK
      ),
      res
    );
  } catch (error) {
    // Rollback transaction on error
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // Release query runner
    await queryRunner.release();
  }
};

// Export handlers with error handling
export const signup = withErrorHandling(signupHandler);
export const VerifyOTP = withErrorHandling(verifyOTPHandler);
