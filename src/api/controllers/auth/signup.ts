import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { UserAuth } from '@/api/entity/UserAuth';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { env } from '@/common/utils/envConfig';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
import { sendEmailNotification, sendEmailOTP } from '@/common/utils/mailService';
import { sendMobileOTP } from '@/common/utils/mobileMsgService';
import { AppDataSource } from '@/server';
import { generateNotification } from '../notification/NotificationController';
import { NotificationType } from '@/api/entity/Notifications';

const loginSchema = z.object({
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
  checkBox: z.boolean().optional(),
});
const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate the request body
    const validatedData = loginSchema.parse(req.body);
    const { mobileNumber, checkBox } = validatedData;
    
    if (!checkBox) {
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, 'Please accept terms and conditions', null, StatusCodes.BAD_REQUEST),
        res
      );
      return;
    }

    const userRepo = AppDataSource.getRepository(UserAuth);
    const user = await userRepo.findOne({ where: { mobileNumber } });

    // Case 1: New user
    if (!user) {
      const newUser = new UserAuth();
      newUser.mobileNumber = mobileNumber;
      newUser.generateMobileOTP();
      const savedUser = await userRepo.save(newUser);
      
      try {
        // Send OTP to mobile number
        const otpResponse = await sendMobileOTP(mobileNumber, savedUser.mobileOTP!);
        
        if (otpResponse.statusCode !== StatusCodes.OK) {
          handleServiceResponse(
            new ServiceResponse(
              ResponseStatus.Failed,
              'Failed to send OTP. Please try again.',
              {
                user: {
                  id: savedUser.id,
                  isExistingUser: false,
                  isFullyVerified: false
                }
              },
              StatusCodes.OK
            ),
            res
          );
          return;
        }

        handleServiceResponse(
          new ServiceResponse(
            ResponseStatus.Success,
            'New user. Please verify OTP and complete signup.',
            {
              user: {
                id: savedUser.id,
                isExistingUser: false,
                isFullyVerified: false
              }
            },
            StatusCodes.OK
          ),
          res
        );
      } catch (otpError) {
        console.error('Error sending OTP:', otpError);
        handleServiceResponse(
          new ServiceResponse(
            ResponseStatus.Failed,
            'Failed to send OTP. Please try again.',
            {
              user: {
                id: savedUser.id,
                isExistingUser: false,
                isFullyVerified: false
              }
            },
            StatusCodes.OK
          ),
          res
        );
      }
      return;
    }

    // Case 2: Existing user - Generate and send new OTP
    try {
      user.generateMobileOTP();
      await userRepo.save(user);

      const otpResponse = await sendMobileOTP(mobileNumber, user.mobileOTP!);
      
      if (otpResponse.statusCode !== StatusCodes.OK) {
        handleServiceResponse(
          new ServiceResponse(
            ResponseStatus.Failed,
            'Failed to send OTP. Please try again.',
            {
              user: {
                id: user.id,
                isExistingUser: true,
                isFullyVerified: user.isFullyVerified()
              }
            },
            StatusCodes.OK
          ),
          res
        );
        return;
      }

      // Case 3: Not fully verified user
      if (!user.isFullyVerified()) {
        handleServiceResponse(
          new ServiceResponse(
            ResponseStatus.Success,
            'User not fully verified. Please complete verification.',
            {
              user: {
                id: user.id,
                isExistingUser: true,
                isFullyVerified: false
              }
            },
            StatusCodes.OK
          ),
          res
        );
        return;
      }

      // Case 4: Fully verified existing user
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Success,
          'OTP sent successfully',
          {
            user: {
              id: user.id,
              isExistingUser: true,
              isFullyVerified: true
            }
          },
          StatusCodes.OK
        ),
        res
      );
    } catch (otpError) {
      console.error('Error sending OTP:', otpError);
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Failed to send OTP. Please try again.',
          {
            user: {
              id: user.id,
              isExistingUser: true,
              isFullyVerified: user.isFullyVerified()
            }
          },
          StatusCodes.OK
        ),
        res
      );
    }

  } catch (error) {
    console.error('Login Error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Invalid mobile number format',
          null,
          StatusCodes.BAD_REQUEST
        ),
        res
      );
      return;
    }

    // Handle other errors
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Failed,
        'Something went wrong. Please try again later.',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      ),
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
    WorkingWithAgent: z.boolean().optional(),
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

    const { fullName, mobileNumber, email, userType, WorkingWithAgent } = req.body;

    // Check if user already exists - check both mobile and email separately
    const userLoginRepository = queryRunner.manager.getRepository(UserAuth);
    
    // Check for existing user with same mobile number
    const existingUserByMobile = await userLoginRepository.findOne({
      where: { mobileNumber }
    });
    
    // Check for existing user with same email
    const existingUserByEmail = await userLoginRepository.findOne({
      where: { email }
    });

    // If there's a verified user with either the same mobile or email, reject
    if (existingUserByMobile?.isFullyVerified() || existingUserByEmail?.isFullyVerified()) {
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

    // If there are different unverified users with the same mobile and email, reject
    if (existingUserByMobile && existingUserByEmail && existingUserByMobile.id !== existingUserByEmail.id) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Mobile number and email are already associated with different accounts',
          null,
          StatusCodes.CONFLICT
        ),
        res
      );
      return;
    }

    let userToSave: UserAuth;
    
    // Determine which existing user to update (if any)
    const existingUser = existingUserByMobile || existingUserByEmail;
    
    if (existingUser && !existingUser.isFullyVerified()) {
      // Update existing unverified user
      existingUser.email = email;
      existingUser.userType = userType;
      existingUser.fullName = fullName;
      existingUser.isMobileVerified = true;
      existingUser.WorkingWithAgent = userType === 'Owner' ? WorkingWithAgent : true;
      userToSave = existingUser;
    } else {
      // Create new user
      userToSave = new UserAuth();
      userToSave.fullName = fullName;
      userToSave.mobileNumber = mobileNumber;
      userToSave.email = email;
      userToSave.userType = userType;
      userToSave.WorkingWithAgent = userType === 'Owner' ? WorkingWithAgent : true;
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
    generateNotification(
      savedUser.id,
      `Great news! Your  ${savedUser.userType === "Agent" ? "5" : "1"} property active on Nextdeal is absolutely FREE -list now and connect with serious buyers!`,
      savedUser.userProfileKey || undefined,
      NotificationType.WELCOME,
      savedUser.fullName,
      'Get Started',
      undefined,
      'Welcome'
    );
    sendEmailNotification(email,`Great news! ${savedUser.fullName} welcome to Nextdeal`,  `Great news! Your  ${savedUser.userType==="Agent"? "5" : "1"} property active on Nextdeal is absolutely FREE -list now and connect with serious buyers!`);
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
            profilePhoto: user.userProfileKey,

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
