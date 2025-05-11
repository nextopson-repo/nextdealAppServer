import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { UserAuth } from '@/api/entity/UserAuth';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { env } from '@/common/utils/envConfig';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
import { sendEmailOTP } from '@/common/utils/mailService';
import { AppDataSource } from '@/server';

const loginSchema = z.object({
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
});
const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate the request body
    const validatedData = loginSchema.parse(req.body);
    const { mobileNumber } = validatedData;
    
    const userRepo = AppDataSource.getRepository(UserAuth);
    const user = await userRepo.findOne({ where: { mobileNumber } });

    if (!user) {
      // Case 2: New user
      const newUser = new UserAuth();
      newUser.mobileNumber = mobileNumber;
      newUser.generateMobileOTP();
      const savedUser = await userRepo.save(newUser);
      
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Success,
          'New user. Please verify OTP and complete signup.',
          {
            user: {
              id: savedUser.id,
              isExistingUser: false,
              isFullyVerified: false,
              mobileOTP: savedUser.mobileOTP
            }
          },
          StatusCodes.OK
        ),
        res
      );
      return;
    }

    // Generate OTP for existing user
    user.generateMobileOTP();
    await userRepo.save(user);

    if (!user.isFullyVerified()) {
      // Case 3: Not fully verified user
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Success,
          'User not fully verified. Please complete verification.',
          {
            user: {
              id: user.id,
              isExistingUser: true,
              isFullyVerified: false,
              mobileOTP: user.mobileOTP
            }
          },
          StatusCodes.OK
        ),
        res
      );
      return;
    }

    // Case 1: Fully verified existing user
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Success,
        'OTP sent successfully',
        {
          user: {
            id: user.id,
            isExistingUser: true,
            isFullyVerified: true,
            mobileOTP: user.mobileOTP
          }
        },
        StatusCodes.OK
      ),
      res
    );

  } catch (error) {
    console.error('Login Error:', error);
    handleServiceResponse(
      new ServiceResponse(ResponseStatus.Failed, 'Something went wrong', null, StatusCodes.INTERNAL_SERVER_ERROR),
      res
    );
  }
};

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
  userId: z.string().min(1, 'User ID is required'),
  otpType: z.enum(['email', 'mobile'], {
    errorMap: () => ({ message: 'Invalid OTP type' }),
  }),
  otp: z.string().min(4, 'OTP must be 4 digits').max(4, 'OTP must be 4 digits'),
});

// Error handling wrapper
const withErrorHandling = (handler: (req: Request, res: Response) => Promise<void>) => {
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
    const verified = existingUser?.isFullyVerified();
    console.log("verified",verified);
    console.log("existingUser",existingUser);

    if (verified) {
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

    let userToSave: UserAuth;
    
    
    if (existingUser && !verified) {
      // Update existing unverified user
      existingUser.email = email;
      existingUser.userType = userType;
      existingUser.fullName = fullName;
      existingUser.isMobileVerified = true;
      userToSave = existingUser;
    } else {
      // Create new user
      userToSave = new UserAuth();
      userToSave.fullName = fullName;
      userToSave.mobileNumber = mobileNumber;
      userToSave.email = email;
      userToSave.userType = userType;
    }

    // Generate OTPs
    userToSave.generateEmailOTP();
    userToSave.generateMobileOTP();
    userToSave.isMobileVerified=true;
    userToSave.isEmailVerified=true;
    

    // Save user
    const savedUser = await userLoginRepository.save(userToSave);

    // Send email OTP
    if (savedUser.emailOTP) {
      try {
        await sendEmailOTP(email, savedUser.emailOTP);
      } catch (emailError) {
        console.error('Failed to send email OTP:', emailError);
        // Continue with the signup process even if email fails
      }
    }

    // Get mobile OTP for response
    const mobileOTP = savedUser.mobileOTP;

    // future Clear OTPs from user object for security
    // savedUser.emailOTP = null;
    // savedUser.mobileOTP = null;
    await userLoginRepository.save(savedUser);

    // Commit transaction
    await queryRunner.commitTransaction();

    // Return success response with user ID and mobile OTP only
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Success,
        'User registered successfully. Please verify your email',
        {
          user: {
            id: savedUser.id,
            fullName: savedUser.fullName,
            email: savedUser.email,
            userType: savedUser.userType,
            isEmailVerified: savedUser.isEmailVerified,
            isMobileVerified: savedUser.isMobileVerified,
          },
          mobileOTP,
        },
        StatusCodes.CREATED
      ),
      res
    );
  } catch (error) {
    // Rollback transaction on error
    await queryRunner.rollbackTransaction();
    console.error('Signup Error:', error);
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Failed,
        'Failed to complete signup process',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      ),
      res
    );
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
    console.log('Received OTP verification request:', req.body);
    
    // Validate request body
    const validationResult = verifyOTPSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
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

    if(otpType==="email"){
      user.isEmailVerified=true;
    }else{
      user.isMobileVerified=true;
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
export const login = withErrorHandling(loginHandler);
