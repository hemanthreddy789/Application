// Enterprise Decision Audit Trail API Routes
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

const mockAuditLogs = [
  {
    decisionId: "dec-9001",
    timestamp: "2026-05-12T14:22:00Z",
    taskId: "task-101",
    taskTitle: "Refactor Billing Webhooks",
    recommendedEmployeeId: "emp-101",
    recommendedEmployeeName: "Alice Expert",
    assignedEmployeeId: "emp-101",
    isOverride: false,
    overrideReason: null
  },
  {
    decisionId: "dec-9002",
    timestamp: "2026-05-13T11:05:00Z",
    taskId: "task-102",
    taskTitle: "Build Admin Dashboard",
    recommendedEmployeeId: "emp-101",
    recommendedEmployeeName: "Alice Expert",
    assignedEmployeeId: "emp-104",
    isOverride: true,
    overrideReason: "growth opportunity",
    overrideComment: "Assigning to David to build his frontend skills."
  }
];

/**
 * 1. Get Audit Trail Decisions
 */
router.get('/decisions', authenticateToken, requireRole(['super_admin', 'tenant_admin']), (req, res) => {
  res.json({
    success: true,
    data: mockAuditLogs,
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 2. Export Audit Decisions as CSV
 */
router.get('/export', authenticateToken, requireRole(['super_admin', 'tenant_admin']), (req, res) => {
  const headers = ["Decision ID", "Timestamp", "Task", "Recommended", "Assigned", "Is Override", "Reason", "Comment"];
  const rows = mockAuditLogs.map(l => [
    l.decisionId,
    l.timestamp,
    `"${l.taskTitle}"`,
    l.recommendedEmployeeName,
    l.assignedEmployeeId === l.recommendedEmployeeId ? l.recommendedEmployeeName : "David Stretch",
    l.isOverride ? "YES" : "NO",
    l.overrideReason || "N/A",
    `"${l.overrideComment || ''}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="enterprise_ai_decision_audit.csv"');
  res.send(csv);
});

export default router;
