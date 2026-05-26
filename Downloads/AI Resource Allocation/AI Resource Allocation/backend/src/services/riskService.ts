import { PrismaClient } from '@prisma/client';

export async function calculateProjectRisks(prisma: PrismaClient) {
  const projects = await prisma.project.findMany({
    include: { tasks: { include: { assignedEmployee: true } } }
  });

  return projects.map(project => {
    let overloadedTaskCount = 0;
    project.tasks.forEach(t => {
      if (t.assignedEmployee && t.assignedEmployee.currentAllocatedHours > t.assignedEmployee.weeklyCapacityHours) {
        overloadedTaskCount++;
      }
    });

    const delayProbability = Math.min(100, (overloadedTaskCount / Math.max(1, project.tasks.length)) * 100 + 10);
    
    let riskLevel = 'Low';
    if (delayProbability > 75) riskLevel = 'Critical';
    else if (delayProbability > 50) riskLevel = 'High';
    else if (delayProbability > 25) riskLevel = 'Medium';

    return {
      id: project.id,
      name: project.name,
      delayProbability: Math.round(delayProbability),
      riskLevel,
      riskReasons: delayProbability > 50 ? [`${overloadedTaskCount} critical tasks depend on overloaded resources.`] : [],
      mitigationActions: delayProbability > 50 ? ['Reassign tasks to available employees'] : []
    };
  });
}
