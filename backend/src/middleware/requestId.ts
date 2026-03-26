import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assigns a stable request ID for logging and client support correlation.
 * Honors incoming X-Request-Id when present and valid (simple alphanumeric + hyphen).
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const fromHeader =
    typeof incoming === 'string' && /^[a-zA-Z0-9-]{8,128}$/.test(incoming) ? incoming : undefined;
  const id = fromHeader ?? randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
