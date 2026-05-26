import { PrismaClient } from '@prisma/client';

export async function getSkillProgression(prisma: PrismaClient, employeeId: string) {
  // Use any to bypass type check if client not generated yet
  const progression = await (prisma as any).skillProgression.findMany({
    where: { employeeId },
    include: { skill: true },
    orderBy: { date: 'asc' }
  });

  return progression;
}

export async function predictSkillGaps(prisma: PrismaClient) {
  const tasks = await prisma.task.findMany({
    where: { status: { not: 'Completed' } },
    include: { requiredSkills: { include: { skill: true } } }
  });

  const requiredSkills: Record<string, { name: string, count: number }> = {};
  for (const t of tasks) {
    for (const rs of t.requiredSkills) {
      if (!requiredSkills[rs.skillId]) {
        requiredSkills[rs.skillId] = { name: rs.skill.name, count: 0 };
      }
      requiredSkills[rs.skillId].count++;
    }
  }

  const skills = Object.keys(requiredSkills);
  const gaps: any[] = [];

  for (const sid of skills) {
    const employeesWithSkill = await prisma.employeeSkill.count({
      where: { skillId: sid, proficiencyLevel: { gte: 3 } }
    });

    if (employeesWithSkill < 2) {
      gaps.push({
        skillId: sid,
        skillName: requiredSkills[sid].name,
        requiredInTasks: requiredSkills[sid].count,
        expertsAvailable: employeesWithSkill,
        riskLevel: employeesWithSkill === 0 ? 'High' : 'Medium'
      });
    }
  }

  return gaps;
}
