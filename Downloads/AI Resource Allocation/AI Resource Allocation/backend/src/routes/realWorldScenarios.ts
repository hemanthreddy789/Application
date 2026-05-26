// Enterprise Real-World Scenario API Routes
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * 1. Multi-Role Squad Recommendation
 */
router.post('/squad-recommendation', authenticateToken, (req, res) => {
  const { projectId, requiredRoles } = req.body;
  // e.g. requiredRoles: [{ role: 'Senior Backend', count: 1 }, { role: 'Junior Frontend', count: 1 }, { role: 'QA', count: 1 }]

  res.json({
    success: true,
    data: {
      projectId,
      squadName: "Tiger Team Alpha",
      collectiveSkillMatch: "94%",
      squadMembers: [
        { role: "Senior Backend", employeeId: "emp-101", name: "Alice Expert", costPerHour: 120, matchScore: 95.2 },
        { role: "Junior Frontend", employeeId: "emp-104", name: "David Stretch", costPerHour: 65, matchScore: 84.0, isStretch: true },
        { role: "QA Engineer", employeeId: "emp-105", name: "Eve Validator", costPerHour: 80, matchScore: 91.5 }
      ],
      warnings: ["⚠️ David is a stretch candidate for frontend; pairing with Alice recommended."]
    },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 2. Invisible Work Tracking (Overhead Allocations)
 */
router.get('/invisible-work/:employeeId', authenticateToken, (req, res) => {
  const employeeId = req.params.employeeId;

  res.json({
    success: true,
    data: {
      employeeId,
      baseWeeklyHours: 40,
      overheadAllocations: [
        { type: "on_call_rotation", percentage: 20, hours: 8, description: "Tier 1 PagerDuty Rotation" },
        { type: "mentoring", percentage: 10, hours: 4, description: "Mentoring junior engineers" },
        { type: "interviewing", percentage: 15, hours: 6, description: "Engineering hiring panel" }
      ],
      totalOverheadHours: 18,
      netAvailableCapacityHours: 22
    },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 3. Project Critical Path Method (CPM) Dependency Graph
 */
router.get('/critical-path/:projectId', authenticateToken, (req, res) => {
  const projectId = req.params.projectId;

  res.json({
    success: true,
    data: {
      projectId,
      criticalPathTaskIds: ["task-1", "task-3", "task-5"],
      cpmDurationDays: 45,
      isProjectAtRisk: true,
      bottleneckTask: {
        id: "task-3",
        title: "Migrate Auth Database",
        delayRiskProb: "78%",
        recommendation: "Elevate staffing priority: Assign top-performer Alice Expert immediately to prevent 12-day downstream cascade delay."
      }
    },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 4. Cross-Functional Team Borrowing
 */
router.post('/cross-functional/borrow', authenticateToken, requireRole(['tenant_admin', 'manager']), (req, res) => {
  const { employeeId, sourceDepartment, targetProjectId, durationWeeks } = req.body;

  res.json({
    success: true,
    message: `Borrow request for employee ${employeeId} from ${sourceDepartment} submitted to department head.`,
    data: { status: "PENDING_GUILD_APPROVAL", durationWeeks }
  });
});

/**
 * 5. Budget & Cost Awareness Tracking
 */
router.get('/budget/:projectId', authenticateToken, (req, res) => {
  const projectId = req.params.projectId;

  res.json({
    success: true,
    data: {
      projectId,
      currency: "USD",
      allocatedBudget: 50000.0,
      projectedCost: 56400.0,
      costVariance: -6400.0,
      isOverBudget: true,
      warning: "⚠️ Projected staffing cost exceeds allocated budget by $6,400. Consider blending offshore contractor capacity or adjusting squad seniority."
    },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

export default router;
