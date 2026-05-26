import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Extreme Level Seeding...');

  // Clear existing data
  console.log('🧹 Cleaning existing data...');
  const tablenames = [
    'NotificationPreference', 'Notification', 'AnalyticsCache', 'OverridePattern', 
    'FeedbackEvent', 'WorkloadForecast', 'DelayPrediction', 'TaskDependency', 
    'MlPrediction', 'MlModel', 'ScoringConfig', 'ChatMessage', 'BalancingSuggestion', 
    'WorkloadSnapshot', 'Recommendation', 'Holiday', 'Leave', 'TimeLog', 
    'TaskRequiredSkill', 'Task', 'Project', 'EmployeeSkill', 'Skill', 'Employee', 'User'
  ];

  for (const tablename of tablenames) {
    try {
      await (prisma as any)[tablename.charAt(0).toLowerCase() + tablename.slice(1)].deleteMany();
    } catch (e) {
      console.warn(`Could not clear table ${tablename}:`, e);
    }
  }

  // 1. Scoring Config
  console.log('⚙️ Creating Scoring Config...');
  await prisma.scoringConfig.create({
    data: {
      skillMatchWeight: 0.45,
      availabilityWeight: 0.35,
      performanceWeight: 0.15,
      deadlineCompatibilityWeight: 0.05,
      updatedBy: 'system_admin',
    },
  });

  // 2. Skills
  console.log('🛠️ Seeding Skills...');
  const skillsData = [
    { name: 'Node.js', category: 'Backend' },
    { name: 'Python', category: 'Backend' },
    { name: 'Go', category: 'Backend' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'Redis', category: 'Database' },
    { name: 'React', category: 'Frontend' },
    { name: 'Vue.js', category: 'Frontend' },
    { name: 'TypeScript', category: 'Frontend' },
    { name: 'Tailwind CSS', category: 'Frontend' },
    { name: 'Figma', category: 'Design' },
    { name: 'Adobe XD', category: 'Design' },
    { name: 'AWS', category: 'DevOps' },
    { name: 'Azure', category: 'DevOps' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Kubernetes', category: 'DevOps' },
    { name: 'Terraform', category: 'DevOps' },
    { name: 'Cypress', category: 'QA' },
    { name: 'Jest', category: 'QA' },
    { name: 'Selenium', category: 'QA' },
    { name: 'PyTorch', category: 'ML' },
    { name: 'TensorFlow', category: 'ML' },
    { name: 'Scikit-learn', category: 'ML' },
    { name: 'Jira', category: 'Product' },
    { name: 'Agile/Scrum', category: 'Product' },
    { name: 'System Architecture', category: 'Engineering' },
    { name: 'Microservices', category: 'Engineering' },
    { name: 'GraphQL', category: 'API' },
    { name: 'gRPC', category: 'API' },
    { name: 'OpenAPI/Swagger', category: 'API' }
  ];

  const skillMap: Record<string, string> = {};
  for (const s of skillsData) {
    const created = await prisma.skill.create({ data: s });
    skillMap[s.name] = created.id;
  }
  const allSkillIds = Object.values(skillMap);

  // Create a skill that NO employee has to trigger skill gap
  const gapSkill = await prisma.skill.create({ data: { name: 'Quantum Computing', category: 'Specialized' } });

  // 3. Employees & Users
  console.log('👥 Seeding Employees & Users (50 total)...');
  const departments = ['Engineering', 'Product', 'Design', 'QA', 'DevOps', 'Data Science'];
  const experienceLevels = ['Junior', 'Mid', 'Senior', 'Expert'];
  const roles = [
    'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 
    'Product Manager', 'UI/UX Designer', 'QA Automation Engineer', 
    'DevOps Engineer', 'Data Scientist', 'ML Engineer'
  ];

  const properNames = [
    'Arjun Mehta', 'Priya Sharma', 'Rohan Verma', 'Aanya Iyer', 'Karan Malhotra',
    'Sneha Rao', 'Aditya Nair', 'Ananya Gupta', 'Vikram Singh', 'Meera Joshi',
    'Sarah Jenkins', 'Alex Mercer', 'Yuki Tanaka', 'Carlos Silva', 'David Chen',
    'Emily Watson', 'Michael Chang', 'Fatima Al-Sayed', 'Hans Schmidt', 'Jean Dupont',
    'Deepak Kumar', 'Sanjay Dutt', 'Nisha Patel', 'Kunal Sen', 'Pooja Reddy',
    'Amit Patel', 'Aarav Sharma', 'Kiara Advani', 'Vihaan Kapoor', 'Kabir Bedi',
    'Ishaan Roy', 'Aaliyah Khan', 'Siddharth Sen', 'Zara Sheikh', 'Rhea Pillai',
    'Devendra Fadnavis', 'Narendra Modi', 'Shreya Ghoshal', 'Arijit Singh', 'Amitabh Bachchan',
    'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown', 'Diana Prince',
    'Bruce Wayne', 'Clark Kent', 'Peter Parker', 'Tony Stark', 'Steve Rogers'
  ];

  const createdEmployees: any[] = [];
  for (let i = 1; i <= 50; i++) {
    const name = properNames[i - 1] || `Employee ${i}`;
    const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@enterprise-ai.demo`;
    const role = roles[Math.floor(Math.random() * roles.length)];
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const exp = experienceLevels[Math.floor(Math.random() * experienceLevels.length)];
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: i === 1 ? 'super_admin' : (i <= 5 ? 'tenant_admin' : (i <= 15 ? 'manager' : 'Employee')),
        passwordHash: 'hashed_password_123',
      }
    });

    const emp = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: `E${1000 + i}`,
        name,
        email,
        role,
        department: dept,
        experienceLevel: exp,
        weeklyCapacityHours: 40,
        currentAllocatedHours: 0, // Will update after tasks
        performanceScore: 70 + Math.random() * 30,
        qualityRating: 3.5 + Math.random() * 1.5,
        onTimeDeliveryRate: 75 + Math.random() * 25,
        averageCompletionSpeed: 0.8 + Math.random() * 0.4,
      }
    });
    createdEmployees.push(emp);

    // Random skills (2-5 per employee)
    const numSkills = 2 + Math.floor(Math.random() * 4);
    const shuffledSkills = [...allSkillIds].sort(() => 0.5 - Math.random());
    const selectedSkills = shuffledSkills.slice(0, numSkills);

    for (const sid of selectedSkills) {
      await prisma.employeeSkill.create({
        data: {
          employeeId: emp.id,
          skillId: sid,
          proficiencyLevel: 2 + Math.floor(Math.random() * 4),
          yearsOfExperience: 1 + Math.floor(Math.random() * 8),
          isCertified: Math.random() > 0.8
        }
      });
    }
  }

  // 4. Projects
  console.log('📁 Seeding Projects (15 total)...');
  const projectStatuses = ['Active', 'Active', 'Active', 'AtRisk', 'Completed'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  
  const createdProjects: any[] = [];
  for (let i = 1; i <= 15; i++) {
    const proj = await prisma.project.create({
      data: {
        name: `Project ${String.fromCharCode(64 + i)} - ${['Modernization', 'Revamp', 'Platform', 'Engine', 'Portal'][i % 5]}`,
        description: `High-priority enterprise project focused on ${['scalability', 'user experience', 'efficiency', 'security', 'data insights'][i % 5]}.`,
        status: projectStatuses[Math.floor(Math.random() * projectStatuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        startDate: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)),
        endDate: new Date(Date.now() + (Math.random() * 90 * 24 * 60 * 60 * 1000)),
        delayRiskScore: Math.random() * 100,
        budget: 50000 + Math.random() * 50000,
        currentCost: i === 1 ? 120000 : (10000 + Math.random() * 40000), // Force Project 1 to be over budget!
      }
    });
    createdProjects.push(proj);
  }

  // 5. Tasks
  console.log('📝 Seeding Tasks (120 total)...');
  const taskTypes = ['Development', 'Design', 'Testing', 'DevOps', 'Analysis', 'Integration', 'ML Research'];
  const taskStatuses = ['In Progress', 'Not Started', 'Completed', 'Blocked', 'Delayed'];
  
  for (let i = 1; i <= 120; i++) {
    // Force first project to be at risk by assigning many tasks to it
    const proj = i <= 10 ? createdProjects[0] : createdProjects[Math.floor(Math.random() * createdProjects.length)];
    const status = i <= 5 ? 'Delayed' : taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
    
    // Force Employee 1 to be overloaded
    const assignedEmp = i <= 5 ? createdEmployees[0] : (status !== 'Not Started' || Math.random() > 0.3 ? createdEmployees[Math.floor(Math.random() * createdEmployees.length)] : null);
    
    // Create past deadlines for delayed tasks to trigger risk engine
    const deadline = (status === 'Delayed' || i <= 5)
      ? new Date(Date.now() - (Math.random() * 10 * 24 * 60 * 60 * 1000)) // Past
      : (i === 7 ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : new Date(Date.now() + (Math.random() * 60 * 24 * 60 * 60 * 1000))); // Task 7 has 2 days deadline!

    const task = await prisma.task.create({
      data: {
        projectId: proj.id,
        title: i === 6 ? 'Task 6: Quantum Algorithm Research' : (i === 7 ? 'Task 7: Massive Spillover Task' : `Task ${i}: ${['Implement', 'Refactor', 'Design', 'Verify', 'Deploy', 'Analyze'][i % 6]} ${['Auth', 'Payment', 'Dashboard', 'Worker', 'Schema', 'API'][i % 6]}`),
        taskType: taskTypes[Math.floor(Math.random() * taskTypes.length)],
        complexity: i <= 5 ? 'High' : experienceLevels[Math.floor(Math.random() * experienceLevels.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        estimatedHours: i === 7 ? 100 : (i <= 5 ? 15 : (4 + Math.floor(Math.random() * 36))), // Task 7 has 100 hours!
        deadline,
        assignedEmployeeId: assignedEmp?.id || null,
        status: i === 7 ? 'In Progress' : status,
        progressPercentage: i === 7 ? 10 : (status === 'Completed' ? 100 : (status === 'In Progress' ? Math.floor(Math.random() * 90) : 0)),
        dependencyIds: '[]',
      }
    });

    // Update employee allocation
    if (assignedEmp && status !== 'Completed') {
      await prisma.employee.update({
        where: { id: assignedEmp.id },
        data: { currentAllocatedHours: { increment: task.estimatedHours } }
      });
    }

    // Task required skills (1-3)
    const numReqSkills = i === 6 ? 1 : 1 + Math.floor(Math.random() * 3);
    const shuffledSkills = [...allSkillIds].sort(() => 0.5 - Math.random());
    for (let j = 0; j < numReqSkills; j++) {
      await prisma.taskRequiredSkill.create({
        data: {
          taskId: task.id,
          skillId: i === 6 ? (gapSkill as any).id : shuffledSkills[j],
          importanceLevel: i === 6 ? 'Critical' : ['Required', 'Required', 'Critical', 'NiceToHave'][j % 4]
        }
      });
    }
  }

  // 6. Leave & Holidays
  console.log('🏖️ Seeding Leave & Holidays...');
  const leaveTypes = ['Vacation', 'Sick', 'Personal', 'Parental', 'Sabbatical'];
  for (let i = 0; i < 20; i++) {
    const emp = createdEmployees[Math.floor(Math.random() * createdEmployees.length)];
    const start = new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000);
    await prisma.leave.create({
      data: {
        employeeId: emp.id,
        startDate: start,
        endDate: end,
        leaveType: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],
        status: Math.random() > 0.2 ? 'Approved' : 'Pending'
      }
    });
  }

  const holidays = [
    { name: 'New Year Day', date: new Date('2026-01-01') },
    { name: 'Global Tech Holiday', date: new Date('2026-05-20') },
    { name: 'Independence Day', date: new Date('2026-07-04') },
    { name: 'Labor Day', date: new Date('2026-09-01') },
    { name: 'Thanksgiving', date: new Date('2026-11-26') },
    { name: 'Christmas', date: new Date('2026-12-25') }
  ];
  for (const h of holidays) {
    await prisma.holiday.create({ data: h });
  }

  // 7. Workload Snapshots & Forecasts
  console.log('📈 Seeding Workload Snapshots & Forecasts...');
  for (const emp of createdEmployees) {
    // Past Snapshots (4 weeks)
    for (let w = 0; w < 4; w++) {
      const date = new Date();
      date.setDate(date.getDate() - (w * 7));
      const allocated = 20 + Math.floor(Math.random() * 30);
      await prisma.workloadSnapshot.create({
        data: {
          employeeId: emp.id,
          weekStartDate: date,
          allocatedHours: allocated,
          capacityHours: 40,
          utilizationPercentage: (allocated / 40) * 100,
          status: allocated > 45 ? 'Overloaded' : (allocated > 35 ? 'Balanced' : 'Available')
        }
      });
    }
    // Future Forecasts (4 weeks)
    for (let w = 1; w <= 4; w++) {
      const date = new Date();
      date.setDate(date.getDate() + (w * 7));
      await prisma.workloadForecast.create({
        data: {
          employeeId: emp.id,
          forecastDate: date,
          predictedCapacity: 30 + Math.random() * 15,
          confidenceLower: 0.7,
          confidenceUpper: 0.9,
          modelVersion: 1
        }
      });
    }
  }

  // 8. ML Data (Models & Predictions)
  console.log('🧠 Seeding ML Models & Predictions...');
  const model = await prisma.mlModel.create({
    data: {
      version: 1,
      trainedAt: new Date(),
      trainingSampleSize: 1500,
      featureImportances: JSON.stringify({ skillMatch: 0.4, availability: 0.3, performance: 0.2, experience: 0.1 }),
      validationRmse: 0.12,
      isActive: true
    }
  });

  const allTasks = await prisma.task.findMany();
  for (let i = 0; i < 30; i++) {
    const task = allTasks[Math.floor(Math.random() * allTasks.length)];
    const emp = createdEmployees[Math.floor(Math.random() * createdEmployees.length)];
    
    await prisma.mlPrediction.create({
      data: {
        taskId: task.id,
        employeeId: emp.id,
        modelVersion: 1,
        featureVector: JSON.stringify([0.8, 0.5, 0.9, 0.7]),
        rawPrediction: 85.5,
        finalScore: 88.2,
        confidence: 0.92,
        usedFallback: false
      }
    });

    if (Math.random() > 0.5) {
      await prisma.delayPrediction.create({
        data: {
          taskId: task.id,
          projectId: task.projectId,
          delayProbability: Math.random(),
          riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          topRiskFactors: JSON.stringify(['Skill mismatch', 'Overloaded assignee']),
          recommendedActions: JSON.stringify(['Reassign to Employee 5', 'Extend deadline']),
          modelVersion: 1
        }
      });
    }
  }

  // 9. Feedback & Overrides
  console.log('🔄 Seeding Feedback & Overrides...');
  const managers = createdEmployees.filter((_, idx) => idx >= 5 && idx < 15);
  for (let i = 0; i < 20; i++) {
    const task = allTasks[Math.floor(Math.random() * allTasks.length)];
    const recEmp = createdEmployees[Math.floor(Math.random() * createdEmployees.length)];
    const actualEmp = Math.random() > 0.3 ? recEmp : createdEmployees[Math.floor(Math.random() * createdEmployees.length)];
    const manager = managers[Math.floor(Math.random() * managers.length)];

    await prisma.feedbackEvent.create({
      data: {
        eventType: recEmp.id === actualEmp.id ? 'accepted' : 'overridden',
        taskId: task.id,
        recommendedEmployeeId: recEmp.id,
        actualEmployeeId: actualEmp.id,
        managerId: manager.id,
        overrideReason: recEmp.id === actualEmp.id ? null : 'Better specific domain experience',
        outcomeQuality: 4.0 + Math.random(),
        outcomeOnTime: Math.random() > 0.2
      }
    });

    if (recEmp.id !== actualEmp.id) {
      await prisma.overridePattern.create({
        data: {
          managerId: manager.id,
          taskType: task.taskType,
          overrideReason: 'Domain Expertise Preference',
          recommendedEmployeeId: recEmp.id,
          chosenEmployeeId: actualEmp.id,
          outcomeWasBetter: true,
          count: 1
        }
      });
    }
  }

  console.log('✨ Extreme Level Seeding Complete! Enjoy the experience.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
