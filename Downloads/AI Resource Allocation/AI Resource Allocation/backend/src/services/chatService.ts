import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

// In ts-node: __dirname = backend/src/services → up 3 = project root (where PDFs live)
// In compiled JS: __dirname = backend/dist/services → up 3 = project root
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

let cachedPdfContext: string | null = null;

export async function loadPdfContext(): Promise<string> {
  return loadPdfDocuments();
}

async function loadPdfDocuments(): Promise<string> {
  if (cachedPdfContext !== null) return cachedPdfContext;

  console.log('[PDF Loader] Scanning for PDFs in:', PROJECT_ROOT);
  const pdfFiles = fs.readdirSync(PROJECT_ROOT).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log('[PDF Loader] Found PDFs:', pdfFiles);
  if (pdfFiles.length === 0) {
    cachedPdfContext = '';
    return '';
  }

  const sections: string[] = [];
  for (const file of pdfFiles) {
    try {
      const buffer = fs.readFileSync(path.join(PROJECT_ROOT, file));
      const parsed = await pdfParse(buffer);
      sections.push(`--- Document: ${file} ---\n${parsed.text.trim()}`);
    } catch (e) {
      console.warn(`Could not parse PDF: ${file}`, e);
    }
  }

  cachedPdfContext = sections.join('\n\n');
  return cachedPdfContext;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

async function buildAppSnapshot(prisma: PrismaClient) {
  const [employees, projects, tasks, leaves, skills] = await Promise.all([
    prisma.employee.findMany({ include: { skills: { include: { skill: true } } } }),
    prisma.project.findMany(),
    prisma.task.findMany({ include: { assignedEmployee: true, requiredSkills: { include: { skill: true } } } }),
    prisma.leave.findMany(),
    prisma.skill.findMany(),
  ]);

  const now = new Date();

  return {
    currentDate: now.toISOString(),
    summary: {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.isActive).length,
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'Active').length,
      completedProjects: projects.filter(p => p.status === 'Completed').length,
      atRiskProjects: projects.filter(p => p.delayRiskScore > 60).length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'Completed').length,
      inProgressTasks: tasks.filter(t => t.status === 'In Progress').length,
      blockedTasks: tasks.filter(t => t.status === 'Blocked').length,
      overdueTasks: tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < now).length,
    },
    employees: employees.map(e => {
      const utilization = e.weeklyCapacityHours > 0
        ? Math.round((e.currentAllocatedHours / e.weeklyCapacityHours) * 100)
        : 0;
      const activeTasks = tasks.filter(t => t.assignedEmployeeId === e.id && t.status !== 'Completed');
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        department: e.department,
        experienceLevel: e.experienceLevel,
        email: e.email,
        isActive: e.isActive,
        weeklyCapacityHours: e.weeklyCapacityHours,
        currentAllocatedHours: e.currentAllocatedHours,
        utilizationPercent: utilization,
        workloadStatus: utilization > 100 ? 'Overloaded' : utilization > 80 ? 'High' : utilization > 50 ? 'Moderate' : 'Available',
        performanceScore: e.performanceScore,
        qualityRating: e.qualityRating,
        onTimeDeliveryRate: e.onTimeDeliveryRate,
        skills: e.skills.map(s => ({ name: s.skill.name, level: s.proficiencyLevel, certified: s.isCertified })),
        activeTasks: activeTasks.map(t => ({
          title: t.title,
          project: projects.find(p => p.id === t.projectId)?.name || 'Unknown',
          status: t.status,
          deadline: t.deadline,
          progress: t.progressPercentage,
          estimatedHours: t.estimatedHours,
        })),
        leaves: leaves.filter(l => l.employeeId === e.id).map(l => ({
          type: l.leaveType,
          status: l.status,
          from: l.startDate,
          to: l.endDate,
        })),
      };
    }),
    projects: projects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const completed = pTasks.filter(t => t.status === 'Completed').length;
      const budgetUsedPercent = p.budget > 0 ? Math.round((p.currentCost / p.budget) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        priority: p.priority,
        startDate: p.startDate,
        endDate: p.endDate,
        delayRiskScore: p.delayRiskScore,
        budget: p.budget,
        currentCost: p.currentCost,
        budgetUsedPercent,
        totalTasks: pTasks.length,
        completedTasks: completed,
        completionPercent: pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0,
        overdueTasks: pTasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < now).length,
        blockedTasks: pTasks.filter(t => t.status === 'Blocked').length,
      };
    }),
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      project: projects.find(p => p.id === t.projectId)?.name || 'Unknown',
      assignee: t.assignedEmployee?.name || 'Unassigned',
      status: t.status,
      priority: t.priority,
      complexity: t.complexity,
      estimatedHours: t.estimatedHours,
      deadline: t.deadline,
      progress: t.progressPercentage,
      isOverdue: t.status !== 'Completed' && new Date(t.deadline) < now,
      requiredSkills: t.requiredSkills.map(s => s.skill.name),
    })),
    leaveStatus: {
      currentlyOnLeave: leaves.filter(l =>
        l.status === 'Approved' &&
        new Date(l.startDate) <= now &&
        new Date(l.endDate) >= now
      ).map(l => ({
        employee: employees.find(e => e.id === l.employeeId)?.name || 'Unknown',
        type: l.leaveType,
        until: l.endDate,
      })),
      upcomingApproved: leaves.filter(l => l.status === 'Approved' && new Date(l.startDate) > now).length,
      pending: leaves.filter(l => l.status === 'Pending').length,
    },
    availableSkills: skills.map(s => s.name),
  };
}

