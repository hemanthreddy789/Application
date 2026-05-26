import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Certifications and Advanced Skill Data...');

  const employeeSkills = await prisma.employeeSkill.findMany();
  
  for (const es of employeeSkills) {
    // Randomly assign certifications to some skills
    const isCert = Math.random() > 0.6; // 40% chance to be certified
    const yrsExp = Math.round((Math.random() * 8 + 1) * 10) / 10; // 1 to 9 years

    await prisma.employeeSkill.update({
      where: { id: es.id },
      data: {
        isCertified: isCert,
        yearsOfExperience: yrsExp
      }
    });
  }

  console.log('Updated Employee Skills with Certification status and Years of Experience.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
