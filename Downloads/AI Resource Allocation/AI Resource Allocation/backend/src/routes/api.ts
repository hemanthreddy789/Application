import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getTopRecommendedEmployees, generateRecommendationExplanation } from '../services/recommendationService';
import { generateBalancingSuggestions } from '../services/workloadService';
import { calculateProjectRisks } from '../services/riskService';
import { handleChat } from '../services/chatService';

const router = Router();
const prisma = new PrismaClient();

// Auth (Mock)
router.post('/auth/login', async (req, res) => {
  res.json({ token: 'mock-jwt-token', user: { role: 'Manager' } });
});

router.get('/auth/me', async (req, res) => {
  res.json({ user: { name: 'Admin', role: 'Admin' } });
});

// Dashboard
router.get('/dashboard/summary', async (req, res) => {
  const totalEmployees = await prisma.employee.count();
  const availableEmployees = await prisma.employee.count({ where: { currentAllocatedHours: { lt: 20 } } });
  const overloadedEmployees = await prisma.employee.count({ where: { currentAllocatedHours: { gte: 50 } } });
  const balancedEmployees = totalEmployees - availableEmployees - overloadedEmployees;
  const totalActiveTasks = await prisma.task.count({ where: { status: { notIn: ['Completed'] } } });
  const atRiskProjects = await prisma.project.count({ where: { delayRiskScore: { gt: 50 } } });
  
  // Average utilization
  const allEmployees = await prisma.employee.findMany();
  const avgUtil = Math.round(allEmployees.reduce((sum, e) => sum + (e.currentAllocatedHours / e.weeklyCapacityHours) * 100, 0) / allEmployees.length);

  res.json({
    totalEmployees,
    availableEmployees,
    overloadedEmployees,
    balancedEmployees,
    totalActiveTasks,
    atRiskProjects,
    averageTeamUtilization: avgUtil
  });
});

router.get('/dashboard/workload', async (req, res) => {
  const employees = await prisma.employee.findMany({
    include: {
      assignedTasks: {
        where: { status: { not: 'Completed' } },
        include: { project: true }
      },
      leaves: { where: { status: 'Approved' } }
    }
  });

  const result = employees.map(emp => {
    const utilization = Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100);
    let status = 'Available';
    if (utilization >= 100) status = 'Overloaded';
    else if (utilization >= 80) status = 'Moderate';
    else if (utilization >= 50) status = 'Balanced';

    const hasLeave = emp.leaves.some(l => {
      const now = new Date();
      return new Date(l.startDate) <= now && now <= new Date(l.endDate);
    });

    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      activeTaskCount: emp.assignedTasks.length,
      activeTasks: emp.assignedTasks.map(t => ({
        id: t.id,
        title: t.title,
        project: t.project?.name,
        status: t.status,
        deadline: t.deadline,
        priority: t.priority,
        progressPercentage: t.progressPercentage
      })),
      allocatedHours: emp.currentAllocatedHours,
      capacityHours: emp.weeklyCapacityHours,
      utilizationPercentage: utilization,
      onTimeDeliveryRate: emp.onTimeDeliveryRate,
      performanceScore: emp.performanceScore,
      status,
      onLeave: hasLeave,
      upcomingLeaves: emp.leaves.map(l => ({ startDate: l.startDate, endDate: l.endDate, leaveType: l.leaveType }))
    };
  });

  res.json(result);
});

router.get('/dashboard/project-risks', async (req, res) => {
  try {
    const { calculateProjectFailureRisk } = await import('../services/projectRiskService');
    const risks = await calculateProjectFailureRisk(prisma);
    
    // Map to expected frontend format
    const mappedRisks = risks.map(r => ({
      id: r.id,
      name: r.name,
      delayProbability: r.riskScore,
      riskLevel: r.riskLevel,
      riskReasons: r.reasons,
      mitigationActions: r.mitigationRecommendations
    }));
    
    res.json(mappedRisks);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to calculate project risks' });
  }
});

// Analytics (Phase 7)
// Analytics Accuracy removed for debug

router.get('/projects', async (req, res) => {
  const projects = await prisma.project.findMany({
    include: { tasks: true }
  });
  res.json(projects);
});

router.get('/dashboard/forecast/all', async (req, res) => {
  const employees = await prisma.employee.findMany();
  const summary = employees.map(emp => ({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    currentLoad: Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100),
    peakLoad: Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100) + 15,
    status: emp.currentAllocatedHours > emp.weeklyCapacityHours ? 'Overloaded' : 'Healthy'
  }));
  res.json(summary);
});

