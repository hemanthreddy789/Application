import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying Indian MNC Configuration...');

  // 1. Set all employees to 50 weekly capacity hours (9 AM to 7 PM = 10 hrs * 5 days)
  await prisma.employee.updateMany({
    data: {
      weeklyCapacityHours: 50
    }
  });
  console.log('Updated all employees to 50 hours weekly capacity (10 hrs/day for 5 days).');

  // 2. Clear existing dummy holidays (optional, but good for clean slate)
  await prisma.holiday.deleteMany({});

  // 3. Indian MNC Calendar (2026 approximate dates)
  const indianHolidays = [
    { name: 'Republic Day', date: new Date('2026-01-26T00:00:00Z'), region: 'India' },
    { name: 'Holi', date: new Date('2026-03-03T00:00:00Z'), region: 'India' },
    { name: 'Good Friday', date: new Date('2026-04-03T00:00:00Z'), region: 'India' },
    { name: 'Eid al-Fitr', date: new Date('2026-03-20T00:00:00Z'), region: 'India' },
    { name: 'Independence Day', date: new Date('2026-08-15T00:00:00Z'), region: 'India' },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02T00:00:00Z'), region: 'India' },
    { name: 'Dussehra', date: new Date('2026-10-19T00:00:00Z'), region: 'India' },
    { name: 'Diwali', date: new Date('2026-11-08T00:00:00Z'), region: 'India' },
    { name: 'Christmas', date: new Date('2026-12-25T00:00:00Z'), region: 'India' }
  ];

  for (const holiday of indianHolidays) {
    await prisma.holiday.create({ data: holiday });
  }
  
  console.log(`Seeded ${indianHolidays.length} Indian MNC Holidays for 2026.`);
  console.log('Configuration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
