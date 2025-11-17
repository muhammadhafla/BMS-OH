import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found`) as CustomError;
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  // const message = error.message || 'Internal Server Error';

  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Prisma error handling
  if (error.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      success: false,
      error: 'Database error occurred',
      message: getPrismaErrorMessage(error.message),
    });
    return;
  }

  // Validation error handling
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Invalid input data',
      details: error.message,
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : error.message,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

const getPrismaErrorMessage = (errorMessage: string): string => {
  if (errorMessage.includes('Unique constraint')) {
    return 'Data already exists';
  }
  if (errorMessage.includes('Foreign key constraint')) {
    return 'Related data not found';
  }
  if (errorMessage.includes('Not null constraint')) {
    return 'Required field is missing';
  }
  return 'Database operation failed';
};