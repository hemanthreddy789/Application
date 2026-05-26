import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Injecting precision test scenarios for MVP demonstration...');

  const employees = await prisma.employee.findMany({ take: 3 });
  if (employees.length < 3) return;

  const empA = employees[0]; // The Reliable Overworked Dev
  const empB = employees[1]; // The Vacationer
  const empC = employees[2]; // The Historically Slow Dev

  // --- Scenario 1: The Reliable Overworked Dev (Triggers Crunch Time) ---
  await prisma.employee.update({
    where: { id: empA.id },
    data: { onTimeDeliveryRate: 98, averageCompletionSpeed: 0.8, performanceScore: 95 }
  });

  const proj1 = await prisma.project.create({
    data: { name: 'Q3 Emergency Patch', priority: 'Urgent', status: 'Active', startDate: new Date() }
  });

  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  await prisma.task.create({
    data: {
      projectId: proj1.id,
      title: 'Fix Critical Auth Vulnerability',
      taskType: 'Security',
      complexity: 'Critical',
      priority: 'Urgent',
      estimatedHours: 15,
      deadline: twoDaysFromNow,
      assignedEmployeeId: empA.id,
      status: 'In Progress',
      progressPercentage: 20,
      dependencyIds: '[]'
    }
  });

  // --- Scenario 2: The Vacationer (Triggers Leave Collision) ---
  const vacStart = new Date();
  vacStart.setDate(vacStart.getDate() + 1);
  const vacEnd = new Date();
  vacEnd.setDate(vacEnd.getDate() + 7);

  await prisma.leave.create({
    data: {
      employeeId: empB.id,
      startDate: vacStart,
      endDate: vacEnd,
      leaveType: 'Vacation',
      status: 'Approved'
    }
  });

  const proj2 = await prisma.project.create({
    data: { name: 'Standard Maintenance', priority: 'Medium', status: 'Active', startDate: new Date() }
  });

  await prisma.task.create({
    data: {
      projectId: proj2.id,
      title: 'Routine Database Backup Update',
      taskType: 'DevOps',
      complexity: 'Low',
      priority: 'Medium',
      estimatedHours: 8,
      deadline: vacEnd, // Due on their last day of vacation
      assignedEmployeeId: empB.id,
      status: 'Not Started',
      progressPercentage: 0,
      dependencyIds: '[]'
    }
  });

  // --- Scenario 3: The Historically Slow Dev (Triggers History Delay Risk) ---
  await prisma.employee.update({
    where: { id: empC.id },
    data: { onTimeDeliveryRate: 65, averageCompletionSpeed: 1.4, performanceScore: 60 } // Very poor history
  });

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  await prisma.task.create({
    data: {
      projectId: proj2.id,
      title: 'Complete System Migration',
      taskType: 'Backend',
      complexity: 'High',
      priority: 'High',
      estimatedHours: 35, // Very large task
      deadline: threeDaysFromNow, // Very short deadline
      assignedEmployeeId: empC.id,
      status: 'In Progress',
      progressPercentage: 5,
      dependencyIds: '[]'
    }
  });

  console.log('Precision demonstration scenarios injected successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
