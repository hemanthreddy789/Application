import { PrismaClient } from '@prisma/client';

export async function calculateProjectFailureRisk(prisma: PrismaClient) {
  const projects = await prisma.project.findMany({
    include: { 
      tasks: { include: { assignedEmployee: { include: { leaves: { where: { status: 'Approved' } } } } } } 
    }
  });

  return projects.map(project => {
    const totalTasks = project.tasks.length;
    if (totalTasks === 0) {
      return {
        id: project.id,
        name: project.name,
        riskScore: 0,
        confidence: 100,
        riskLevel: 'Safe',
        reasons: ['No tasks assigned to this project.'],
        mitigationRecommendations: []
      };
    }

    const delayedTasks = project.tasks.filter(t => t.status === 'In Progress' && new Date(t.deadline) < new Date()).length;
    const highComplexityTasks = project.tasks.filter(t => t.complexity === 'High' || t.complexity === 'Critical').length;
    
    // Average team utilization for this project
    const assignees = project.tasks.map(t => t.assignedEmployee).filter(Boolean);
    const uniqueAssignees = Array.from(new Set(assignees.map(e => e!.id))).map(id => assignees.find(e => e!.id === id)!);
    
    const avgUtilization = uniqueAssignees.length > 0 
      ? uniqueAssignees.reduce((sum, e) => sum + (e.currentAllocatedHours / e.weeklyCapacityHours), 0) / uniqueAssignees.length
      : 0;

    // Leave conflicts
    const leaveConflicts = project.tasks.filter(t => {
      if (!t.assignedEmployee) return false;
      const deadline = new Date(t.deadline);
      return t.assignedEmployee.leaves.some(leave => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        return deadline >= start && deadline <= end;
      });
    }).length;

    // Remaining effort vs remaining time
    const totalEstimatedHours = project.tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const completedHours = project.tasks.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.estimatedHours, 0);
    const remainingHours = totalEstimatedHours - completedHours;

    const projectDeadline = project.tasks.reduce((max, t) => new Date(t.deadline) > max ? new Date(t.deadline) : max, new Date());
    const now = new Date();
    const remainingDays = Math.max(1, Math.ceil((projectDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const hoursPerDayRequired = remainingHours / remainingDays;

    // Calculate risk score
    let score = 0;
    const reasons: string[] = [];
    const mitigationRecommendations: string[] = [];

    // 1. Delayed Tasks
    if (delayedTasks > 0) {
      score += Math.min(delayedTasks * 15, 30);
      reasons.push(`${delayedTasks} tasks are already delayed`);
      mitigationRecommendations.push('Reschedule delayed tasks or allocate more resources');
    }

    // 2. High Complexity
    if (highComplexityTasks / totalTasks > 0.5) {
      score += 15;
      reasons.push(`More than 50% of tasks are high complexity`);
    }

    // 3. Utilization
    if (avgUtilization >= 1.0) {
      score += 25;
      reasons.push(`Average team utilization is above capacity (${Math.round(avgUtilization * 100)}%)`);
      mitigationRecommendations.push('Offload some tasks to other teams');
    } else if (avgUtilization >= 0.8) {
      score += 10;
    }

    // 4. Leave Conflicts
    if (leaveConflicts > 0) {
      score += Math.min(leaveConflicts * 10, 20);
      reasons.push(`${leaveConflicts} tasks have leave conflicts with assignees`);
      mitigationRecommendations.push('Reassign tasks with leave conflicts');
    }

    // 5. Effort vs Time
    if (hoursPerDayRequired > (uniqueAssignees.length || 1) * 8) {
      score += 30;
      reasons.push(`Remaining effort requires ${Math.round(hoursPerDayRequired)}h/day, exceeding team capacity`);
      mitigationRecommendations.push('Reduce sprint scope or extend the deadline');
    }

    score = Math.min(score, 100);

    let riskLevel = 'Safe';
    if (score >= 70) riskLevel = 'Critical';
    else if (score >= 40) riskLevel = 'Watch';

    return {
      id: project.id,
      name: project.name,
      riskScore: score,
      confidence: 85,
      riskLevel,
      reasons,
      mitigationRecommendations
    };
  });
}