router.get('/dashboard/forecast/team-aggregate', async (req, res) => {
  const employees = await prisma.employee.findMany();
  
  // Aggregate 28-day forecast for the whole company
  const forecast = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    // Simple mock: base utilization 60% + random variance
    return {
      date: d.toISOString(),
      day_label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      predicted_capacity: 55 + Math.random() * 30,
      color: 'moderate'
    };
  });

  res.json({
    team_name: "Whole Organization",
    member_count: employees.length,
    forecast,
    insight: "Overall team capacity is healthy, but backend resources are reaching 85% utilization in Week 2.",
    risk_level: "Low"
  });
});

router.get('/dashboard/leaves/all', async (req, res) => {
  const leaves = await prisma.leave.findMany({
    include: { employee: true },
    orderBy: { startDate: 'asc' }
  });
  res.json(leaves);
});

router.get('/projects/:id/forecast', async (req, res) => {
  const projectId = req.params.id;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { tasks: { include: { assignedEmployee: true } } }
  });
  
  if (!project) return res.status(404).json({ error: 'Project not found' });
  
  const memberIds = Array.from(new Set(project.tasks.map(t => t.assignedEmployeeId).filter(id => !!id)));
  
  const forecast = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      date: d.toISOString(),
      day_label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      predicted_capacity: 65 + Math.random() * 50,
      color: 'moderate'
    };
  });

  res.json({
    project_name: project.name,
    member_count: memberIds.length,
    forecast,
    insight: "Project load predicted to peak in 12 days. High concentration of frontend deadlines.",
    risk_level: "High"
  });
});

router.get('/v1/analytics/roi', async (req, res) => {
  // Mock logic: assume each AI prediction saves 15 mins (0.25 hrs) of manager time.
  const aiAssignedTasks = await prisma.task.count({ where: { status: { in: ['In Progress', 'Completed'] } } });
  const hoursSaved = aiAssignedTasks * 0.25;
  const monetaryValue = hoursSaved * 75; // assume $75/hr manager rate
  
  // Return trend data
  res.json({
    hoursSaved,
    monetaryValue,
    trend: [
      { month: 'Jan', hours: hoursSaved * 0.2 },
      { month: 'Feb', hours: hoursSaved * 0.4 },
      { month: 'Mar', hours: hoursSaved * 0.7 },
      { month: 'Apr', hours: hoursSaved }
    ]
  });
});

