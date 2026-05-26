import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Leaves and Holidays...');

  // 1. Create a company holiday for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await prisma.holiday.create({
    data: {
      name: 'Company Wellness Day',
      date: tomorrow,
      region: 'Global'
    }
  });
  console.log(`Added Holiday: Company Wellness Day on ${tomorrow.toISOString().split('T')[0]}`);

  // 2. Add Sick Leave and Vacation for random employees
  const employees = await prisma.employee.findMany({ take: 3 });

  if (employees.length >= 1) {
    const sickStart = new Date();
    sickStart.setDate(sickStart.getDate() + 2); // 2 days from now
    const sickEnd = new Date(sickStart);
    sickEnd.setDate(sickEnd.getDate() + 1); // 2 days of sick leave

    await prisma.leave.create({
      data: {
        employeeId: employees[0].id,
        startDate: sickStart,
        endDate: sickEnd,
        leaveType: 'Sick',
        status: 'Approved'
      }
    });
    console.log(`Added Sick Leave for ${employees[0].name}`);
  }

  if (employees.length >= 2) {
    const vacStart = new Date();
    vacStart.setDate(vacStart.getDate() + 5); // 5 days from now
    const vacEnd = new Date(vacStart);
    vacEnd.setDate(vacEnd.getDate() + 5); // 5 days vacation

    await prisma.leave.create({
      data: {
        employeeId: employees[1].id,
        startDate: vacStart,
        endDate: vacEnd,
        leaveType: 'Vacation',
        status: 'Approved'
      }
    });
    console.log(`Added Vacation Leave for ${employees[1].name}`);
  }

  console.log('Finished seeding real-life unavailability data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
