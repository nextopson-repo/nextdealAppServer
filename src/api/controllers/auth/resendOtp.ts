import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { UserAuth } from '@/api/entity/UserAuth';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
import { validateOTPRequest } from '@/common/middleware/otpMiddleware';
import { sendEmailOTP } from '@/common/utils/mailService';
import { sendMobileOTP } from '@/common/utils/mobileMsgService';
import { AppDataSource } from '@/server';

// Validation schema for resend OTP request
const resendOtpSchema = z.object({
  body: z.object({
    mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
  }),
});

export const resendEmailOtp = async (req: Request, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Validate request body
    const validationResult = resendOtpSchema.safeParse({ body: req.body });
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((err) => err.message).join(', ');
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.BAD_REQUEST),
        res
      );
      return;
    }

    const { userId } = req.body;

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

    // Generate new email OTP
    user.generateEmailOTP();
    await userLoginRepository.save(user);

    // Send OTP via email
    await sendEmailOTP(user.email, user.emailOTP!);

    // Clear OTP from response for security
    user.emailOTP = null;

    // Commit transaction
    await queryRunner.commitTransaction();

    // Return success response
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Success,
        'Email OTP resent successfully',
        {
          user: {
            id: user.id,
            email: user.email,
          },
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

export const resendMobileOtp = async (req: Request, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Validate request body
    const validationResult = resendOtpSchema.safeParse({ body: req.body });
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((err) => err.message).join(', ');
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.BAD_REQUEST),
        res
      );
      return;
    }

    const { mobileNumber } = req.body;

    // Find user by mobile number
    const userLoginRepository = queryRunner.manager.getRepository(UserAuth);
    const user = await userLoginRepository.findOne({ where: { mobileNumber } });

    if (!user) {
      handleServiceResponse(
        new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND),
        res
      );
      return;
    }

    // Generate new mobile OTP
    user.generateMobileOTP();
    await userLoginRepository.save(user);

    // Send OTP via SMS using DVHosting
    const smsResponse = await sendMobileOTP(user.mobileNumber!, user.mobileOTP!);
    
    // Check if SMS sending was successful
    if (smsResponse.statusCode === 200) {
      // Clear OTP from response for security
      user.mobileOTP = null;

      // Commit transaction
      await queryRunner.commitTransaction();

      // Return success response
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Success,
          'OTP sent successfully',
          {
            user: {
              id: user.id,
              mobileNumber: user.mobileNumber,
            },
          },
          StatusCodes.OK
        ),
        res
      );
    } else {
      // Rollback transaction if SMS sending fails
      await queryRunner.rollbackTransaction();
      handleServiceResponse(smsResponse, res);
    }
  } catch (error) {
    // Rollback transaction on error
    await queryRunner.rollbackTransaction();
    console.error('Error in resendMobileOtp:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Invalid mobile number format')) {
        handleServiceResponse(
          new ServiceResponse(
            ResponseStatus.Failed,
            'Invalid mobile number format',
            null,
            StatusCodes.BAD_REQUEST
          ),
          res
        );
      } else {
        handleServiceResponse(
          new ServiceResponse(
            ResponseStatus.Failed,
            'Failed to send OTP. Please try again.',
            null,
            StatusCodes.INTERNAL_SERVER_ERROR
          ),
          res
        );
      }
    } else {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'An unexpected error occurred',
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        ),
        res
      );
    }
  } finally {
    // Release query runner
    await queryRunner.release();
  }
};

