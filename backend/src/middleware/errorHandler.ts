import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

function logError(req: Request, err: Error) {
  const payload = {
    level: 'error' as const,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    message: err.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };
  console.error(JSON.stringify(payload));
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(req.requestId && { requestId: req.requestId }),
    });
  }

  logError(req, err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(req.requestId && { requestId: req.requestId }),
  });
};

