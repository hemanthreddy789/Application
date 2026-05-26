import { PrismaClient } from '@prisma/client';
import { calculateProjectFailureRisk } from './projectRiskService';

export async function calculateDeliveryConfidence(prisma: PrismaClient) {
  const risks = await calculateProjectFailureRisk(prisma);

  return risks.map(project => {
    const confidenceScore = 100 - project.riskScore;
    
    let confidenceLevel = 'Low Confidence';
    if (confidenceScore >= 90) confidenceLevel = 'Very Confident';
    else if (confidenceScore >= 70) confidenceLevel = 'Confident';
    else if (confidenceScore >= 40) confidenceLevel = 'At Risk';

    return {
      projectId: project.id,
      projectName: project.name,
      confidenceScore,
      confidenceLevel,
      explanation: `Based on a delivery risk score of ${project.riskScore}%. ${project.reasons.join(' ')}`
    };
  });
}
