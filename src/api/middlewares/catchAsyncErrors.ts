import { Request, Response, NextFunction } from 'express';
const catchAsyncErrors = (asyncFunc: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(asyncFunc(req, res, next)).catch(next);
};

export default catchAsyncErrors;
