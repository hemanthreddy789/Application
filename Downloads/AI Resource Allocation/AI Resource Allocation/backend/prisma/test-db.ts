import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Testing Prisma connection...');
  const count = await prisma.employee.count();
  console.log('Employee count:', count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
