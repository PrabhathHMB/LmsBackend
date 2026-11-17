import { Response } from 'express';

export interface ApiResponseData<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message?: string,
  data?: T,
  meta?: ApiResponseData['meta']
) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    meta,
  });
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200,
  meta?: ApiResponseData['meta']
) => {
  return sendResponse(res, statusCode, true, message, data, meta);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully'
) => {
  return sendResponse(res, 201, true, message, data);
};
