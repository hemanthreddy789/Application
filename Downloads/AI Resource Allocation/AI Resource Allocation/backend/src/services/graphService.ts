import { PrismaClient } from '@prisma/client';

export async function getGraphData(prisma: PrismaClient) {
  const employees = await prisma.employee.findMany();
  const projects = await prisma.project.findMany();
  const tasks = await prisma.task.findMany({ include: { requiredSkills: true } });
  const skills = await prisma.skill.findMany();
  const employeeSkills = await prisma.employeeSkill.findMany();

  const nodes: any[] = [];
  const edges: any[] = [];

  employees.forEach(e => nodes.push({ id: `emp_${e.id}`, label: e.name, type: 'Employee' }));
  projects.forEach(p => nodes.push({ id: `proj_${p.id}`, label: p.name, type: 'Project' }));
  tasks.forEach(t => nodes.push({ id: `task_${t.id}`, label: t.title, type: 'Task' }));
  skills.forEach(s => nodes.push({ id: `skill_${s.id}`, label: s.name, type: 'Skill' }));

  tasks.forEach(t => {
    edges.push({ source: `task_${t.id}`, target: `proj_${t.projectId}`, label: 'belongs_to' });
    
    if (t.assignedEmployeeId) {
      edges.push({ source: `emp_${t.assignedEmployeeId}`, target: `task_${t.id}`, label: 'assigned_to' });
    }

    t.requiredSkills.forEach(rs => {
      edges.push({ source: `task_${t.id}`, target: `skill_${rs.skillId}`, label: 'requires' });
    });
  });

  employeeSkills.forEach(es => {
    edges.push({ source: `emp_${es.employeeId}`, target: `skill_${es.skillId}`, label: 'has_skill' });
  });

  return { nodes, edges };
}
