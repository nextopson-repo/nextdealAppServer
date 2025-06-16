
import { Request, Response } from 'express';

export interface UserKyc extends Request {
  body: {
    serial: number;
    userId: string;
    fullname: string;
    email: string;
    mobileNumber: string;
    reraId: string;
    status: 'pending' | 'verified' | 'not_verified';
    reason?: string;
  };
}

export type UserKycResponseType = {
  id: string;
  userId: string;
  fullname: string;
  email: string;
  mobileNumber: string;
  reraId: string;
  status: 'pending' | 'verified' | 'not_verified';
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
};

//reraverification


 










