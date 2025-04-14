import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'You are not logged in' });
  }

  const accessToken = authHeader.split(' ')[1];

  jwt.verify(accessToken, process.env.ACCESS_SECRET_KEY || '', (err: jwt.VerifyErrors | null, payload: any) => {
    if (err) {
      return res.status(403).json({ status: 'error', message: 'Need to login again' });
    }

    console.log('authentication payload: ', payload);
    next();
  });
};
