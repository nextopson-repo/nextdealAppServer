import { Request, Response, NextFunction } from 'express';
import { UserAuth } from '@/api/entity/UserAuth';
import { AppDataSource } from '@/server';
import { ServiceResponse, ResponseStatus } from '@/common/models/serviceResponse';
import { StatusCodes } from 'http-status-codes';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

// OTP expiration time in minutes
const OTP_EXPIRATION_TIME = 10;

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const validateOTPRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, otpType } = req.body;

    if (!userId || !otpType) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'User ID and OTP type are required',
          null,
          StatusCodes.BAD_REQUEST
        ),
        res
      );
      return;
    }

    const userRepository = AppDataSource.getRepository(UserAuth);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'User not found',
          null,
          StatusCodes.NOT_FOUND
        ),
        res
      );
      return;
    }

    // Check if OTP was recently sent
    const lastOTPSent = user.otpSentAt;
    if (lastOTPSent) {
      const timeSinceLastOTP = (Date.now() - lastOTPSent.getTime()) / (1000 * 60); // in minutes
      if (timeSinceLastOTP < 1) { // 1 minute cooldown
        handleServiceResponse(
          new ServiceResponse(
            ResponseStatus.Failed,
            'Please wait before requesting another OTP',
            null,
            StatusCodes.TOO_MANY_REQUESTS
          ),
          res
        );
        return;
      }
    }

    // Attach user to request for use in the controller
    req.user = user;
    next();
  } catch (error) {
    handleServiceResponse(
      new ServiceResponse(
        ResponseStatus.Failed,
        'Error validating OTP request',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      ),
      res
    );
  }
};

export const validateOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { otp, otpType } = req.body;
    const user = req.user as UserAuth;

    if (!otp || !otpType) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'OTP and OTP type are required',
          null,
          StatusCodes.BAD_REQUEST
        ),
        res
      );
      return;
    }

    const storedOTP = otpType === 'email' ? user.emailOTP : user.mobileOTP;
    const otpSentAt = otpType === 'email' ? user.emailOTPSentAt : user.mobileOTPSentAt;

    if (!storedOTP || !otpSentAt) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'No OTP found or OTP expired',
          null,
          StatusCodes.BAD_REQUEST
        ),
        res
      );
      return;
    }

    // Check if OTP is expired
    const timeSinceOTP = (Date.now() - otpSentAt.getTime()) / (1000 * 60); // in minutes
    if (timeSinceOTP > OTP_EXPIRATION_TIME) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'OTP has expired',
          null,
          StatusCodes.BAD_REQUEST
        ),
        res
      );
      return;
    }

    // Verify OTP
    if (storedOTP !== otp) {
      handleServiceResponse(
        new ServiceResponse(
          ResponseStatus.Failed,
          'Invalid OTP',
          null,
          StatusCodes.BAD_REQUEST
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
        'Error validating OTP',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      ),
      res
    );
  }
}; 