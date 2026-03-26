import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Correlates logs and error responses; echoed as X-Request-Id */
      requestId?: string;
    }
  }
}

export {};
