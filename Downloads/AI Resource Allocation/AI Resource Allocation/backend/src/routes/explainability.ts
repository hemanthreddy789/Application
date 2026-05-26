// Enterprise Recommendation Explainability API Routes
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * 1. Get Detailed Recommendation Explanation
 */
router.get('/:taskId/explain', authenticateToken, (req, res) => {
  const taskId = req.params.taskId;

  res.json({
    success: true,
    data: {
      taskId,
      taskTitle: "Build Enterprise SSO Integration",
      topCandidate: {
        id: "emp-101",
        name: "Alice Expert",
        overallScore: 92.4,
        confidenceInterval: "+/- 2.1%",
        factorBreakdown: {
          skill: { earned: 41.5, max: 45.0, label: "Skill Match" },
          capacity: { earned: 31.2, max: 35.0, label: "Availability" },
          performance: { earned: 14.7, max: 15.0, label: "Historical Performance" },
          deadline: { earned: 5.0, max: 5.0, label: "Deadline Fit" }
        },
        topReasons: [
          "✅ 95% skill match on OAuth 2.0 + Node.js + Security",
          "✅ Completed 6 similar authentication-domain tasks (last: 3 weeks ago)",
          "⚠️ Currently at 82% capacity, leaving 7.2 hours/week available"
        ],
        concerns: [
          "⚠️ Has approved leave 24-28 May which is immediately after deadline"
        ]
      },
      comparisonView: [
        {
          id: "emp-101",
          name: "Alice Expert",
          score: 92.4,
          skillMatch: "95%",
          utilization: "82%",
          pastOnTime: "98%",
          deltaReason: "Top pick due to proven domain expertise and zero deadline conflicts."
        },
        {
          id: "emp-102",
          name: "Bob Senior",
          score: 84.1,
          skillMatch: "88%",
          utilization: "95%",
          pastOnTime: "90%",
          deltaReason: "Lower score due to high current utilization (95%)."
        },
        {
          id: "emp-103",
          name: "Charlie Mid",
          score: 76.5,
          skillMatch: "80%",
          utilization: "60%",
          pastOnTime: "85%",
          deltaReason: "Excellent availability but lacks advanced OAuth certification."
        }
      ],
      alternativeRecommendations: [
        {
          id: "emp-104",
          name: "David Stretch (Exploration Candidate)",
          score: 72.0,
          explanation: "💡 Growth opportunity — David has strong Node.js skills and declared OAuth as a growth goal."
        }
      ]
    },
    error: null,
    meta: { timestamp: new Date().toISOString() }
  });
});

export default router;
