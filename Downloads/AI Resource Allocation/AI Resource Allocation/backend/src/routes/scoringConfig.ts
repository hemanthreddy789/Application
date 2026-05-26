// Enterprise Scoring Configuration Management API Routes
import express from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Mock per-tenant scoring configurations for staging
const tenantConfigs: Record<string, any> = {
  'e207b7b0-8f92-4f11-9a73-000000000001': {
    skillMatchWeight: 0.45,
    availabilityWeight: 0.35,
    performanceWeight: 0.15,
    deadlineCompatibilityWeight: 0.05,
    domainExpertBonus: 30.0,
    mismatchPenaltyType: 'SIGMOID', // Sigmoid curve vs Hard Cut
    overloadThreshold: 1.0,
    severeOverloadThreshold: 1.5,
    coldStartGraceDays: 60,
    skillDecayHalfLifeDays: 365,
    explorationEpsilon: 0.15
  }
};

/**
 * 1. Get Tenant Scoring Configuration
 */
router.get('/', authenticateToken, requireRole(['super_admin', 'tenant_admin', 'manager']), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId || 'e207b7b0-8f92-4f11-9a73-000000000001';
  const config = tenantConfigs[tenantId] || tenantConfigs['e207b7b0-8f92-4f11-9a73-000000000001'];
  
  res.json({
    success: true,
    data: config,
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 2. Update Tenant Scoring Configuration
 */
router.put('/', authenticateToken, requireRole(['super_admin', 'tenant_admin']), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId || 'e207b7b0-8f92-4f11-9a73-000000000001';
  const newConfig = req.body;

  // Validate weights sum to 1.0
  const sum = (newConfig.skillMatchWeight + newConfig.availabilityWeight + newConfig.performanceWeight + newConfig.deadlineCompatibilityWeight);
  if (Math.abs(sum - 1.0) > 0.001) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Weights must sum exactly to 1.0' } });
  }

  tenantConfigs[tenantId] = { ...tenantConfigs[tenantId], ...newConfig };

  res.json({
    success: true,
    data: tenantConfigs[tenantId],
    error: null,
    meta: { timestamp: new Date().toISOString(), updatedBy: req.user?.id }
  });
});

/**
 * 3. Live Preview Scoring Changes ("What-If")
 */
router.post('/preview', authenticateToken, requireRole(['super_admin', 'tenant_admin']), (req, res) => {
  const proposedConfig = req.body;
  
  // Return simulated recommendation adjustments
  res.json({
    success: true,
    data: {
      previewTask: 'Build Enterprise SSO Integration',
      currentTopCandidate: { name: 'Alice Expert', score: 92.4 },
      proposedTopCandidate: { name: 'Bob Generalist', score: 89.1, reason: 'Higher availability weighting shifted priority' },
      scoreShifts: [
        { employee: 'Alice Expert', oldScore: 92.4, newScore: 84.2, change: -8.2 },
        { employee: 'Bob Generalist', oldScore: 81.0, newScore: 89.1, change: +8.1 }
      ]
    },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

export default router;
