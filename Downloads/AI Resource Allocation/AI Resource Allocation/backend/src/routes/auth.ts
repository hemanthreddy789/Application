// Enterprise Auth API Routes
import express from 'express';
import jwt from 'jsonwebtoken';
import { authRateLimiter, recordFailedLogin, resetFailedLogin, authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "enterprise_super_secret_jwt_key_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "enterprise_super_refresh_secret_key_2026";

// Mock User DB for staging validation
const mockUsers: Record<string, any> = {
  'admin@meridian-health.demo': {
    id: 'u1001-uuid',
    tenantId: 'e207b7b0-8f92-4f11-9a73-000000000001',
    name: 'Meridian Admin',
    role: 'tenant_admin',
    password: 'Password123!',
    mfaEnabled: true,
    mfaSecret: 'MOCK_TOTP_SECRET_XYZ'
  },
  'manager@meridian-health.demo': {
    id: 'u1002-uuid',
    tenantId: 'e207b7b0-8f92-4f11-9a73-000000000001',
    name: 'Alice Manager',
    role: 'manager',
    password: 'Password123!',
    mfaEnabled: false
  }
};

/**
 * 1. User Login (JWT + Refresh Tokens)
 */
router.post('/login', authRateLimiter, (req, res) => {
  const { email, password, totpToken } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const user = mockUsers[email];

  if (!user || user.password !== password) {
    recordFailedLogin(ip);
    return res.status(401).json({ success: false, error: 'AUTH_FAILED', message: 'Invalid credentials.' });
  }

  if (user.mfaEnabled && totpToken !== '123456') { // Mock TOTP verification
    return res.status(401).json({ success: false, error: 'AUTH_FAILED', message: 'MFA TOTP Token required or invalid.' });
  }

  resetFailedLogin(ip);

  // Generate Tokens (15m Access, 7d Refresh)
  const accessToken = jwt.sign(
    { id: user.id, tenantId: user.tenantId, role: user.role, email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, tenantId: user.tenantId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    data: { accessToken, refreshToken, user: { id: user.id, name: user.name, role: user.role, tenantId: user.tenantId } },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 2. Token Refresh Endpoint
 */
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, error: 'AUTH_FAILED', message: 'Refresh token required.' });

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ success: false, error: 'AUTH_FAILED', message: 'Invalid or expired refresh token.' });

    const accessToken = jwt.sign(
      { id: decoded.id, tenantId: decoded.tenantId, role: 'manager', email: 'refresh@demo.com' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ success: true, data: { accessToken } });
  });
});

/**
 * 3. MFA Setup (TOTP)
 */
router.post('/mfa/setup', authenticateToken, requireRole(['tenant_admin', 'manager']), (req, res) => {
  res.json({
    success: true,
    data: { secret: 'MOCK_TOTP_SECRET_GEN_2026', qrCodeUrl: 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=otpauth://totp/AIResource:admin@meridian.demo%3Fsecret=MOCK_TOTP_SECRET_GEN_2026' }
  });
});

/**
 * 4. Password Reset Flow
 */
router.post('/password-reset/initiate', (req, res) => {
  res.json({ success: true, message: 'Password reset link sent to email if registered.' });
});

/**
 * 5. OAuth 2.0 / SSO Mock Endpoint
 */
router.get('/sso/:provider', (req, res) => {
  const provider = req.params.provider; // google, microsoft, okta
  res.json({ success: true, message: `Redirecting to ${provider} OAuth 2.0 / OIDC provider...` });
});

export default router;
