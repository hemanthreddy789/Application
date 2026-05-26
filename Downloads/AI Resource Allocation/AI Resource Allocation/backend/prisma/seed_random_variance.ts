import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying extreme variance and chaos to the dataset...');

  const employees = await prisma.employee.findMany();
  const tasks = await prisma.task.findMany({ where: { status: { not: 'Completed' } } });
  
  if (employees.length === 0 || tasks.length === 0) return;

  // 1. Extreme variance in Employee History
  for (const emp of employees) {
    const isRockstar = Math.random() > 0.8;
    const isStruggling = Math.random() < 0.2;
    
    let onTime = 80 + Math.floor(Math.random() * 15);
    let speed = 0.9 + (Math.random() * 0.2);
    let perf = 80 + Math.floor(Math.random() * 15);

    if (isRockstar) {
      onTime = 95 + Math.floor(Math.random() * 5);
      speed = 0.6 + (Math.random() * 0.2); // super fast
      perf = 95 + Math.floor(Math.random() * 5);
    } else if (isStruggling) {
      onTime = 40 + Math.floor(Math.random() * 30);
      speed = 1.3 + (Math.random() * 0.4); // super slow
      perf = 40 + Math.floor(Math.random() * 30);
    }

    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        onTimeDeliveryRate: onTime,
        averageCompletionSpeed: speed,
        performanceScore: perf
      }
    });
  }

  // 2. Extreme variance in Active Tasks
  const complexities = ['Low', 'Medium', 'High', 'Critical'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  
  for (const task of tasks) {
    // 10% chance task is heavily overdue
    // 20% chance task is due tomorrow
    // 70% chance normal spread
    
    const r = Math.random();
    const deadline = new Date();
    
    if (r < 0.1) {
      deadline.setDate(deadline.getDate() - Math.floor(Math.random() * 5) - 1); // 1 to 5 days overdue
    } else if (r < 0.3) {
      deadline.setDate(deadline.getDate() + 1); // Due tomorrow
    } else {
      deadline.setDate(deadline.getDate() + Math.floor(Math.random() * 30)); // 0 to 30 days out
    }

    // Randomize progress, est hours
    const progress = Math.floor(Math.random() * 90); // 0 to 89%
    const estHours = [4, 8, 12, 20, 35, 50, 80][Math.floor(Math.random() * 7)];
    
    const comp = complexities[Math.floor(Math.random() * complexities.length)];
    const prio = priorities[Math.floor(Math.random() * priorities.length)];

    await prisma.task.update({
      where: { id: task.id },
      data: {
        deadline,
        progressPercentage: progress,
        estimatedHours: estHours,
        complexity: comp,
        priority: prio
      }
    });
  }

  // 3. Recalculate Workloads
  for (const emp of employees) {
    const activeTasks = await prisma.task.findMany({
      where: { assignedEmployeeId: emp.id, status: { not: 'Completed' } }
    });
    const totalHours = activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    
    await prisma.employee.update({
      where: { id: emp.id },
      data: { currentAllocatedHours: totalHours }
    });
  }

  console.log('Dataset randomized successfully with extreme real-world variance!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