router.get('/v1/analytics/burnout', async (req, res) => {
  try {
    const { calculateBurnoutScores } = await import('../services/burnoutService');
    const data = await calculateBurnoutScores(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to calculate burnout scores' });
  }
});

router.get('/v1/analytics/project-risk', async (req, res) => {
  try {
    const { calculateProjectFailureRisk } = await import('../services/projectRiskService');
    const data = await calculateProjectFailureRisk(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to calculate project risk scores' });
  }
});

router.get('/v1/recommendations/rebalance', async (req, res) => {
  try {
    const { generateRebalancingSuggestions } = await import('../services/rebalancingService');
    const data = await generateRebalancingSuggestions(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to calculate rebalancing suggestions' });
  }
});

router.get('/v1/analytics/delivery-confidence', async (req, res) => {
  try {
    const { calculateDeliveryConfidence } = await import('../services/deliveryConfidenceService');
    const data = await calculateDeliveryConfidence(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to calculate delivery confidence' });
  }
});

router.get('/v1/skills/progression', async (req, res) => {
  try {
    const { getSkillProgression } = await import('../services/skillService');
    const { employeeId } = req.query;
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    const data = await getSkillProgression(prisma, employeeId as string);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch skill progression' });
  }
});

router.get('/v1/skills/gaps', async (req, res) => {
  try {
    const { predictSkillGaps } = await import('../services/skillService');
    const data = await predictSkillGaps(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to predict skill gaps' });
  }
});

router.get('/v1/scrum/standup', async (req, res) => {
  try {
    const { generateStandupSummary } = await import('../services/scrumService');
    const data = await generateStandupSummary(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate standup summary' });
  }
});

router.get('/v1/scrum/spillover', async (req, res) => {
  try {
    const { predictSpillover } = await import('../services/scrumService');
    const data = await predictSpillover(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to predict spillover' });
  }
});

router.get('/v1/finance/projects', async (req, res) => {
  try {
    const { getProjectFinancials } = await import('../services/financeService');
    const data = await getProjectFinancials(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

router.get('/v1/graph/data', async (req, res) => {
  try {
    const { getGraphData } = await import('../services/graphService');
    const data = await getGraphData(prisma);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch graph data' });
  }
});

router.get('/v1/jobs', async (req, res) => {
  try {
    const mlRes = await fetch(`http://127.0.0.1:8000/api/v1/ml/jobs`);
    if (mlRes.ok) {
      const data = await mlRes.json();
      res.json(data);
    } else {
      throw new Error('ML Service Error');
    }
  } catch (e) {
    res.status(503).json({ error: 'Job scheduler service unavailable' });
  }
});

// Employees
router.get('/employees', async (req, res) => {
  const employees = await prisma.employee.findMany({ include: { skills: { include: { skill: true } } } });
  res.json(employees);
});

router.post('/employees', async (req, res) => {
  const { name, email, role, department, experienceLevel, weeklyCapacityHours } = req.body;
  const newEmployee = await prisma.employee.create({
    data: {
      employeeCode: `EMP-${Math.floor(Math.random() * 10000)}`,
      name,
      email,
      role,
      department,
      experienceLevel,
      weeklyCapacityHours: parseInt(weeklyCapacityHours) || 40,
    }
  });
  res.json(newEmployee);
});

router.get('/employees/:id', async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: {
      skills: { include: { skill: true } },
      assignedTasks: {
        include: { project: true },
        orderBy: { createdAt: 'desc' }
      },
      taskAssignments: {
        include: { task: { include: { project: true } } }
      } as any,
      leaves: { where: { status: 'Approved' }, orderBy: { startDate: 'asc' } }
    }
  });
  
  if (!employee) return res.status(404).json({ error: 'Not found' });
  
  const completedTasksCount = employee.assignedTasks.filter(t => t.status === 'Completed').length;
  const activeTasksCount = employee.assignedTasks.filter(t => t.status !== 'Completed').length;
  const uniqueProjects = new Set(employee.assignedTasks.map(t => t.projectId)).size;
  
  res.json({
    ...employee,
    stats: {
      completedTasks: completedTasksCount,
      activeTasks: activeTasksCount,
      totalProjects: uniqueProjects
    }
  });
});

router.post('/employees/:id/skills', async (req, res) => {
  const { name, proficiencyLevel } = req.body;
  
  // Find or create the skill
  let skill = await prisma.skill.findUnique({ where: { name } });
  if (!skill) {
    skill = await prisma.skill.create({ data: { name, category: 'Technical' } });
  }
  
  // Link it
  const employeeSkill = await prisma.employeeSkill.create({
    data: {
      employeeId: req.params.id,
      skillId: skill.id,
      proficiencyLevel: parseInt(proficiencyLevel) || 3,
      yearsOfExperience: 1.0 // Default required by schema
    },
    include: { skill: true }
  });
  
  res.json(employeeSkill);
});

router.get('/employees/:id/forecast', async (req, res) => {
  const employeeId = req.params.id;
  try {
    const mlRes = await fetch(`http://127.0.0.1:8000/api/v1/ml/employees/${employeeId}/forecast?days=28`);
    if (mlRes.ok) {
      const data = await mlRes.json();
      res.json(data);
    } else {
      throw new Error('ML Service Error');
    }
  } catch (e) {
    res.status(503).json({ error: 'Forecasting service unavailable' });
  }
});

// Projects duplicate removed

router.post('/projects', async (req, res) => {
  const { name, description, status, priority } = req.body;
  const newProject = await prisma.project.create({
    data: {
      name,
      description,
      status: status || 'Active',
      priority: priority || 'Medium',
      startDate: new Date(),
    }
  });
  res.json(newProject);
});

// Tasks
router.get('/tasks', async (req, res) => {
  const tasks = await prisma.task.findMany({ include: { project: true, assignedEmployee: true } });
  res.json(tasks);
});

router.post('/tasks', async (req, res) => {
  const { projectId, title, description, taskType, complexity, priority, estimatedHours, deadline } = req.body;
  const newTask = await prisma.task.create({
    data: {
      projectId,
      title,
      description,
      taskType: taskType || 'Development',
      complexity: complexity || 'Medium',
      priority: priority || 'Medium',
      estimatedHours: parseInt(estimatedHours) || 10,
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      status: 'Not Started',
      dependencyIds: '[]',
    }
  });
  res.json(newTask);
});

router.post('/tasks/bulk-delay-risk', async (req, res) => {
  const { taskIds } = req.body;
  const results: Record<string, any> = {};
  
  // In production, this would call a batch ML endpoint.
  // For now, we simulate with the same logic as the single endpoint.
  for (const id of taskIds) {
    const task = await prisma.task.findUnique({ where: { id } });
    const est = task?.estimatedHours || 10;
    const prob = Math.min(est / 100, 0.9);
    results[id] = {
      task_id: id,
      delay_probability: prob,
      risk_level: prob > 0.6 ? 'high' : prob > 0.3 ? 'medium' : 'low',
      top_risk_factors: [{ factor: "estimated_hours", contribution: 1.0, detail: "Batch fallback estimate" }],
      recommended_actions: [],
      confidence: 0.5
    };
  }
  res.json(results);
});

router.get('/tasks/:id/delay-risk', async (req, res) => {
  const taskId = req.params.id;
  try {
    const mlRes = await fetch(`http://127.0.0.1:8000/api/v1/ml/tasks/${taskId}/delay-risk`);
    if (mlRes.ok) {
      const data = await mlRes.json();
      res.json(data);
    } else {
      throw new Error('ML Service Error');
    }
  } catch (e) {
    // Fallback if ML service is down
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    const est = task?.estimatedHours || 10;
    const prob = Math.min(est / 100, 0.9);
    res.json({
      task_id: taskId,
      delay_probability: prob,
      risk_level: prob > 0.6 ? 'high' : prob > 0.3 ? 'medium' : 'low',
      top_risk_factors: [{ factor: "estimated_hours", contribution: 1.0, detail: "Static fallback estimate" }],
      recommended_actions: [],
      confidence: 0.5
    });
  }
});

router.post('/tasks/parse', async (req, res) => {
  const { description } = req.body;
  try {
    const mlRes = await fetch(`http://127.0.0.1:8000/api/v1/ml/tasks/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });
    if (mlRes.ok) {
      const data = await mlRes.json();
      res.json(data);
    } else {
      throw new Error('ML Service Error');
    }
  } catch (e) {
    res.status(503).json({ error: 'AI parsing service unavailable' });
  }
});

router.get('/tasks/:id', async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { project: true, assignedEmployee: true, requiredSkills: { include: { skill: true } } }
  });
  res.json(task);
});

router.post('/tasks/:id/recommend', async (req, res) => {
  const taskId = req.params.id;
  const topEmployees = await getTopRecommendedEmployees(prisma, taskId);
  res.json(topEmployees);
});

router.post('/tasks/:id/assign', async (req, res) => {
  const taskId = req.params.id;
  const { employeeId } = req.body;
  
  const currentTask = await prisma.task.findUnique({ where: { id: taskId } });
  if (!currentTask) return res.status(404).json({ error: 'Task not found' });
  
  const oldEmployeeId = currentTask.assignedEmployeeId;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { assignedEmployeeId: employeeId, status: 'In Progress' }
  });

  // Update employee workload
  if (oldEmployeeId && oldEmployeeId !== employeeId) {
    await prisma.employee.update({
      where: { id: oldEmployeeId },
      data: { currentAllocatedHours: { decrement: task.estimatedHours } }
    });
  }

  if (oldEmployeeId !== employeeId) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { currentAllocatedHours: { increment: task.estimatedHours } }
    });
  }

  res.json(task);
});

router.post('/tasks/:id/feedback', async (req, res) => {
  const taskId = req.params.id;
  const { eventType, recommendedEmployeeId, actualEmployeeId, overrideReason } = req.body;
  
  // Find a dummy manager ID
  const dummyManager = await prisma.employee.findFirst();
  
  const feedback = await prisma.feedbackEvent.create({
    data: {
      eventType,
      taskId,
      recommendedEmployeeId,
      actualEmployeeId,
      overrideReason,
      managerId: dummyManager?.id
    }
  });

  if (eventType === 'overridden' && dummyManager) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    await prisma.overridePattern.create({
      data: {
        managerId: dummyManager.id,
        taskType: task?.taskType || 'Development',
        overrideReason: overrideReason || 'Other',
        recommendedEmployeeId,
        chosenEmployeeId: actualEmployeeId,
        outcomeWasBetter: false
      }
    });
  }

  res.json(feedback);
});

router.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status, progressPercentage } = req.body;
  try {
    const original = await prisma.task.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ error: 'Task not found' });

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(progressPercentage !== undefined && { progressPercentage: parseInt(progressPercentage) || 0 }),
      }
    });

    // Handle workload hour updates when a task is completed/uncompleted
    if (original.assignedEmployeeId) {
      if (status === 'Completed' && original.status !== 'Completed') {
        await prisma.employee.update({
          where: { id: original.assignedEmployeeId },
          data: { currentAllocatedHours: { decrement: original.estimatedHours } }
        });
      } else if (status && status !== 'Completed' && original.status === 'Completed') {
        await prisma.employee.update({
          where: { id: original.assignedEmployeeId },
          data: { currentAllocatedHours: { increment: original.estimatedHours } }
        });
      }
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.post('/tasks/:id/complete', async (req, res) => {
  const taskId = req.params.id;
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: 'Completed' }
  });

  // Process Feedback Loop Outcome
  const feedback = await prisma.feedbackEvent.findFirst({
    where: { taskId },
    orderBy: { createdAt: 'desc' }
  });

  if (feedback) {
    const wasCorrect = feedback.actualEmployeeId === feedback.recommendedEmployeeId;
    await prisma.feedbackEvent.update({
      where: { id: feedback.id },
      data: {
        outcomeOnTime: true,
        outcomeQuality: 4.5,
        wasPredictionCorrect: wasCorrect
      }
    });

    if (feedback.eventType === 'overridden') {
      const pattern = await prisma.overridePattern.findFirst({
        where: { 
          taskType: task.taskType,
          recommendedEmployeeId: feedback.recommendedEmployeeId,
          chosenEmployeeId: feedback.actualEmployeeId
        },
        orderBy: { lastOccurred: 'desc' }
      });
      if (pattern) {
         await prisma.overridePattern.update({
           where: { id: pattern.id },
           data: { outcomeWasBetter: true }
         });
      }
    }
  }

  if (task.assignedEmployeeId) {
    await prisma.employee.update({
      where: { id: task.assignedEmployeeId },
      data: { currentAllocatedHours: { decrement: task.estimatedHours } }
    });
  }

  res.json(task);
});

// Multi-Employee Assignment (B: AI Allocation Engine)
router.post('/tasks/:id/multi-assign', async (req, res) => {
  const taskId = req.params.id;
  const { assignments } = req.body;
  // assignments: [{ employeeId, allocatedHoursPerDay, totalAllocatedHours }]

  const currentTask = await prisma.task.findUnique({ where: { id: taskId } });
  if (!currentTask) return res.status(404).json({ error: 'Task not found' });

  // Clear existing multi-assignments
  await (prisma as any).taskAssignment.deleteMany({ where: { taskId } });

  // Decrement old primary assignee workload
  if (currentTask.assignedEmployeeId) {
    await prisma.employee.update({
      where: { id: currentTask.assignedEmployeeId },
      data: { currentAllocatedHours: { decrement: currentTask.estimatedHours } }
    });
  }

  // Create new assignments and update each employee's weekly hours
  for (const a of assignments) {
    await (prisma as any).taskAssignment.create({
      data: {
        taskId,
        employeeId: a.employeeId,
        allocatedHoursPerDay: a.allocatedHoursPerDay,
        totalAllocatedHours: a.totalAllocatedHours
      }
    });
    const weeklyContribution = Math.round(a.allocatedHoursPerDay * 5);
    await prisma.employee.update({
      where: { id: a.employeeId },
      data: { currentAllocatedHours: { increment: weeklyContribution } }
    });
  }

  // Update task primary assignee + status
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'In Progress',
      assignedEmployeeId: assignments[0]?.employeeId || null
    }
  });

  res.json({ success: true, assignmentCount: assignments.length });
});

// Get allocation details for a task
router.get('/tasks/:id/allocation', async (req, res) => {
  const taskId = req.params.id;
  const assignments = await (prisma as any).taskAssignment.findMany({
    where: { taskId },
    include: { employee: true }
  });
  res.json(assignments);
});

// Balancing
router.get('/balancing/suggestions', async (req, res) => {
  const suggestions = await generateBalancingSuggestions(prisma);
  res.json(suggestions);
});

// Chat
router.post('/chat', async (req, res) => {
  const { question, history = [] } = req.body;
  const result = await handleChat(prisma, question, history);
  res.json(result);
});

// Admin
router.get('/admin/scoring-config', async (req, res) => {
  const config = await prisma.scoringConfig.findFirst();
  res.json(config);
});

export default router;
