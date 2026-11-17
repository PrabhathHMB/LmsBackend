import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.utils';
import { Prisma } from '@prisma/client';
import { ENV } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors;

  // Handle Prisma Unique Constraint Violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = (err.meta?.target as string[]) || [];
      message = `A record with this ${target.join(', ') || 'field'} already exists.`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found in the database.';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'Foreign key constraint failed on the related model.';
    }
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
