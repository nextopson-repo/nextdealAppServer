import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { AppDataSource } from '@/server';
import { UserAuth } from '@/api/entity/UserAuth';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';
import { validateOTPRequest } from '@/common/middleware/otpMiddleware';
import { sendEmailOTP } from '@/common/utils/mailService';
import { sendMobileOTP } from '@/common/utils/mobileMsgService';

// Validation schema for resend OTP request
const resendOtpSchema = z.object({
  body: z.object({
    // userId: z.string().uuid('Invalid user ID'),
    // otpType: z.enum(['email', 'mobile'], {
    //   errorMap: () => ({ message: 'Invalid OTP type' }),
    // }),
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

    // Generate new mobile OTP
    user.generateMobileOTP();
    await userLoginRepository.save(user);

    // Send OTP via SMS using Twilio
    const smsResponse = await sendMobileOTP(user.mobileNumber!, user.mobileOTP!);
    
    if (smsResponse.statusCode !== StatusCodes.OK) {
      handleServiceResponse(smsResponse, res);
      return;
    }

    // Clear OTP from response for security
    user.mobileOTP = null;

    // Commit transaction
    await queryRunner.commitTransaction();

    // Return success response
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Success,
        'Mobile OTP resent successfully',
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
  } catch (error) {
    // Rollback transaction on error
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // Release query runner
    await queryRunner.release();
  }
};

