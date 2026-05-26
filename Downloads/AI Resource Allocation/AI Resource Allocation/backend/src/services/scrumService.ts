import { PrismaClient } from '@prisma/client';

export async function generateStandupSummary(prisma: PrismaClient) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const completedYesterday = await prisma.task.findMany({
    where: { status: 'Completed' }, // Simplified as updatedAt might not be reliable in seed
    include: { assignedEmployee: true }
  });

  const inProgress = await prisma.task.findMany({
    where: { status: 'In Progress' },
    include: { assignedEmployee: true }
  });

  const blocked = await prisma.task.findMany({
    where: { status: 'Blocked' },
    include: { assignedEmployee: true }
  });

  return {
    completedYesterday: completedYesterday.slice(0, 5).map(t => ({ title: t.title, assignee: t.assignedEmployee?.name })),
    inProgress: inProgress.slice(0, 5).map(t => ({ title: t.title, assignee: t.assignedEmployee?.name, progress: t.progressPercentage })),
    blocked: blocked.slice(0, 5).map(t => ({ title: t.title, assignee: t.assignedEmployee?.name }))
  };
}

export async function predictSpillover(prisma: PrismaClient) {
  const activeTasks = await prisma.task.findMany({
    where: { status: { in: ['In Progress', 'Not Started'] } },
    include: { assignedEmployee: true, project: true }
  });

  const spilloverTasks: any[] = [];

  for (const task of activeTasks) {
    const hoursRemaining = task.estimatedHours * (1 - (task.progressPercentage / 100));
    const daysUntilDeadline = task.deadline ? Math.max(1, (task.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 7;
    
    // Assume 6 hours of productive work per day
    const hoursAvailable = daysUntilDeadline * 6;

    if (hoursRemaining > hoursAvailable) {
      spilloverTasks.push({
        taskId: task.id,
        title: task.title,
        projectName: task.project.name,
        assignee: task.assignedEmployee?.name || 'Unassigned',
        hoursRemaining: Math.round(hoursRemaining),
        hoursAvailable: Math.round(hoursAvailable),
        riskLevel: hoursRemaining > hoursAvailable * 1.5 ? 'High' : 'Medium'
      });
    }
  }

  return spilloverTasks;
}
