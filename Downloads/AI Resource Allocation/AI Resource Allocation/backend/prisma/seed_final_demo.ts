import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Wiping existing data for final strict demo dataset...');

  // Wipe database
  await prisma.taskRequiredSkill.deleteMany();
  await prisma.employeeSkill.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.skill.deleteMany();
  
  console.log('Database wiped. Creating exact dataset...');

  // 1. Create Core Skills
  const skillNames = ['React', 'Node.js', 'Python', 'AWS', 'UI/UX', 'QA', 'DevOps', 'Data Science', 'Security', 'Agile'];
  const skills = [];
  for (const name of skillNames) {
    skills.push(await prisma.skill.create({ data: { name, category: 'Tech' } }));
  }

  // 2. Create EXACTLY 20 Employees
  const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Rohan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv',
                      'Diya', 'Ananya', 'Saanvi', 'Aadhya', 'Priya', 'Riya', 'Kavya', 'Neha', 'Pooja', 'Shruti'];
  const employees = [];
  
  for (let i = 0; i < 20; i++) {
    const e = await prisma.employee.create({
      data: {
        employeeCode: `EMP-10${i}`,
        name: `${firstNames[i]} ${['Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Rao', 'Desai', 'Jain', 'Bose'][i % 10]}`,
        email: `${firstNames[i].toLowerCase()}@example.com`,
        role: i < 5 ? 'Frontend Dev' : i < 10 ? 'Backend Dev' : i < 15 ? 'Full Stack' : i < 18 ? 'QA Engineer' : 'DevOps',
        department: 'Engineering',
        experienceLevel: i % 3 === 0 ? 'Senior' : 'Mid',
        weeklyCapacityHours: 50, // Indian MNC standard
        currentAllocatedHours: 0,
        performanceScore: 70 + Math.floor(Math.random() * 25),
        qualityRating: 3.5 + Math.random(),
        onTimeDeliveryRate: 75 + Math.floor(Math.random() * 20),
        averageCompletionSpeed: 0.8 + (Math.random() * 0.4)
      }
    });
    
    // Assign 2 random skills
    await prisma.employeeSkill.create({
      data: { employeeId: e.id, skillId: skills[i % skills.length].id, proficiencyLevel: 4, yearsOfExperience: 3, isCertified: i % 2 === 0 }
    });
    await prisma.employeeSkill.create({
      data: { employeeId: e.id, skillId: skills[(i + 3) % skills.length].id, proficiencyLevel: 3, yearsOfExperience: 2, isCertified: false }
    });
    
    employees.push(e);
  }

  // 3. Create 12 Projects (4 Complete, 5 Active, 3 Future)
  const projects = [];
  const now = new Date();
  
  // 4 Completed
  for (let i = 0; i < 4; i++) {
    const pDate = new Date(); pDate.setMonth(pDate.getMonth() - 2);
    projects.push(await prisma.project.create({
      data: { name: `Legacy System Phase ${i+1}`, status: 'Completed', priority: 'Medium', startDate: pDate, delayRiskScore: 0 }
    }));
  }
  
  // 5 Active
  for (let i = 0; i < 5; i++) {
    projects.push(await prisma.project.create({
      data: { name: `Active Migration Sprint ${i+1}`, status: 'Active', priority: i === 0 ? 'Urgent' : 'High', startDate: now, delayRiskScore: i === 0 ? 80 : 20 }
    }));
  }
  
  // 3 Future
  for (let i = 0; i < 3; i++) {
    const fDate = new Date(); fDate.setMonth(fDate.getMonth() + 1);
    projects.push(await prisma.project.create({
      data: { name: `Future Expansion Q${i+3}`, status: 'Not Started', priority: 'Medium', startDate: fDate, delayRiskScore: 0 }
    }));
  }

  // 4. Create Tasks and ensure ALL 20 employees get assigned
  let empIndex = 0;

  // For Completed Projects -> All tasks completed
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      await prisma.task.create({
        data: {
          projectId: projects[i].id, title: `Completed Feature ${i}-${j}`, taskType: 'Development', complexity: 'Medium', priority: 'Medium',
          estimatedHours: 20, deadline: new Date(), status: 'Completed', progressPercentage: 100, dependencyIds: '[]',
          assignedEmployeeId: employees[empIndex % 20].id
        }
      });
      empIndex++;
    }
  }

  // For Active Projects -> Mixed tasks (In Progress, Completed, Not Started)
  for (let i = 4; i < 9; i++) {
    for (let j = 0; j < 4; j++) { // 4 tasks per active project
      const due = new Date(); due.setDate(due.getDate() + (j * 2) + 1);
      await prisma.task.create({
        data: {
          projectId: projects[i].id, title: `Active Task ${i}-${j}`, taskType: 'Development', complexity: j === 0 ? 'High' : 'Medium', priority: projects[i].priority,
          estimatedHours: 15, deadline: due, status: j === 0 ? 'Completed' : 'In Progress', progressPercentage: j === 0 ? 100 : 30, dependencyIds: '[]',
          assignedEmployeeId: employees[empIndex % 20].id
        }
      });
      empIndex++;
    }
  }

  // For Future Projects -> All tasks Not Started
  for (let i = 9; i < 12; i++) {
    for (let j = 0; j < 2; j++) {
      const due = new Date(); due.setMonth(due.getMonth() + 2);
      await prisma.task.create({
        data: {
          projectId: projects[i].id, title: `Future Planning ${i}-${j}`, taskType: 'Analysis', complexity: 'Low', priority: 'Medium',
          estimatedHours: 10, deadline: due, status: 'Not Started', progressPercentage: 0, dependencyIds: '[]',
          assignedEmployeeId: employees[empIndex % 20].id
        }
      });
      empIndex++;
    }
  }
  
  // Ensure we wrapped around completely or explicitly assigned the remaining
  while (empIndex < 20) {
    await prisma.task.create({
        data: {
          projectId: projects[4].id, title: `Extra Active Task for ${employees[empIndex].name}`, taskType: 'Development', complexity: 'Medium', priority: 'High',
          estimatedHours: 10, deadline: new Date(new Date().setDate(new Date().getDate() + 5)), status: 'In Progress', progressPercentage: 10, dependencyIds: '[]',
          assignedEmployeeId: employees[empIndex].id
        }
    });
    empIndex++;
  }

  console.log(`Successfully created 12 Projects, 20 Employees, and assigned every employee at least one task!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
