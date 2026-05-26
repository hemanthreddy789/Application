import { PrismaClient } from '@prisma/client';
import { getTopRecommendedEmployees } from './recommendationService';

export async function generateRebalancingSuggestions(prisma: PrismaClient) {
  const employees = await prisma.employee.findMany({
    include: {
      assignedTasks: { where: { status: { not: 'Completed' } } }
    }
  });

  const overloadedEmployees = employees.filter(e => (e.currentAllocatedHours / e.weeklyCapacityHours) > 1.0);
  const suggestions: any[] = [];

  for (const emp of overloadedEmployees) {
    for (const task of emp.assignedTasks) {
      // Find better candidates for this task
      const recommendations = await getTopRecommendedEmployees(prisma, task.id);
      
      // Find a candidate who is NOT the current assignee and is NOT overloaded
      const betterCandidate = recommendations.find(r => 
        r.employeeId !== emp.id && 
        ((r.currentAllocatedHours || 0) + task.estimatedHours) / (r.weeklyCapacityHours || 40) <= 1.0
      );

      if (betterCandidate) {
        const fromUtilBefore = Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100);
        const fromUtilAfter = Math.round(((emp.currentAllocatedHours - task.estimatedHours) / emp.weeklyCapacityHours) * 100);
        
        const toUtilBefore = Math.round(((betterCandidate.currentAllocatedHours || 0) / (betterCandidate.weeklyCapacityHours || 40)) * 100);
        const toUtilAfter = Math.round((((betterCandidate.currentAllocatedHours || 0) + task.estimatedHours) / (betterCandidate.weeklyCapacityHours || 40)) * 100);

        suggestions.push({
          id: `reb-${emp.id}-${betterCandidate.employeeId}-${task.id}`,
          taskId: task.id,
          taskTitle: task.title,
          fromEmployeeId: emp.id,
          fromEmployeeName: emp.name,
          toEmployeeId: betterCandidate.employeeId,
          toEmployeeName: betterCandidate.name,
          fromUtilizationBefore: fromUtilBefore,
          fromUtilizationAfter: fromUtilAfter,
          toUtilizationBefore: toUtilBefore,
          toUtilizationAfter: toUtilAfter,
          reason: `${betterCandidate.name} has a ${betterCandidate.skillMatchScore}% skill match and sufficient capacity. Moving this task reduces ${emp.name}'s utilization from ${fromUtilBefore}% to ${fromUtilAfter}%.`
        });
        
        // Only suggest moving ONE task per overloaded employee to avoid churning
        break;
      }
    }
  }

  return suggestions;
}
