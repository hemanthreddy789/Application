import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding V3 data...');
  const filePath = path.join(__dirname, '..', '..', 'AI_Allocation_Dataset_V3_Complete.xlsx');
  const workbook = xlsx.readFile(filePath);

  // 1. Skills
  const skillData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets['Skill_Matrix'] || workbook.Sheets[workbook.SheetNames[3]]);
  const createdSkills: Record<string, string> = {};
  for (const s of skillData) {
    if (!s.Skill) continue;
    let skill = await prisma.skill.findUnique({ where: { name: s.Skill } });
    if (!skill) {
      skill = await prisma.skill.create({ data: { name: s.Skill, category: s.Category || 'General' } });
    }
    createdSkills[s.Skill] = skill.id;
  }
  console.log('Skills seeded.');

  // 2. Employees
  const empData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets['Employee_Profiles'] || workbook.Sheets[workbook.SheetNames[1]]);
  const createdEmployees: Record<string, string> = {};
  for (const row of empData) {
    if (!row.EMP_ID) continue;
    const empName = row.Name || row.Full_Name || 'Unknown';
    const emailName = empName.split(' ')[0].toLowerCase() || 'employee';
    const e = await prisma.employee.upsert({
      where: { employeeCode: row.EMP_ID },
      update: {},
      create: {
        employeeCode: row.EMP_ID,
        name: empName,
        email: `${emailName}_${row.EMP_ID}@example.com`,
        role: row.Role || 'Developer',
        department: row.Department || 'General',
        experienceLevel: row.Seniority || 'Mid',
        weeklyCapacityHours: 40,
        currentAllocatedHours: 0, // will be updated
        performanceScore: row.Historical_Performance_Score || 85,
        qualityRating: row.Avg_Quality_Rating || 4.0,
      }
    });
    createdEmployees[row.EMP_ID] = e.id;

    // Skills for this employee
    const skillsStr = row.Primary_Skills || '';
    const skills = skillsStr.split(',').map((s: string) => s.trim());
    for (const skillName of skills) {
      if (createdSkills[skillName]) {
        try {
          await prisma.employeeSkill.create({
            data: {
              employeeId: e.id,
              skillId: createdSkills[skillName],
              proficiencyLevel: 4,
              yearsOfExperience: 3,
            }
          });
        } catch(e) {} // ignore duplicates
      }
    }
  }
  console.log('Employees seeded.');

  // 3. Projects
  const projData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets['Project_Registry'] || workbook.Sheets[workbook.SheetNames[2]]);
  const createdProjects: Record<string, string> = {};
  for (const row of projData) {
    if (!row.Project_ID) continue;
    const p = await prisma.project.create({
      data: {
        name: row.Project_Name,
        status: row.Status || 'Active',
        priority: row.Priority || 'Medium',
        startDate: new Date(),
        delayRiskScore: row.Delay_Risk_Score || 0,
      }
    });
    createdProjects[row.Project_ID] = p.id;
  }
  console.log('Projects seeded.');

  // 4. Tasks
  const taskData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets['Task_History'] || workbook.Sheets[workbook.SheetNames[4]]);
  for (const row of taskData) {
    if (!row.Task_ID) continue;
    const projId = createdProjects[row.Project_ID];
    if (!projId) continue;
    
    let deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const empId = createdEmployees[row.Assigned_EMP_ID];

    try {
      const t = await prisma.task.create({
        data: {
          projectId: projId,
          title: row.Task_Name || 'Imported Task',
          taskType: row.Task_Type || 'Development',
          complexity: row.Complexity || 'Medium',
          priority: row.Priority || 'Medium',
          estimatedHours: row.Est_Hours || 10,
          deadline: deadline,
          assignedEmployeeId: empId || null,
          status: row.Status || 'Completed',
          dependencyIds: '[]'
        }
      });
      
      const reqSkillsStr = row.Required_Skills || '';
      const reqSkills = reqSkillsStr.split(',').map((s: string) => s.trim());
      for (const skillName of reqSkills) {
        if (createdSkills[skillName]) {
          try {
            await prisma.taskRequiredSkill.create({
              data: {
                taskId: t.id,
                skillId: createdSkills[skillName],
                importanceLevel: 'Required'
              }
            });
          } catch(e) {}
        }
      }
    } catch(e) {}
  }
  console.log('Tasks seeded.');

  console.log('V3 Data Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