export interface Visualization {
  type: 'kpi' | 'bar' | 'pie' | 'progress' | 'table';
  id: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  data?: Array<{ name: string; value: number; color?: string }>;
  columns?: string[];
  rows?: string[][];
  items?: Array<{ label: string; value: number; max: number; color?: string }>;
}

export interface ChatResponse {
  answer: string;
  visualizations: Visualization[];
}

function parseVisualizations(raw: string): { answer: string; visualizations: Visualization[] } {
  const vizMatch = raw.match(/===VISUALIZATIONS===\s*([\s\S]*?)\s*===END VISUALIZATIONS===/);
  if (!vizMatch) return { answer: raw.trim(), visualizations: [] };

  const answer = raw.replace(/===VISUALIZATIONS===[\s\S]*?===END VISUALIZATIONS===/g, '').trim();
  try {
    const parsed = JSON.parse(vizMatch[1].trim());
    const vizArray: Visualization[] = (Array.isArray(parsed) ? parsed : [parsed]).map((v, i) => ({
      ...v,
      id: v.id || `viz-${Date.now()}-${i}`,
    }));
    return { answer, visualizations: vizArray };
  } catch {
    return { answer: raw.trim(), visualizations: [] };
  }
}

export async function handleChat(
  prisma: PrismaClient,
  question: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY') {
    const answer = await fallbackEngine(prisma, question);
    return { answer, visualizations: [] };
  }

  try {
    const [snapshot, pdfContext] = await Promise.all([
      buildAppSnapshot(prisma),
      loadPdfDocuments(),
    ]);
    const now = new Date();

    const systemInstruction = `You are Fristine Assistant — the intelligent AI for Fristine Infotech Pvt Ltd's Enterprise AI Resource Allocation Platform. You have COMPLETE real-time access to ALL application data AND all company policy documents.

Today: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

STRICT SCOPE — YOU MUST ONLY ANSWER QUESTIONS ABOUT:
1. Employees, projects, tasks, skills, leaves, budgets, workload (from live application data)
2. Company policies — leave rules, POSH, holiday calendar, sandwich leave, expense reimbursement (from company PDF documents)
3. Calculations or analysis directly related to the above application data
4. Visualizations and dashboards built from the live application data
5. Risk identification — overloaded staff, at-risk projects, overdue items, blocked tasks

IF THE USER ASKS ANYTHING OUTSIDE THIS SCOPE (general knowledge, world events, coding help, science, trivia, personal advice, or anything unrelated to Fristine Infotech's application and company data), respond with:
"I'm Fristine Assistant and I'm focused on your company's resource allocation and HR data. I can't help with that, but feel free to ask me anything about employees, projects, tasks, leaves, or company policies!"

CAPABILITIES:
1. Answer questions about employees, projects, tasks, skills, leaves, budgets, workload
2. Answer questions about company policies, leave rules, POSH, holiday calendar, sandwich leave, expense reimbursement
3. Perform calculations related to the application data
4. Identify risks: overloaded staff, at-risk projects, overdue items, blocked tasks
5. CREATE VISUALIZATIONS when the user asks to visualize, show chart, show dashboard, show KPIs, analyze visually, or create a report

VISUALIZATION RULES (CRITICAL):
When the user asks to visualize, chart, show KPIs, create a dashboard, or analyze something visually:
1. Give your normal text answer first
2. Then append a VISUALIZATIONS block at the very end in this EXACT format:

===VISUALIZATIONS===
[
  {"type":"kpi","id":"v1","title":"Total Employees","value":"50","subtitle":"all active","trend":"neutral","color":"blue"},
  {"type":"kpi","id":"v2","title":"Overloaded","value":"21","subtitle":"above 100% capacity","trend":"up","trendValue":"+5","color":"red"},
  {"type":"bar","id":"v3","title":"Workload by Department","data":[{"name":"Engineering","value":75},{"name":"Design","value":45},{"name":"QA","value":30}]},
  {"type":"pie","id":"v4","title":"Task Status","data":[{"name":"Completed","value":28,"color":"#22c55e"},{"name":"In Progress","value":21,"color":"#3b82f6"},{"name":"Blocked","value":26,"color":"#ef4444"},{"name":"Not Started","value":46,"color":"#94a3b8"}]},
  {"type":"progress","id":"v5","title":"Project Completion","items":[{"label":"Project Alpha","value":70,"max":100,"color":"#6366f1"}]}
]
===END VISUALIZATIONS===

VISUALIZATION TYPES:
- kpi: Single metric. Fields: type, id, title, value, subtitle, trend (up/down/neutral), trendValue, color (blue/green/red/yellow/purple/orange)
- bar: Bar chart. Fields: type, id, title, data ([{name, value}])
- pie: Pie chart. Fields: type, id, title, data ([{name, value, color}])
- progress: Progress bars. Fields: type, id, title, items ([{label, value, max, color}])
- table: Data table. Fields: type, id, title, columns ([string]), rows ([[string]])

Always use REAL data from the live application data snapshot below. Generate 3-8 visualizations per request depending on what makes sense.

RESPONSE STYLE:
- Be concise, friendly, professional
- Use bullet points for lists
- Always append VISUALIZATIONS block when visualization is requested

=== COMPANY POLICY DOCUMENTS (PDF) ===
${pdfContext || 'No policy documents found.'}
=== END POLICY DOCUMENTS ===

=== LIVE APPLICATION DATA ===
${JSON.stringify(snapshot, null, 2)}
=== END DATA ===`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });

    const trimmedHistory = history.slice(0, -1);
    const firstUserIdx = trimmedHistory.findIndex(m => m.role === 'user');
    const validHistory = firstUserIdx >= 0 ? trimmedHistory.slice(firstUserIdx) : [];
    const geminiHistory = validHistory.map(m => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.text }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(question);
    const raw = result.response.text();
    return parseVisualizations(raw);
  } catch (error: any) {
    console.error('Gemini API error:', error?.message || error);
    const answer = await fallbackEngine(prisma, question);
    return { answer, visualizations: [] };
  }
}

