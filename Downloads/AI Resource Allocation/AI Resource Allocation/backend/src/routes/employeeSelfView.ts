// Enterprise Employee Self-View API Routes (/me)
import express from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * 1. Get Employee Dashboard Self-View
 */
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    data: {
      id: req.user?.id || "emp-self-123",
      name: req.user?.email || "Sarah IC",
      weeklyCapacityHours: 40,
      currentAllocatedHours: 36,
      utilizationPercentage: 90.0,
      forecast28DayTrend: [36, 40, 44, 30],
      growthGoals: ["Kafka", "GraphQL API Design", "Kubernetes"],
      preferences: {
        preferredTaskTypes: ["greenfield_feature", "infra_scaling"],
        avoidedTaskTypes: ["legacy_refactor"]
      },
      skills: [
        { name: "React", level: 5, verified: true },
        { name: "Node.js", level: 4, verified: true },
        { name: "Python", level: 3, verified: false }
      ]
    },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

/**
 * 2. Flag Overload
 */
router.post('/flag-overload', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { reason, requestedAction } = req.body;

  // In production, triggers BullMQ notification worker to alert manager and tenant admin
  console.log(`[Overload Alert] Employee ${req.user?.email} flagged overload. Reason: ${reason}`);

  res.json({
    success: true,
    message: "Overload alert dispatched successfully to your manager and HR/Tenant Admin.",
    data: { flaggedAt: new Date(), status: "ESCALATED" }
  });
});

/**
 * 3. Update Skills & Growth Goals (Manager Approval Workflow)
 */
router.post('/skills', authenticateToken, (req, res) => {
  const { newSkills, updatedGrowthGoals } = req.body;

  res.json({
    success: true,
    message: "Skill updates submitted. Changes pending manager approval.",
    data: { approvalStatus: "PENDING_MANAGER_REVIEW", updatedGrowthGoals }
  });
});

/**
 * 4. Submit Anonymous Workload Feedback
 */
router.post('/feedback', authenticateToken, (req, res) => {
  const { sentimentScore, comments } = req.body;

  console.log(`[Anonymous Feedback] Sentiment: ${sentimentScore}/5. Comments: ${comments}`);

  res.json({
    success: true,
    message: "Anonymous feedback submitted successfully to HR compliance logging."
  });
});

export default router;
