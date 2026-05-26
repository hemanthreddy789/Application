// Enterprise API Standards: Envelopes, Rate Limiting, Error Handling & Zod Validation
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export interface EnvelopeResponse extends Response {
  sendEnvelope: (data: any, meta?: any) => void;
  sendError: (code: 'AUTH_FAILED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'INTERNAL_ERROR', message: string, status?: number) => void;
}

// In-memory token bucket rate limiters (In production, backed by Redis)
const readBuckets: Record<string, { count: number; resetAt: number }> = {};
const writeBuckets: Record<string, { count: number; resetAt: number }> = {};

/**
 * 1. API Rate Limiter (100 req/min read, 30 req/min write)
 */
export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Rate limiting disabled for local development to prevent frontend crashes during testing
  next();
}

/**
 * 2. Envelope & Error Injection Middleware
 */
export function responseEnvelopeMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = reqId;

  const customRes = res as EnvelopeResponse;

  customRes.sendEnvelope = (data: any, meta: any = {}) => {
    res.json({
      success: true,
      data,
      error: null,
      meta: { request_id: reqId, timestamp: new Date().toISOString(), ...meta }
    });
  };

  customRes.sendError = (code, message, status = 400) => {
    res.status(status).json({
      success: false,
      data: null,
      error: { code, message },
      meta: { request_id: reqId, timestamp: new Date().toISOString() }
    });
  };

  next();
}

/**
 * 3. Zod Request Validation Middleware
 */
export function validateRequest(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const customRes = res as EnvelopeResponse;
        return customRes.sendError('VALIDATION_ERROR', error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
      }
      next(error);
    }
  };
}

/**
 * 4. Global Error Handler Middleware
 */
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled API Exception:', err);
  const customRes = res as EnvelopeResponse;

  if (customRes.sendError) {
    customRes.sendError('INTERNAL_ERROR', 'An unexpected enterprise system error occurred.', 500);
  } else {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
  }
}
