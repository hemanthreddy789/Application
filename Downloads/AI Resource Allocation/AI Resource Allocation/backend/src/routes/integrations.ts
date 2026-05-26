// Enterprise Integration API Routes
import express from 'express';
import { integrationManager, JiraPlugin, CalendarPlugin, WorkdayPlugin, GitHubPlugin } from '../services/integrationFramework';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * 1. Jira Webhook Listener
 */
router.post('/webhooks/jira', async (req, res) => {
  const payload = req.body;
  const jiraPlugin = integrationManager.plugins['jira'] as JiraPlugin;
  
  const result = await jiraPlugin.handleWebhook(payload);

  res.json({
    success: true,
    data: result,
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 2. HRIS Nightly Sync Trigger
 */
router.post('/sync/hris', authenticateToken, requireRole(['super_admin', 'tenant_admin']), async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId || "e207b7b0-8f92-4f11-9a73-000000000001";
  const hrisPlugin = integrationManager.plugins['hris'] as WorkdayPlugin;
  
  const result = await hrisPlugin.sync(tenantId);

  res.json({
    success: true,
    data: result,
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 3. Calendar Sync Trigger (OOO Blockers & Meeting Density)
 */
router.post('/sync/calendar', authenticateToken, requireRole(['super_admin', 'tenant_admin', 'manager']), async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId || "e207b7b0-8f92-4f11-9a73-000000000001";
  const calendarPlugin = integrationManager.plugins['calendar'] as CalendarPlugin;
  
  const result = await calendarPlugin.sync(tenantId);

  res.json({
    success: true,
    data: result,
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 4. GitHub Source Control Stalled Work Inspection
 */
router.post('/sync/github', authenticateToken, requireRole(['super_admin', 'tenant_admin', 'manager']), async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId || "e207b7b0-8f92-4f11-9a73-000000000001";
  const githubPlugin = integrationManager.plugins['github'] as GitHubPlugin;
  
  const result = await githubPlugin.sync(tenantId);

  res.json({
    success: true,
    data: result,
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 5. Plugin Health & Status Monitoring
 */
router.get('/status', authenticateToken, requireRole(['super_admin', 'tenant_admin']), (req, res) => {
  const statusMap: Record<string, any> = {};
  for (const [key, plugin] of Object.entries(integrationManager.plugins)) {
    statusMap[key] = { name: plugin.name, health: plugin.getHealth() };
  }

  res.json({
    success: true,
    data: statusMap,
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

export default router;
