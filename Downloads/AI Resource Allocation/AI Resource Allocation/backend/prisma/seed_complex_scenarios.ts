import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Injecting multi-project, high-risk, and overload real-world scenarios...');

  const employees = await prisma.employee.findMany();
  const activeProjects = await prisma.project.findMany({ where: { status: 'Active' } });
  
  if (employees.length < 5 || activeProjects.length < 3) {
    console.error('Not enough data to inject scenarios. Please run seed_final_demo.ts first.');
    return;
  }

  const empHero = employees[0]; // The Overworked Hero
  const empDisaster = employees[1]; // The Delayed Disaster
  const empMulti = employees[2]; // The Multi-Project Dev
  
  const p1 = activeProjects[0];
  const p2 = activeProjects[1];
  const p3 = activeProjects[2];

  const now = new Date();
  
  // --- SCENARIO 1: The Overworked Hero ---
  // We assign 3 massive urgent tasks across 3 projects all due in 2 days.
  const twoDays = new Date(now);
  twoDays.setDate(twoDays.getDate() + 2);
  
  await prisma.task.create({
    data: {
      projectId: p1.id, title: 'Critical Server Migration', taskType: 'Backend', complexity: 'Critical', priority: 'Urgent',
      estimatedHours: 40, deadline: twoDays, status: 'In Progress', progressPercentage: 10, dependencyIds: '[]',
      assignedEmployeeId: empHero.id
    }
  });
  await prisma.task.create({
    data: {
      projectId: p2.id, title: 'Emergency Database Patch', taskType: 'Security', complexity: 'High', priority: 'Urgent',
      estimatedHours: 35, deadline: twoDays, status: 'Not Started', progressPercentage: 0, dependencyIds: '[]',
      assignedEmployeeId: empHero.id
    }
  });
  await prisma.task.create({
    data: {
      projectId: p3.id, title: 'Fix P1 Auth Bug', taskType: 'Development', complexity: 'Medium', priority: 'Urgent',
      estimatedHours: 20, deadline: twoDays, status: 'In Progress', progressPercentage: 5, dependencyIds: '[]',
      assignedEmployeeId: empHero.id
    }
  });
  // Total hours assigned: 95 hours. Due in 2 days. Capacity is 50/week. MASSIVE OVERLOAD.

  // --- SCENARIO 2: The Delayed Disaster ---
  // Assign a massive task due TODAY with 0% progress to an employee with poor history.
  await prisma.employee.update({
    where: { id: empDisaster.id },
    data: { onTimeDeliveryRate: 55, averageCompletionSpeed: 1.5, performanceScore: 50 }
  });
  
  await prisma.task.create({
    data: {
      projectId: p1.id, title: 'Implement Payment Gateway', taskType: 'Development', complexity: 'High', priority: 'High',
      estimatedHours: 50, deadline: now, // Due TODAY
      status: 'In Progress', progressPercentage: 5, dependencyIds: '[]',
      assignedEmployeeId: empDisaster.id
    }
  });

  // --- SCENARIO 3: The Multi-Project Switcher ---
  // Normal tasks, but spread across 3 projects to show real-world multi-tasking.
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.task.create({
    data: { projectId: p1.id, title: 'API Documentation', taskType: 'Documentation', complexity: 'Low', priority: 'Low', estimatedHours: 8, deadline: nextWeek, status: 'In Progress', progressPercentage: 50, dependencyIds: '[]', assignedEmployeeId: empMulti.id }
  });
  await prisma.task.create({
    data: { projectId: p2.id, title: 'Unit Tests for Login', taskType: 'Testing', complexity: 'Medium', priority: 'Medium', estimatedHours: 12, deadline: nextWeek, status: 'Not Started', progressPercentage: 0, dependencyIds: '[]', assignedEmployeeId: empMulti.id }
  });
  await prisma.task.create({
    data: { projectId: p3.id, title: 'Code Review PR #402', taskType: 'Analysis', complexity: 'Low', priority: 'High', estimatedHours: 4, deadline: nextWeek, status: 'Completed', progressPercentage: 100, dependencyIds: '[]', assignedEmployeeId: empMulti.id }
  });

  // Re-calculate all currentAllocatedHours for all employees
  for (const emp of employees) {
    const activeTasks = await prisma.task.findMany({
      where: { assignedEmployeeId: emp.id, status: { not: 'Completed' } }
    });
    const totalHours = activeTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    
    await prisma.employee.update({
      where: { id: emp.id },
      data: { currentAllocatedHours: totalHours }
    });
  }

  console.log('Real-world complexity scenarios injected successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
