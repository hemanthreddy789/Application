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

// ─── Sprint Board ────────────────────────────────────────────────────────────

function sprintTaskStatus(status: string): 'completed' | 'in_progress' | 'backlog' | 'pending' {
  const map: Record<string, 'completed' | 'in_progress' | 'backlog' | 'pending'> = {
    'Completed':   'completed',
    'In Progress': 'in_progress',
    'Blocked':     'backlog',
    'Delayed':     'backlog',
    'Not Started': 'pending',
  };
  return map[status] ?? 'pending';
}

// GET /api/sprint/projects — lightweight list for the project selector
router.get('/sprint/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
    const list = projects.map(p => {
      const total     = p.tasks.length;
      const completed = p.tasks.filter(t => t.status === 'Completed').length;
      const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;
      const backlog   = p.tasks.filter(t => t.status === 'Blocked' || t.status === 'Delayed').length;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        priority: p.priority,
        startDate: p.startDate,
        endDate: p.endDate,
        delayRiskScore: p.delayRiskScore,
        totalTasks: total,
        completedTasks: completed,
        backlogCount: backlog,
        progress,
      };
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch sprint projects' });
  }
});

// GET /api/sprint/project/:id — project shaped for the sprint board
router.get('/sprint/project/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          include: {
            assignedEmployee: true,
            requiredSkills: { include: { skill: true } },
          },
          orderBy: { deadline: 'asc' },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const SPRINT_DAYS = 4;
    const projectStart = new Date(project.startDate);

    if (project.tasks.length === 0) {
      return res.json({
        id: project.id, name: project.name, description: project.description,
        status: project.status, priority: project.priority,
        sprintDays: SPRINT_DAYS,
        startDate: projectStart.toISOString().split('T')[0],
        milestones: [],
      });
    }

    // Group tasks into sprint windows from project start date
    const grouped: Record<number, typeof project.tasks> = {};
    for (const task of project.tasks) {
      const daysDiff = Math.max(0, Math.floor(
        (new Date(task.deadline).getTime() - projectStart.getTime()) / 86400000
      ));
      const sprintIdx = Math.floor(daysDiff / SPRINT_DAYS);
      if (!grouped[sprintIdx]) grouped[sprintIdx] = [];
      grouped[sprintIdx].push(task);
    }

    const now = new Date();
    const milestones = Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([idxStr, tasks], i) => {
        const idx = Number(idxStr);
        const msStart = new Date(projectStart);
        msStart.setDate(msStart.getDate() + idx * SPRINT_DAYS);
        const msEnd = new Date(msStart);
        msEnd.setDate(msEnd.getDate() + SPRINT_DAYS - 1);

        const subtasks = tasks.map(t => ({
          id: t.id,
          name: t.title,
          status: sprintTaskStatus(t.status),
          milestoneId: `ms-${project.id}-${idx}`,
          assignee: t.assignedEmployee?.name ?? null,
          priority: t.priority,
          complexity: t.complexity,
          estimatedHours: t.estimatedHours,
          progress: t.progressPercentage,
          deadline: new Date(t.deadline).toISOString().split('T')[0],
        }));

        const allDone  = subtasks.every(s => s.status === 'completed');
        const anyWip   = subtasks.some(s => s.status === 'in_progress' || s.status === 'completed');
        const totalHrs = tasks.reduce((s, t) => s + t.estimatedHours, 0);

        let msStatus: 'completed' | 'active' | 'upcoming';
        if (allDone)          msStatus = 'completed';
        else if (msStart <= now) msStatus = 'active';
        else                   msStatus = 'upcoming';

        return {
          id: `ms-${project.id}-${idx}`,
          name: `Sprint ${i + 1}`,
          startDate: msStart.toISOString().split('T')[0],
          endDate:   msEnd.toISOString().split('T')[0],
          status: msStatus,
          tasks: [{
            id: `sprint-tasks-${idx}`,
            name: `${tasks.length} task${tasks.length !== 1 ? 's' : ''} · ${totalHrs}h`,
            estimatedDays: SPRINT_DAYS,
            status: allDone ? 'completed' : anyWip ? 'in_progress' : 'pending',
            subtasks,
          }],
        };
      });

    res.json({
      id: project.id, name: project.name, description: project.description,
      status: project.status, priority: project.priority,
      sprintDays: SPRINT_DAYS,
      startDate: projectStart.toISOString().split('T')[0],
      milestones,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to build sprint view' });
  }
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
  const { question, history = [], currentPage } = req.body;
  const result = await handleChat(prisma, question, history, currentPage);
  res.json(result);
});

