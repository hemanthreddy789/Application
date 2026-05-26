import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding realistic company dataset...');

  // Wipe
  await prisma.taskRequiredSkill.deleteMany();
  await prisma.employeeSkill.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.skill.deleteMany();

  // ─── SKILLS ───────────────────────────────────────────────
  const skillDefs = ['React','Node.js','Python','AWS','DevOps','QA Testing','UI/UX Design','Data Science','Cybersecurity','PostgreSQL','Docker','TypeScript'];
  const skills: Record<string,any> = {};
  for (const name of skillDefs) {
    skills[name] = await prisma.skill.create({ data: { name, category: 'Technical' } });
  }

  // ─── EMPLOYEES (20) with role-specific skills ─────────────
  type EmpDef = { name:string; role:string; perf:number; onTime:number; speed:number; skills:string[]; allocHours:number };
  const empDefs: EmpDef[] = [
    // Frontend Devs
    { name:'Aarav Sharma',    role:'Frontend Dev',  perf:92, onTime:94, speed:0.85, skills:['React','TypeScript','UI/UX Design'], allocHours:20 },
    { name:'Diya Patel',      role:'Frontend Dev',  perf:55, onTime:48, speed:1.45, skills:['React','UI/UX Design'],              allocHours:45 },
    { name:'Priya Verma',     role:'Frontend Dev',  perf:78, onTime:82, speed:1.05, skills:['React','TypeScript'],                allocHours:30 },
    { name:'Ananya Jain',     role:'Frontend Dev',  perf:88, onTime:90, speed:0.90, skills:['React','UI/UX Design','TypeScript'], allocHours:10 },
    // Backend Devs
    { name:'Vihaan Gupta',    role:'Backend Dev',   perf:95, onTime:96, speed:0.75, skills:['Node.js','PostgreSQL','Docker'],     allocHours:50 },
    { name:'Arjun Rao',       role:'Backend Dev',   perf:60, onTime:55, speed:1.40, skills:['Node.js','Python'],                  allocHours:60 },
    { name:'Sai Kumar',       role:'Backend Dev',   perf:83, onTime:85, speed:1.00, skills:['Node.js','PostgreSQL'],              allocHours:25 },
    { name:'Rohan Desai',     role:'Backend Dev',   perf:70, onTime:72, speed:1.10, skills:['Python','PostgreSQL'],               allocHours:35 },
    // Full Stack
    { name:'Krishna Bose',    role:'Full Stack',    perf:90, onTime:91, speed:0.88, skills:['React','Node.js','PostgreSQL'],      allocHours:40 },
    { name:'Ishaan Singh',    role:'Full Stack',    perf:76, onTime:78, speed:1.08, skills:['React','Node.js','TypeScript'],      allocHours:20 },
    { name:'Shaurya Sharma',  role:'Full Stack',    perf:85, onTime:87, speed:0.95, skills:['React','Node.js','Docker'],          allocHours:15 },
    { name:'Atharv Verma',    role:'Full Stack',    perf:62, onTime:58, speed:1.35, skills:['Node.js','React'],                   allocHours:55 },
    // DevOps
    { name:'Saanvi Gupta',    role:'DevOps',        perf:91, onTime:93, speed:0.80, skills:['AWS','Docker','DevOps'],             allocHours:10 },
    { name:'Aadhya Patel',    role:'DevOps',        perf:72, onTime:70, speed:1.15, skills:['AWS','DevOps'],                      allocHours:30 },
    // QA Engineers
    { name:'Riya Jain',       role:'QA Engineer',   perf:87, onTime:89, speed:0.92, skills:['QA Testing','Python'],              allocHours:20 },
    { name:'Kavya Rao',       role:'QA Engineer',   perf:65, onTime:60, speed:1.30, skills:['QA Testing'],                       allocHours:45 },
    { name:'Neha Kumar',      role:'QA Engineer',   perf:80, onTime:83, speed:1.00, skills:['QA Testing','Python'],               allocHours:10 },
    // Data / Security
    { name:'Pooja Desai',     role:'Data Scientist', perf:88, onTime:88, speed:0.93, skills:['Python','Data Science','PostgreSQL'], allocHours:25 },
    { name:'Shruti Singh',    role:'Security Eng',  perf:93, onTime:95, speed:0.78, skills:['Cybersecurity','Python','AWS'],      allocHours:15 },
    { name:'Aditya Bose',     role:'Full Stack',    perf:79, onTime:80, speed:1.02, skills:['React','Node.js','TypeScript'],      allocHours:30 },
  ];

  const employees: Record<string,any> = {};
  for (let i = 0; i < empDefs.length; i++) {
    const d = empDefs[i];
    const emp = await prisma.employee.create({ data: {
      employeeCode: `EMP-${100+i}`, name: d.name, email: `${d.name.split(' ')[0].toLowerCase()}@techcorp.in`,
      role: d.role, department: 'Engineering', experienceLevel: d.perf > 85 ? 'Senior' : 'Mid',
      weeklyCapacityHours: 50, currentAllocatedHours: d.allocHours,
      performanceScore: d.perf, qualityRating: d.perf/20, onTimeDeliveryRate: d.onTime, averageCompletionSpeed: d.speed,
    }});
    for (let j = 0; j < d.skills.length; j++) {
      const sName = d.skills[j];
      await prisma.employeeSkill.create({ data: {
        employeeId: emp.id, skillId: skills[sName].id,
        proficiencyLevel: j === 0 ? 5 : j === 1 ? 4 : 3,
        yearsOfExperience: j === 0 ? 4 : 2, isCertified: j === 0
      }});
    }
    employees[d.name] = emp;
  }

  // ─── PROJECTS (12) ────────────────────────────────────────
  const now = new Date();
  const past = (m: number) => { const d=new Date(); d.setMonth(d.getMonth()-m); return d; };
  const future = (m: number) => { const d=new Date(); d.setMonth(d.getMonth()+m); return d; };

  const projectDefs = [
    // 4 Completed
    { name:'Customer Portal v1',       status:'Completed',   priority:'High',   start:past(4), end:past(1), risk:0  },
    { name:'Internal HR Dashboard',    status:'Completed',   priority:'Medium', start:past(5), end:past(2), risk:0  },
    { name:'Payment Gateway Phase 1',  status:'Completed',   priority:'High',   start:past(6), end:past(3), risk:0  },
    { name:'Mobile App Backend API',   status:'Completed',   priority:'Medium', start:past(3), end:past(1), risk:0  },
    // 5 Active
    { name:'E-Commerce Platform v2',   status:'Active', priority:'Urgent', start:past(1), end:future(1), risk:85 },
    { name:'Data Analytics Engine',    status:'Active', priority:'High',   start:past(2), end:future(2), risk:60 },
    { name:'Security Audit System',    status:'Active', priority:'High',   start:past(1), end:future(1), risk:40 },
    { name:'Cloud Migration Sprint',   status:'Active', priority:'High',   start:past(1), end:future(2), risk:55 },
    { name:'Customer Support AI Bot',  status:'Active', priority:'Medium', start:now,     end:future(3), risk:20 },
    // 3 Future
    { name:'Mobile App v2.0',          status:'Not Started', priority:'High',   start:future(1), end:future(4), risk:0 },
    { name:'Blockchain Integration',   status:'Not Started', priority:'Medium', start:future(2), end:future(5), risk:0 },
    { name:'ML Recommendation Engine', status:'Not Started', priority:'High',  start:future(1), end:future(3), risk:0 },
  ];

  const projects: any[] = [];
  for (const p of projectDefs) {
    projects.push(await prisma.project.create({ data: {
      name: p.name, status: p.status, priority: p.priority,
      startDate: p.start, endDate: p.end, delayRiskScore: p.risk,
      description: `${p.name} — ${p.priority} priority project`
    }}));
  }

  // ─── TASKS with RequiredSkills ─────────────────────────────
  type TaskSpec = { title:string; type:string; comp:string; prio:string; hours:number; daysFromNow:number; progress:number; status:string; assignee:string; reqSkills:string[]; desc:string };
  
  const taskSpecs: {projIdx:number; tasks:TaskSpec[]}[] = [
    // Completed projects → all Completed
    { projIdx:0, tasks:[
      { title:'Design Portal UI',      type:'Design',   comp:'Medium', prio:'High',   hours:20, daysFromNow:-30, progress:100, status:'Completed', assignee:'Aarav Sharma',  reqSkills:['React','UI/UX Design'], desc:'Design and implement the customer portal frontend' },
      { title:'Build Auth API',        type:'Backend',  comp:'High',   prio:'High',   hours:30, daysFromNow:-25, progress:100, status:'Completed', assignee:'Vihaan Gupta',  reqSkills:['Node.js','PostgreSQL'], desc:'JWT auth with refresh tokens' },
      { title:'Write E2E Test Suite',  type:'Testing',  comp:'Medium', prio:'Medium', hours:15, daysFromNow:-20, progress:100, status:'Completed', assignee:'Riya Jain',     reqSkills:['QA Testing'],           desc:'Automated E2E test coverage' },
    ]},
    { projIdx:1, tasks:[
      { title:'HR Dashboard UI',       type:'Design',   comp:'Low',    prio:'Medium', hours:18, daysFromNow:-25, progress:100, status:'Completed', assignee:'Diya Patel',    reqSkills:['React','UI/UX Design'], desc:'Internal HR dashboard frontend' },
      { title:'Employee API Endpoints',type:'Backend',  comp:'Medium', prio:'Medium', hours:22, daysFromNow:-20, progress:100, status:'Completed', assignee:'Sai Kumar',     reqSkills:['Node.js','PostgreSQL'], desc:'CRUD endpoints for employee data' },
    ]},
    { projIdx:2, tasks:[
      { title:'Stripe Integration',    type:'Backend',  comp:'High',   prio:'High',   hours:35, daysFromNow:-20, progress:100, status:'Completed', assignee:'Rohan Desai',   reqSkills:['Node.js','Python'],     desc:'Stripe payment processing integration' },
      { title:'Payment UI',            type:'Design',   comp:'Medium', prio:'High',   hours:20, daysFromNow:-18, progress:100, status:'Completed', assignee:'Priya Verma',   reqSkills:['React','TypeScript'],   desc:'Payment flow frontend components' },
    ]},
    { projIdx:3, tasks:[
      { title:'RESTful API Design',    type:'Backend',  comp:'High',   prio:'High',   hours:28, daysFromNow:-15, progress:100, status:'Completed', assignee:'Krishna Bose',  reqSkills:['Node.js','PostgreSQL'], desc:'Core mobile backend API' },
      { title:'API Documentation',     type:'Documentation', comp:'Low', prio:'Low', hours:8, daysFromNow:-10, progress:100, status:'Completed', assignee:'Ishaan Singh',  reqSkills:['Node.js'],              desc:'Swagger docs for all endpoints' },
    ]},
    // Active — E-Commerce Platform (Urgent, High Risk)
    { projIdx:4, tasks:[
      { title:'Product Catalog UI',          type:'Frontend', comp:'High',     prio:'Urgent', hours:40, daysFromNow:2,  progress:15, status:'In Progress', assignee:'Aarav Sharma',  reqSkills:['React','TypeScript'],         desc:'Full product browsing with filters and search' },
      { title:'Shopping Cart Backend',       type:'Backend',  comp:'Critical', prio:'Urgent', hours:50, daysFromNow:1,  progress:5,  status:'In Progress', assignee:'Arjun Rao',     reqSkills:['Node.js','PostgreSQL'],       desc:'Cart management with inventory sync — CRITICAL overloaded employee' },
      { title:'Order Processing Engine',     type:'Backend',  comp:'Critical', prio:'Urgent', hours:45, daysFromNow:3,  progress:10, status:'In Progress', assignee:'Vihaan Gupta',  reqSkills:['Node.js','Docker'],           desc:'Order lifecycle and fulfillment engine' },
      { title:'Payment Gateway v2',          type:'Backend',  comp:'High',     prio:'Urgent', hours:35, daysFromNow:2,  progress:0,  status:'Not Started', assignee:'',              reqSkills:['Node.js','PostgreSQL'],       desc:'Unassigned — needs immediate AI recommendation' },
      { title:'Checkout UI Flow',            type:'Frontend', comp:'High',     prio:'High',   hours:25, daysFromNow:5,  progress:30, status:'In Progress', assignee:'Ananya Jain',   reqSkills:['React','UI/UX Design'],       desc:'Checkout funnel with address/card forms' },
    ]},
    // Active — Data Analytics (Medium Risk)
    { projIdx:5, tasks:[
      { title:'ETL Pipeline Build',          type:'Backend',  comp:'High',   prio:'High',   hours:40, daysFromNow:10, progress:40, status:'In Progress', assignee:'Pooja Desai',   reqSkills:['Python','Data Science'],      desc:'Extract, transform, load from 5 data sources' },
      { title:'Dashboard Visualizations',    type:'Frontend', comp:'Medium', prio:'Medium', hours:20, daysFromNow:14, progress:25, status:'In Progress', assignee:'Shaurya Sharma', reqSkills:['React','TypeScript'],         desc:'Charts for business metrics' },
      { title:'Statistical Models',          type:'Analysis', comp:'High',   prio:'High',   hours:50, daysFromNow:7,  progress:10, status:'In Progress', assignee:'Pooja Desai',   reqSkills:['Python','Data Science'],      desc:'Predictive models for sales forecasting' },
      { title:'Database Schema Optimization',type:'Backend',  comp:'Medium', prio:'Medium', hours:15, daysFromNow:20, progress:60, status:'In Progress', assignee:'Sai Kumar',     reqSkills:['PostgreSQL'],                 desc:'Query optimization and indexing' },
    ]},
    // Active — Security Audit
    { projIdx:6, tasks:[
      { title:'Penetration Testing',         type:'Security', comp:'Critical', prio:'High', hours:35, daysFromNow:5,  progress:20, status:'In Progress', assignee:'Shruti Singh',  reqSkills:['Cybersecurity','Python'],     desc:'Full pen-test of production systems' },
      { title:'Vulnerability Assessment',    type:'Security', comp:'High',     prio:'High', hours:25, daysFromNow:8,  progress:35, status:'In Progress', assignee:'Shruti Singh',  reqSkills:['Cybersecurity','AWS'],        desc:'AWS infrastructure security review' },
      { title:'Security Report & Fixes',     type:'Backend',  comp:'Medium',   prio:'High', hours:20, daysFromNow:12, progress:0,  status:'Not Started', assignee:'',              reqSkills:['Cybersecurity','Python'],     desc:'Unassigned — create report and patch vulns' },
    ]},
    // Active — Cloud Migration
    { projIdx:7, tasks:[
      { title:'Infrastructure as Code',      type:'DevOps',   comp:'High',   prio:'High',   hours:40, daysFromNow:7,  progress:30, status:'In Progress', assignee:'Saanvi Gupta',  reqSkills:['AWS','Docker','DevOps'],      desc:'Terraform IaC for all cloud resources' },
      { title:'Kubernetes Setup',            type:'DevOps',   comp:'High',   prio:'High',   hours:30, daysFromNow:10, progress:15, status:'In Progress', assignee:'Aadhya Patel',  reqSkills:['Docker','DevOps'],            desc:'K8s cluster config and deployment pipelines' },
      { title:'Database Migration',          type:'Backend',  comp:'Critical', prio:'Urgent',hours:45, daysFromNow:3, progress:5,  status:'In Progress', assignee:'Atharv Verma',  reqSkills:['PostgreSQL','Node.js'],       desc:'Zero-downtime DB migration — assignee overloaded' },
      { title:'Load Testing',                type:'Testing',  comp:'Medium', prio:'Medium', hours:15, daysFromNow:14, progress:0,  status:'Not Started', assignee:'Kavya Rao',     reqSkills:['QA Testing'],                 desc:'Performance and stress testing post-migration' },
    ]},
    // Active — AI Bot
    { projIdx:8, tasks:[
      { title:'NLP Intent Parser',           type:'Backend',  comp:'High',   prio:'Medium', hours:30, daysFromNow:21, progress:50, status:'In Progress', assignee:'Aditya Bose',   reqSkills:['Python','Node.js'],           desc:'Parse user intents from support messages' },
      { title:'Bot UI Integration',          type:'Frontend', comp:'Low',    prio:'Low',    hours:10, daysFromNow:25, progress:70, status:'In Progress', assignee:'Ishaan Singh',  reqSkills:['React','TypeScript'],         desc:'Embed chatbot widget into portal' },
      { title:'Response Training Data',      type:'Analysis', comp:'Medium', prio:'Medium', hours:20, daysFromNow:28, progress:20, status:'In Progress', assignee:'Pooja Desai',   reqSkills:['Data Science','Python'],      desc:'Label and curate training dataset for bot' },
    ]},
    // Future projects
    { projIdx:9,  tasks:[
      { title:'Mobile App Architecture',     type:'Analysis', comp:'High',   prio:'High',   hours:20, daysFromNow:45, progress:0, status:'Not Started', assignee:'',              reqSkills:['React','Node.js'],             desc:'Design mobile app system architecture' },
      { title:'React Native Setup',          type:'Frontend', comp:'Medium', prio:'Medium', hours:15, daysFromNow:50, progress:0, status:'Not Started', assignee:'',              reqSkills:['React','TypeScript'],          desc:'Bootstrap RN project with navigation' },
    ]},
    { projIdx:10, tasks:[
      { title:'Blockchain POC',              type:'Backend',  comp:'Critical', prio:'Medium',hours:40, daysFromNow:60, progress:0, status:'Not Started', assignee:'',              reqSkills:['Node.js','Python'],            desc:'Proof of concept for smart contracts' },
    ]},
    { projIdx:11, tasks:[
      { title:'ML Model Design',             type:'Analysis', comp:'High',   prio:'High',   hours:30, daysFromNow:45, progress:0, status:'Not Started', assignee:'',              reqSkills:['Python','Data Science'],       desc:'Design recommendation engine architecture' },
      { title:'Training Pipeline',           type:'Backend',  comp:'High',   prio:'High',   hours:35, daysFromNow:55, progress:0, status:'Not Started', assignee:'',              reqSkills:['Python','Data Science','AWS'], desc:'Scalable ML training infrastructure' },
    ]},
  ];

  for (const group of taskSpecs) {
    const project = projects[group.projIdx];
    for (const t of group.tasks) {
      const deadline = new Date(); deadline.setDate(deadline.getDate() + t.daysFromNow);
      const emp = t.assignee ? employees[t.assignee] : null;
      const task = await prisma.task.create({ data: {
        projectId: project.id, title: t.title, description: t.desc,
        taskType: t.type, complexity: t.comp, priority: t.prio,
        estimatedHours: t.hours, deadline, status: t.status,
        progressPercentage: t.progress, dependencyIds: '[]',
        assignedEmployeeId: emp?.id ?? null,
      }});
      // Link required skills
      for (const sName of t.reqSkills) {
        if (skills[sName]) {
          await prisma.taskRequiredSkill.create({ data: {
            taskId: task.id, skillId: skills[sName].id, importanceLevel: 'Required'
          }});
        }
      }
    }
  }

  // ─── LEAVES for collision testing ─────────────────────────
  const leaveStart = new Date(); leaveStart.setDate(leaveStart.getDate() + 1);
  const leaveEnd = new Date(); leaveEnd.setDate(leaveEnd.getDate() + 8);
  await prisma.leave.create({ data: { employeeId: employees['Arjun Rao'].id, startDate: leaveStart, endDate: leaveEnd, leaveType: 'Vacation', status: 'Approved' }});
  
  const sickStart = new Date(); sickStart.setDate(sickStart.getDate() - 1);
  const sickEnd = new Date(); sickEnd.setDate(sickEnd.getDate() + 3);
  await prisma.leave.create({ data: { employeeId: employees['Kavya Rao'].id, startDate: sickStart, endDate: sickEnd, leaveType: 'Sick', status: 'Approved' }});

  console.log('Realistic company dataset seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
