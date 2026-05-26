import { PrismaClient } from '@prisma/client';

export async function generateBalancingSuggestions(prisma: PrismaClient) {
  const overloaded = await prisma.employee.findMany({
    where: { currentAllocatedHours: { gt: 40 } },
    include: { assignedTasks: true }
  });

  const available = await prisma.employee.findMany({
    where: { currentAllocatedHours: { lt: 30 } },
    include: { skills: { include: { skill: true } } }
  });

  const suggestions = [];

  for (const over of overloaded) {
    if (over.assignedTasks.length > 0 && available.length > 0) {
      // Pick a task to move
      const taskToMove = over.assignedTasks[0];
      const newAssignee = available[0];

      suggestions.push({
        id: `sug-${over.id}-${newAssignee.id}`,
        fromEmployee: over.name,
        toEmployee: newAssignee.name,
        taskTitle: taskToMove.title,
        reason: `${over.name} is at ${Math.round((over.currentAllocatedHours/over.weeklyCapacityHours)*100)}% utilization while ${newAssignee.name} is at ${Math.round((newAssignee.currentAllocatedHours/newAssignee.weeklyCapacityHours)*100)}%.`,
        impactSummary: `Moving this task will reduce ${over.name}'s workload to acceptable levels.`,
        riskReductionScore: 18
      });
    }
  }

  return suggestions;
}