// Admin
router.get('/admin/scoring-config', async (req, res) => {
  const config = await prisma.scoringConfig.findFirst();
  res.json(config);
});

// ============================================================
// LEAVE & WORKFORCE MANAGEMENT
// ============================================================

router.get('/leaves/analytics', async (req, res) => {
  try {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [allLeaves, employees] = await Promise.all([
      prisma.leave.findMany({ include: { employee: true } }),
      prisma.employee.findMany()
    ]);
    const pending = allLeaves.filter(l => l.status === 'Pending').length;
    const approved = allLeaves.filter(l => l.status === 'Approved').length;
    const onLeaveToday = allLeaves.filter(l => {
      const s = new Date(l.startDate), e = new Date(l.endDate);
      return l.status === 'Approved' && s <= now && e >= now;
    }).length;
    const upcomingThisWeek = allLeaves.filter(l => {
      const s = new Date(l.startDate);
      return l.status === 'Approved' && s > now && s <= weekEnd;
    }).length;
    const onLeaveIds = new Set(allLeaves.filter(l => {
      const s = new Date(l.startDate), e = new Date(l.endDate);
      return l.status === 'Approved' && s <= now && e >= now;
    }).map(l => l.employeeId));
    const availableCount = employees.filter(e => !onLeaveIds.has(e.id)).length;
    const availabilityPct = Math.round((availableCount / Math.max(employees.length, 1)) * 100);
    const overloaded = employees.filter(e => (e.currentAllocatedHours / e.weeklyCapacityHours) >= 0.9).length;
    const byType = ['Vacation','Sick','Personal','Emergency','Maternity','Paternity','Compensatory'].map(type => ({
      name: type, value: allLeaves.filter(l => l.leaveType === type).length
    })).filter(t => t.value > 0);
    const byDept: Record<string, number> = {};
    allLeaves.forEach(l => {
      const dept = (l.employee as any)?.department || 'Other';
      byDept[dept] = (byDept[dept] || 0) + 1;
    });
    const monthly: Record<string, number> = {};
    allLeaves.forEach(l => {
      const m = new Date(l.startDate).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      monthly[m] = (monthly[m] || 0) + 1;
    });
    res.json({
      pending, approved, onLeaveToday, upcomingThisWeek,
      availabilityPct, totalEmployees: employees.length, availableCount, overloaded,
      capacityHealth: availabilityPct >= 80 ? 'Healthy' : availabilityPct >= 60 ? 'Moderate' : 'Critical',
      byType, byDept: Object.entries(byDept).map(([name, value]) => ({ name, value })),
      monthly: Object.entries(monthly).map(([month, count]) => ({ month, count }))
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get('/leaves/ai-redistribution', async (req, res) => {
  try {
    const now = new Date();
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const upcomingLeaves = await prisma.leave.findMany({
      where: { status: 'Approved', startDate: { lte: twoWeeks }, endDate: { gte: now } },
      include: {
        employee: {
          include: {
            skills: { include: { skill: true } },
            assignedTasks: { where: { status: { not: 'Completed' } }, include: { project: true } as any }
          }
        }
      }
    });
    const allEmployees = await prisma.employee.findMany({
      include: {
        skills: { include: { skill: true } },
        assignedTasks: { where: { status: { not: 'Completed' } } },
        leaves: { where: { status: 'Approved', startDate: { lte: twoWeeks }, endDate: { gte: now } } }
      }
    });
    const result = upcomingLeaves.map(leave => {
      const emp = leave.employee as any;
      const impactedTasks = emp.assignedTasks || [];
      const leaveDays = Math.max(1, Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / 86400000));
      const totalImpactHours = impactedTasks.reduce((s: number, t: any) => s + t.estimatedHours * (1 - (t.progressPercentage || 0) / 100), 0);
      const empSkillIds = emp.skills.map((s: any) => s.skillId);
      const candidates = allEmployees
        .filter(e => e.id !== emp.id && e.isActive && (e as any).leaves.length === 0 && (e.currentAllocatedHours / e.weeklyCapacityHours) < 0.9)
        .map(e => {
          const matched = (e as any).skills.filter((s: any) => empSkillIds.includes(s.skillId)).length;
          const skillMatch = empSkillIds.length > 0 ? matched / empSkillIds.length : 0.5;
          const avail = 1 - (e.currentAllocatedHours / e.weeklyCapacityHours);
          return { ...e, skillMatch: Math.round(skillMatch * 100), availability: Math.round(avail * 100), score: skillMatch * 0.5 + avail * 0.5 };
        })
        .sort((a, b) => b.score - a.score).slice(0, 3);
      const totalScore = candidates.reduce((s, c) => s + c.score, 0) || 1;
      const riskLevel = totalImpactHours > 40 ? 'Critical' : totalImpactHours > 20 ? 'High' : totalImpactHours > 8 ? 'Medium' : 'Low';
      const delayProbability = Math.min(95, Math.round((leaveDays / 14) * 40 + (impactedTasks.length / 5) * 35 + (totalImpactHours / 80) * 25));
      return {
        leaveId: leave.id,
        employee: { id: emp.id, name: emp.name, role: emp.role, department: emp.department },
        startDate: leave.startDate, endDate: leave.endDate, leaveDays, leaveType: leave.leaveType,
        impactedTasks: impactedTasks.map((t: any) => ({ id: t.id, title: t.title, project: t.project?.name, hours: t.estimatedHours, progress: t.progressPercentage })),
        totalImpactHours: Math.round(totalImpactHours * 10) / 10,
        redistributions: candidates.map(c => ({
          employeeId: c.id, name: c.name, role: c.role, department: c.department,
          skillMatch: c.skillMatch, availability: c.availability,
          currentUtilization: Math.round((c.currentAllocatedHours / c.weeklyCapacityHours) * 100),
          workloadPercent: Math.round((c.score / totalScore) * 100),
          hoursToAbsorb: Math.round((c.score / totalScore) * totalImpactHours * 10) / 10
        })),
        riskLevel, delayProbability
      };
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get('/leaves/alerts', async (req, res) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [leaves, employees, tasks] = await Promise.all([
      prisma.leave.findMany({ include: { employee: true } }),
      prisma.employee.findMany(),
      prisma.task.findMany({ where: { status: { not: 'Completed' } }, include: { assignedEmployee: true } })
    ]);
    const alerts: any[] = [];
    const onLeaveToday = leaves.filter(l => {
      const s = new Date(l.startDate), e = new Date(l.endDate);
      return l.status === 'Approved' && s <= now && e >= now;
    });
    if (onLeaveToday.length > 0 && onLeaveToday.length / employees.length > 0.25) {
      alerts.push({ type: 'shortage', severity: 'critical', title: 'Workforce Shortage Alert', message: `${onLeaveToday.length} employees (${Math.round(onLeaveToday.length / employees.length * 100)}%) are on leave today`, affectedCount: onLeaveToday.length });
    }
    const burnout = employees.filter(e => (e.currentAllocatedHours / e.weeklyCapacityHours) > 0.9);
    if (burnout.length > 0) {
      alerts.push({ type: 'burnout', severity: burnout.length > 3 ? 'high' : 'medium', title: 'Burnout Risk Detected', message: `${burnout.map(e => e.name).slice(0, 3).join(', ')}${burnout.length > 3 ? ` +${burnout.length - 3} more` : ''} at >90% utilization`, affectedEmployees: burnout.map(e => e.name) });
    }
    const upcoming = leaves.filter(l => { const s = new Date(l.startDate); return l.status === 'Approved' && s > now && s <= nextWeek; });
    for (const leave of upcoming.slice(0, 5)) {
      const empTasks = tasks.filter(t => t.assignedEmployeeId === leave.employeeId);
      const critical = empTasks.filter(t => t.priority === 'Urgent' || t.complexity === 'Critical');
      if (critical.length > 0) {
        alerts.push({ type: 'delivery_risk', severity: 'high', title: `Delivery Risk: ${(leave.employee as any)?.name}`, message: `Going on leave ${new Date(leave.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} with ${critical.length} critical task(s) pending`, affectedEmployee: (leave.employee as any)?.name, tasks: critical.map(t => t.title) });
      }
    }
    const pendingLeaves = leaves.filter(l => l.status === 'Pending');
    if (pendingLeaves.length > 3) {
      alerts.push({ type: 'approval', severity: 'low', title: 'Pending Leave Approvals', message: `${pendingLeaves.length} leave requests awaiting approval`, count: pendingLeaves.length });
    }
    res.json(alerts);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get('/leaves', async (req, res) => {
  try {
    const { department, status, leaveType } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (leaveType) where.leaveType = leaveType;
    const leaves = await prisma.leave.findMany({
      where,
      include: { employee: { include: { skills: { include: { skill: true } } } } },
      orderBy: { startDate: 'asc' }
    });
    const filtered = department ? leaves.filter(l => (l.employee as any).department === department) : leaves;
    res.json(filtered);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post('/leaves', async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, halfDay, emergencyLeave, impactLevel } = req.body;
    const leave = await prisma.leave.create({
      data: {
        employeeId, leaveType: leaveType || 'Vacation',
        startDate: new Date(startDate), endDate: new Date(endDate),
        status: 'Pending', reason: reason || null,
        halfDay: halfDay || false, emergencyLeave: emergencyLeave || false,
        impactLevel: impactLevel || 'Low'
      },
      include: { employee: true }
    });
    res.json(leave);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Task impact preview before approving
router.get('/leaves/:id/task-impact', async (req, res) => {
  try {
    const leave = await prisma.leave.findUnique({
      where: { id: req.params.id },
      include: { employee: true }
    });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    const leaveDays = Math.max(1, Math.ceil(
      (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / 86400000
    ) + 1);

    // Fetch all active tasks assigned to this employee (direct + multi-assign)
    const [directTasks, myAssignments] = await Promise.all([
      prisma.task.findMany({
        where: { assignedEmployeeId: leave.employeeId, status: { notIn: ['Completed'] } },
        include: {
          project: true,
          taskAssignments: { include: { employee: { include: { skills: { include: { skill: true } } } } } }
        }
      }),
      prisma.taskAssignment.findMany({
        where: { employeeId: leave.employeeId },
        include: {
          task: {
            include: {
              project: true,
              taskAssignments: { include: { employee: true } }
            }
          }
        }
      })
    ]);

    // Deduplicate
    const taskMap = new Map<string, any>();
    directTasks.forEach(t => taskMap.set(t.id, t));
    myAssignments.forEach(ma => { if (!taskMap.has(ma.taskId)) taskMap.set(ma.taskId, ma.task); });

    const impactedTasks = Array.from(taskMap.values())
      .filter(t => t.status !== 'Completed')
      .map(task => {
        const myAssignment = task.taskAssignments.find((a: any) => a.employeeId === leave.employeeId);
        const others = task.taskAssignments.filter((a: any) => a.employeeId !== leave.employeeId);
        const deadlineDays = Math.max(1, Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000));
        const remainingHours = Math.round(task.estimatedHours * (1 - (task.progressPercentage || 0) / 100) * 10) / 10;
        const myHpd = myAssignment?.allocatedHoursPerDay || Math.round((remainingHours / deadlineDays) * 10) / 10;
        const toRedistribute = Math.round(myHpd * leaveDays * 10) / 10;
        const extraEach = others.length > 0 ? Math.round((toRedistribute / others.length) * 10) / 10 : 0;

        return {
          taskId: task.id,
          taskTitle: task.title,
          project: task.project?.name || '',
          status: task.status,
          estimatedHours: task.estimatedHours,
          progressPercentage: task.progressPercentage,
          remainingHours,
          deadline: task.deadline,
          deadlineDays,
          myHoursPerDay: myHpd,
          hoursToRedistribute: toRedistribute,
          needsReplacement: others.length === 0,
          otherAssignees: others.map((a: any) => ({
            assignmentId: a.id,
            employeeId: a.employeeId,
            name: a.employee.name,
            role: a.employee.role,
            currentHoursPerDay: a.allocatedHoursPerDay || 0,
            newHoursPerDay: Math.round(((a.allocatedHoursPerDay || 0) + extraEach) * 10) / 10,
            extraHoursPerDay: extraEach,
            currentUtilization: Math.round((a.employee.currentAllocatedHours / a.employee.weeklyCapacityHours) * 100)
          }))
        };
      });

    res.json({
      leave: {
        id: leave.id,
        employeeName: (leave.employee as any).name,
        startDate: leave.startDate,
        endDate: leave.endDate,
        leaveDays,
        leaveType: leave.leaveType
      },
      impactedTasks,
      totalAffected: impactedTasks.length,
      needsReplacement: impactedTasks.filter(t => t.needsReplacement).length
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// Approve + apply redistribution atomically
router.post('/leaves/:id/approve-redistribute', async (req, res) => {
  try {
    const { redistribution } = req.body as {
      redistribution: Array<{
        taskId: string;
        assignments: Array<{ assignmentId: string; employeeId: string; newHoursPerDay: number; extraHoursPerDay: number }>;
      }>;
    };

    // 1. Approve the leave
    await prisma.leave.update({
      where: { id: req.params.id },
      data: { status: 'Approved', approvedBy: 'Manager' }
    });

    // 2. Apply each assignment update
    if (redistribution?.length) {
      for (const item of redistribution) {
        for (const a of item.assignments) {
          // Update TaskAssignment hours
          await prisma.taskAssignment.update({
            where: { id: a.assignmentId },
            data: { allocatedHoursPerDay: a.newHoursPerDay }
          });
          // Bump employee allocated hours (weekly proxy: extraHpd × 5 days)
          const emp = await prisma.employee.findUnique({ where: { id: a.employeeId } });
          if (emp) {
            const bump = Math.round(a.extraHoursPerDay * 5);
            await prisma.employee.update({
              where: { id: a.employeeId },
              data: { currentAllocatedHours: Math.min(emp.weeklyCapacityHours, emp.currentAllocatedHours + bump) }
            });
          }
        }
      }
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.put('/leaves/:id/approve', async (req, res) => {
  try {
    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status: 'Approved', approvedBy: req.body.approvedBy || 'Manager' },
      include: { employee: true }
    });
    res.json(leave);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.put('/leaves/:id/reject', async (req, res) => {
  try {
    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status: 'Rejected' },
      include: { employee: true }
    });
    res.json(leave);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete('/leaves/:id', async (req, res) => {
  try {
    await prisma.leave.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

/* ─── Heatmap — real week-by-week weight calculation ─── */

router.get('/heatmap', async (req, res) => {
  try {
    const [employees, tasks, leaves, projects] = await Promise.all([
      prisma.employee.findMany({ include: { skills: { include: { skill: true } } } }),
      prisma.task.findMany({ include: { assignedEmployee: true, project: true } }),
      prisma.leave.findMany({ where: { status: 'Approved' } }),
      prisma.project.findMany(),
    ]);

    const now = new Date();

    // ── Build 4 weekly windows starting from current Monday ──────────────────
    const dayMs = 86_400_000;
    const currentDay = now.getDay(); // 0=Sun,1=Mon...6=Sat
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStarts: Date[] = [];
    for (let w = 0; w < 4; w++) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + daysToMonday + w * 7);
      weekStarts.push(d);
    }
    const weeks = weekStarts.map((start, i) => {
      const end = new Date(start.getTime() + 4 * dayMs); // Friday
      end.setHours(23, 59, 59, 999);
      const labels = ['Current Week', 'Next Week', 'Week 3', 'Week 4'];
      const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return { index: i, label: labels[i], start, end, range: `${fmt(start)} – ${fmt(end)}` };
    });

    // ── Helper: working-day overlap between [rangeStart,rangeEnd] and leave ──
    function leaveOverlapDays(leaveStart: Date, leaveEnd: Date, rangeStart: Date, rangeEnd: Date): number {
      let count = 0;
      const cur = new Date(Math.max(leaveStart.getTime(), rangeStart.getTime()));
      const stop = new Date(Math.min(leaveEnd.getTime(), rangeEnd.getTime()));
      while (cur <= stop) {
        const dow = cur.getDay();
        if (dow >= 1 && dow <= 5) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }

    // ── Employee rows ─────────────────────────────────────────────────────────
    const employeeRows = employees.map(emp => {
      const empTasks = tasks.filter(t =>
        t.assignedEmployeeId === emp.id && t.status !== 'Completed'
      );
      const empLeaves = leaves.filter(l => l.employeeId === emp.id);
      const hoursPerDay = emp.weeklyCapacityHours / 5;

      const weekCells = weeks.map(week => {
        // Task hours due this week (remaining work)
        const weekTasks = empTasks.filter(t => {
          const dl = new Date(t.deadline);
          // Current week also includes overdue tasks (past deadline, still in-progress)
          if (week.index === 0) {
            return dl <= week.end; // all outstanding including overdue
          }
          return dl >= week.start && dl <= week.end;
        });

        const taskHours = weekTasks.reduce((sum, t) => {
          const remaining = 1 - Math.min(1, (t.progressPercentage ?? 0) / 100);
          return sum + t.estimatedHours * remaining;
        }, 0);

        // Leave deduction (working days off × hours/day)
        const leaveDays = empLeaves.reduce((sum, l) =>
          sum + leaveOverlapDays(new Date(l.startDate), new Date(l.endDate), week.start, week.end), 0);
        const leaveHours = leaveDays * hoursPerDay;
        const effectiveCapacity = Math.max(1, emp.weeklyCapacityHours - leaveHours);

        // For current week: blend with live currentAllocatedHours (50/50)
        let rawHours = taskHours;
        if (week.index === 0) {
          rawHours = (taskHours + emp.currentAllocatedHours) / 2;
        }

        const utilization = Math.round((rawHours / effectiveCapacity) * 100);

        // Risk score (0-100): utilization + overdue penalty + leave reduction
        const overdueTasks = weekTasks.filter(t => new Date(t.deadline) < now).length;
        const overdueBonus = Math.min(30, overdueTasks * 10);
        const leaveReduction = leaveDays > 0 ? 10 : 0;
        const riskScore = Math.min(100, Math.round(utilization * 0.6 + overdueBonus + leaveReduction));

        const status: string =
          utilization >= 100 ? 'overloaded' :
          utilization >= 80  ? 'high' :
          utilization >= 50  ? 'moderate' : 'available';

        return {
          utilization,
          riskScore,
          status,
          taskHours: Math.round(taskHours * 10) / 10,
          effectiveCapacity: Math.round(effectiveCapacity),
          leaveDays,
          taskCount: weekTasks.length,
          tasks: weekTasks.slice(0, 5).map(t => ({
            title: t.title,
            project: (t as any).project?.name || '',
            priority: t.priority,
            deadline: t.deadline,
            hours: Math.round(t.estimatedHours * (1 - (t.progressPercentage ?? 0) / 100) * 10) / 10,
          })),
        };
      });

      const burnoutData = ((emp as any).burnoutScore) || null;
      const overallUtil = Math.round((emp.currentAllocatedHours / Math.max(1, emp.weeklyCapacityHours)) * 100);

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        overallUtilization: overallUtil,
        weeklyCapacityHours: emp.weeklyCapacityHours,
        currentAllocatedHours: emp.currentAllocatedHours,
        weeks: weekCells,
      };
    });

    // ── Project rows ──────────────────────────────────────────────────────────
    const projectRows = projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id && t.status !== 'Completed');

      // Capacity = sum of weekly hours for assigned employees (distinct)
      const assigneeIds = [...new Set(projTasks.map(t => t.assignedEmployeeId).filter(Boolean))];
      const totalCapacity = assigneeIds.reduce((sum, id) => {
        const emp = employees.find(e => e.id === id);
        return sum + (emp?.weeklyCapacityHours ?? 40);
      }, 0) || 40; // fallback to 40 if unassigned

      const weekCells = weeks.map(week => {
        const weekTasks = projTasks.filter(t => {
          const dl = new Date(t.deadline);
          return week.index === 0 ? dl <= week.end : dl >= week.start && dl <= week.end;
        });

        const taskHours = weekTasks.reduce((sum, t) => {
          const remaining = 1 - Math.min(1, (t.progressPercentage ?? 0) / 100);
          return sum + t.estimatedHours * remaining;
        }, 0);

        const utilization = Math.round((taskHours / totalCapacity) * 100);
        const blockedCount = weekTasks.filter(t => t.status === 'Blocked' || t.status === 'Delayed').length;
        const riskScore = Math.min(100, Math.round(utilization * 0.5 + blockedCount * 15 + (proj.delayRiskScore ?? 0) * 0.35));
        const status: string =
          utilization >= 100 ? 'overloaded' :
          utilization >= 80  ? 'high' :
          utilization >= 50  ? 'moderate' : 'available';

        return {
          utilization,
          riskScore,
          status,
          taskHours: Math.round(taskHours * 10) / 10,
          effectiveCapacity: totalCapacity,
          blockedCount,
          taskCount: weekTasks.length,
        };
      });

      return {
        id: proj.id,
        name: proj.name,
        status: proj.status,
        priority: proj.priority,
        delayRiskScore: proj.delayRiskScore,
        weeks: weekCells,
      };
    });

    res.json({
      generatedAt: now.toISOString(),
      weeks: weeks.map(w => ({ label: w.label, range: w.range })),
      employees: employeeRows,
      projects: projectRows,
    });
  } catch (e) {
    console.error('[Heatmap]', e);
    res.status(500).json({ error: String(e) });
  }
});

/* ─── Sarvam AI — STT / TTS / Translate ─── */

router.post('/sarvam/stt', async (req, res) => {
  try {
    const { audioBase64, mimeType, languageCode } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 required' });
    const buffer = Buffer.from(audioBase64, 'base64');
    const { sarvamSTT } = await import('../services/sarvamService');
    const transcript = await sarvamSTT(buffer, mimeType || 'audio/webm', languageCode || 'hi-IN');
    res.json({ transcript });
  } catch (e) {
    console.error('Sarvam STT error:', e);
    res.status(500).json({ error: 'Speech-to-text failed' });
  }
});

router.post('/sarvam/tts', async (req, res) => {
  try {
    const { text, languageCode, speaker } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const { sarvamTTS } = await import('../services/sarvamService');
    const audioBase64 = await sarvamTTS(text, languageCode || 'en-IN', speaker || 'meera');
    res.json({ audioBase64 });
  } catch (e) {
    console.error('Sarvam TTS error:', e);
    res.status(500).json({ error: 'Text-to-speech failed' });
  }
});

router.post('/sarvam/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !targetLang) return res.status(400).json({ error: 'text and targetLang required' });
    const { sarvamTranslate } = await import('../services/sarvamService');
    const translated = await sarvamTranslate(text, sourceLang || 'en-IN', targetLang);
    res.json({ translated });
  } catch (e) {
    console.error('Sarvam Translate error:', e);
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
