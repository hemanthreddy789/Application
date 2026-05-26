import { PrismaClient } from '@prisma/client';

export async function getProjectFinancials(prisma: PrismaClient) {
  const projects = await prisma.project.findMany();

  return projects.map(p => {
    const budget = (p as any).budget || 0;
    const cost = (p as any).currentCost || 0;
    const variance = budget - cost;
    const isOverBudget = cost > budget;

    return {
      projectId: p.id,
      projectName: p.name,
      budget,
      currentCost: cost,
      variance,
      isOverBudget,
      riskLevel: isOverBudget ? 'High' : (variance < budget * 0.1 ? 'Medium' : 'Low')
    };
  });
}