async function fallbackEngine(prisma: PrismaClient, question: string): Promise<string> {
  const lowerQ = question.toLowerCase();
  const [employees, projects, tasks, leaves] = await Promise.all([
    prisma.employee.findMany({ include: { skills: { include: { skill: true } } } }),
    prisma.project.findMany(),
    prisma.task.findMany({ include: { assignedEmployee: true } }),
    prisma.leave.findMany({ where: { status: 'Approved' } }),
  ]);
  const now = new Date();

  if (lowerQ.includes('rebalance') || lowerQ.includes('suggest reassignment')) {
    const { generateRebalancingSuggestions } = await import('./rebalancingService');
    const suggestions = await generateRebalancingSuggestions(prisma);
    if (suggestions.length === 0) return 'No rebalancing suggestions available. Team workload is well distributed.';
    const sug = suggestions[0];
    return `I suggest moving task "${sug.taskTitle}" from ${sug.fromEmployeeName} to ${sug.toEmployeeName}. This will reduce ${sug.fromEmployeeName}'s utilization from ${sug.fromUtilizationBefore}% to ${sug.fromUtilizationAfter}%.`;
  }

  if (lowerQ.includes('project risk') || lowerQ.includes('why is project at risk')) {
    const { calculateProjectFailureRisk } = await import('./projectRiskService');
    const risks = await calculateProjectFailureRisk(prisma);
    const critical = risks.filter((r: any) => r.riskLevel === 'Critical' || r.riskLevel === 'Watch');
    if (critical.length === 0) return 'No projects are at high risk right now.';
    const p = critical[0];
    return `Project "${p.name}" is at ${p.riskLevel} risk (Score: ${p.riskScore}). Reasons: ${p.reasons.join(', ')}.`;
  }

  if (lowerQ.includes('overloaded') || lowerQ.includes('over capacity')) {
    const over = employees.filter(e => e.currentAllocatedHours > e.weeklyCapacityHours);
    if (over.length === 0) return 'No employees are currently overloaded.';
    return 'Overloaded employees: ' + over.map(e => e.name + ' (' + e.currentAllocatedHours + '/' + e.weeklyCapacityHours + 'h)').join(', ');
  }

  if (lowerQ.includes('how many employee') || lowerQ.includes('total employee')) {
    return 'There are ' + employees.length + ' employees (' + employees.filter(e => e.isActive).length + ' active).';
  }
  if (lowerQ.includes('how many project') || lowerQ.includes('total project')) {
    return projects.length + ' projects: ' + projects.filter(p => p.status === 'Active').length + ' active, ' + projects.filter(p => p.status === 'Completed').length + ' completed.';
  }
  if (lowerQ.includes('how many task') || lowerQ.includes('total task')) {
    return 'There are ' + tasks.length + ' tasks in total across all projects.';
  }

  if (lowerQ.includes('overdue')) {
    const od = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < now);
    return od.length === 0 ? 'No overdue tasks.' : od.length + ' overdue tasks: ' + od.map(t => t.title).slice(0, 5).join(', ');
  }

  if (lowerQ.includes('available') || lowerQ.includes('free capacity')) {
    const avail = employees.filter(e => e.currentAllocatedHours < e.weeklyCapacityHours * 0.7);
    return avail.length === 0 ? 'No employees with significant free capacity.' : 'Available: ' + avail.map(e => e.name).join(', ');
  }

  if (lowerQ.includes('project') && (lowerQ.includes('active') || lowerQ.includes('ongoing'))) {
    const active = projects.filter(p => p.status === 'Active');
    return active.length === 0 ? 'No active projects.' : 'Active projects: ' + active.map(p => p.name).join(', ');
  }

  if (lowerQ.includes('project') && (lowerQ.includes('complete') || lowerQ.includes('finish'))) {
    const completed = projects.filter(p => p.status === 'Completed');
    return completed.length === 0 ? 'No completed projects.' : 'Completed projects: ' + completed.map(p => p.name).join(', ');
  }

  for (const emp of employees) {
    if (lowerQ.includes(emp.name.toLowerCase()) || lowerQ.includes(emp.name.split(' ')[0].toLowerCase())) {
      const activeTasks = tasks.filter(t => t.assignedEmployeeId === emp.id && t.status !== 'Completed');
      const empLeaves = leaves.filter(l => l.employeeId === emp.id);
      const util = Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100);
      let response = emp.name + ' is a ' + emp.role + ' with ' + emp.currentAllocatedHours + ' hours allocated (' + util + '% utilization). ';
      if (activeTasks.length > 0) {
        response += 'They have ' + activeTasks.length + ' active tasks, including "' + activeTasks[0].title + '". ';
      } else {
        response += 'They currently have no active tasks. ';
      }
      if (empLeaves.length > 0) {
        response += 'Note: They have an approved ' + empLeaves[0].leaveType + ' leave scheduled.';
      }
      return response;
    }
  }

  for (const proj of projects) {
    if (lowerQ.includes(proj.name.toLowerCase())) {
      const pTasks = tasks.filter(t => t.projectId === proj.id);
      const completed = pTasks.filter(t => t.status === 'Completed').length;
      return 'Project "' + proj.name + '" is ' + proj.status + '. Tasks: ' + completed + '/' + pTasks.length + ' completed. Priority: ' + proj.priority + '. Delay risk: ' + proj.delayRiskScore + '%.';
    }
  }

  return 'I am running in offline mode. Please ensure GOOGLE_API_KEY is configured in backend/.env for full AI capabilities. You can still ask about employees, projects, tasks, and workload.';
}
