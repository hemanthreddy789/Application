// Enterprise Security Middleware: Auth, RBAC & Tenant Isolation
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
    email: string;
  };
  tenantId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "enterprise_super_secret_jwt_key_2026";

// In-memory brute force tracker (In production, backed by Redis)
const failedAttempts: Record<string, { count: number; lockedUntil: number | null }> = {};

/**
 * 1. Auth Rate Limiter (5 failed logins -> 15 min lockout)
 */
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = failedAttempts[ip];

  if (record && record.lockedUntil && now < record.lockedUntil) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMITED',
      message: `Too many failed login attempts. Locked out for ${remainingMinutes} minutes.`
    });
  }

  next();
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  if (!failedAttempts[ip]) {
    failedAttempts[ip] = { count: 1, lockedUntil: null };
  } else {
    failedAttempts[ip].count += 1;
    if (failedAttempts[ip].count >= 5) {
      failedAttempts[ip].lockedUntil = now + 15 * 60 * 1000; // 15 mins
    }
  }
}

export function resetFailedLogin(ip: string) {
  delete failedAttempts[ip];
}

/**
 * 2. JWT Verification & Tenant Isolation Injection
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'AUTH_FAILED', message: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'AUTH_FAILED', message: 'Invalid or expired token.' });
    }

    req.user = decoded;
    // Enforce Tenant Isolation on Request Scope
    req.tenantId = decoded.tenantId;
    next();
  });
}

/**
 * 3. Role-Based Access Control (RBAC)
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: `Requires one of roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

/**
 * 4. Tenant Isolation Enforcement Helper
 * Every DB query MUST include { where: { tenantId: req.tenantId } }
 */
export function enforceTenantIsolation(req: AuthenticatedRequest) {
  if (!req.tenantId && req.user?.role !== 'super_admin') {
    throw new Error('Security Violation: Missing tenant context.');
  }
  return req.user?.role === 'super_admin' ? {} : { tenantId: req.tenantId };
}
