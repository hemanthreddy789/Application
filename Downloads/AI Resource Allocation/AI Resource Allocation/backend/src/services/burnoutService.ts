import { PrismaClient } from '@prisma/client';

export async function calculateBurnoutScores(prisma: PrismaClient) {
  const employees = await prisma.employee.findMany({
    include: {
      assignedTasks: { where: { status: { not: 'Completed' } } },
      leaves: { where: { status: 'Approved' } }
    }
  });

  const burnoutData = employees.map(emp => {
    const utilization = emp.currentAllocatedHours / emp.weeklyCapacityHours;
    const highComplexityTasks = emp.assignedTasks.filter(t => t.complexity === 'High' || t.complexity === 'Critical').length;
    const uniqueProjects = new Set(emp.assignedTasks.map(t => t.projectId)).size;

    // Estimate leave gap
    const now = new Date();
    const pastLeaves = emp.leaves.filter(l => new Date(l.endDate) < now);
    const futureLeaves = emp.leaves.filter(l => new Date(l.startDate) > now);

    let daysSinceLastLeave = 999;
    if (pastLeaves.length > 0) {
      const lastLeave = pastLeaves.reduce((latest, cur) => new Date(cur.endDate) > new Date(latest.endDate) ? cur : latest);
      daysSinceLastLeave = Math.ceil((now.getTime() - new Date(lastLeave.endDate).getTime()) / (1000 * 60 * 60 * 24));
    }

    let daysUntilNextLeave = 999;
    if (futureLeaves.length > 0) {
      const nextLeave = futureLeaves.reduce((soonest, cur) => new Date(cur.startDate) < new Date(soonest.startDate) ? cur : soonest);
      daysUntilNextLeave = Math.ceil((new Date(nextLeave.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate score components
    let score = 0;
    const reasons: string[] = [];
    const suggestedActions: string[] = [];

    // 1. Utilization
    if (utilization >= 1.2) {
      score += 40;
      reasons.push(`Utilization above 120% (${Math.round(utilization * 100)}%)`);
      suggestedActions.push('Reassign low-priority tasks');
    } else if (utilization >= 1.0) {
      score += 30;
      reasons.push(`Utilization at capacity (${Math.round(utilization * 100)}%)`);
      suggestedActions.push('Avoid new assignments this week');
    } else if (utilization >= 0.8) {
      score += 15;
      reasons.push(`Utilization above 80% (${Math.round(utilization * 100)}%)`);
    }

    // 2. High Complexity
    if (highComplexityTasks >= 3) {
      score += 20;
      reasons.push(`Assigned to ${highComplexityTasks} high-complexity tasks`);
      suggestedActions.push('Consider breaking down complex tasks');
    } else if (highComplexityTasks > 0) {
      score += 10;
    }

    // 3. Context Switching
    if (uniqueProjects >= 3) {
      score += 20;
      reasons.push(`Assigned to ${uniqueProjects} active projects`);
      suggestedActions.push('Consolidate tasks to fewer projects');
    }

    // 4. Leave Gap
    if (daysSinceLastLeave > 30 && daysUntilNextLeave > 14) {
      score += 20;
      reasons.push(`No leave in last 30 days`);
      suggestedActions.push('Suggest taking a short break or leave');
    }

    // Cap score at 100
    score = Math.min(score, 100);

    let riskLevel = 'Low';
    if (score >= 70) riskLevel = 'High';
    else if (score >= 40) riskLevel = 'Medium';

    return {
      employeeId: emp.id,
      name: emp.name,
      burnoutScore: score,
      riskLevel,
      reasons,
      suggestedActions
    };
  });

  return burnoutData;
}
