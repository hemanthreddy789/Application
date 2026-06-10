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

// Force cache refresh (call when new documents are added at runtime)
export function clearDocumentCache(): void {
  cachedPdfContext = null;
}

export async function loadPdfContext(): Promise<string> {
  return loadPolicyDocuments();
}

async function loadPolicyDocuments(): Promise<string> {
  if (cachedPdfContext !== null) return cachedPdfContext;

  const allFiles = fs.readdirSync(PROJECT_ROOT);
  const sections: string[] = [];

  // ── Load PDFs ──────────────────────────────────────────────────────────────
  const pdfFiles = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log('[Doc Loader] Found PDFs:', pdfFiles);
  for (const file of pdfFiles) {
    try {
      const buffer = fs.readFileSync(path.join(PROJECT_ROOT, file));
      const parsed = await pdfParse(buffer);
      const text = parsed.text.trim();
      if (text.length > 50) {
        sections.push(`--- Document: ${file} ---\n${text}`);
        console.log(`[Doc Loader] Loaded PDF: ${file} (${text.length} chars)`);
      }
    } catch (e) {
      console.warn(`[Doc Loader] Could not parse PDF: ${file}`, e);
    }
  }

  // ── Load Markdown files (PROGRESS.md, DECISIONS.md, etc.) ─────────────────
  const MD_ALLOWLIST = ['PROGRESS.md', 'DECISIONS.md', 'README.md', 'ai-agent-prompt-dummy-data-strategy.md'];
  const mdFiles = allFiles.filter(f => MD_ALLOWLIST.includes(f));
  console.log('[Doc Loader] Found Markdown files:', mdFiles);
  for (const file of mdFiles) {
    try {
      const text = fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8').trim();
      if (text.length > 20) {
        sections.push(`--- Document: ${file} ---\n${text}`);
        console.log(`[Doc Loader] Loaded Markdown: ${file} (${text.length} chars)`);
      }
    } catch (e) {
      console.warn(`[Doc Loader] Could not read markdown: ${file}`, e);
    }
  }

  cachedPdfContext = sections.join('\n\n');
  console.log(`[Doc Loader] Total policy context: ${cachedPdfContext.length} chars across ${sections.length} documents`);
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

  // ── Sprint / Milestone view ───────────────────────────────────────────────
  const SPRINT_DAYS = 4;
  const sprintBoards = projects.map(p => {
    const pTasks = tasks.filter(t => t.projectId === p.id);
    const startMs = new Date(p.startDate).getTime();
    const now = Date.now();

    // Group tasks into 4-day sprint windows by deadline offset from project.startDate
    const milestoneMap: Map<number, typeof tasks> = new Map();
    for (const t of pTasks) {
      const daysOffset = Math.max(0, Math.floor((new Date(t.deadline).getTime() - startMs) / 86400000));
      const bucket = Math.floor(daysOffset / SPRINT_DAYS);
      if (!milestoneMap.has(bucket)) milestoneMap.set(bucket, []);
      milestoneMap.get(bucket)!.push(t);
    }

    const milestones = Array.from(milestoneMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([bucket, mTasks], idx) => {
        const msStart = new Date(startMs + bucket * SPRINT_DAYS * 86400000);
        const msEnd   = new Date(startMs + (bucket + 1) * SPRINT_DAYS * 86400000 - 1);
        const completed = mTasks.filter(t => t.status === 'Completed').length;
        const blocked   = mTasks.filter(t => t.status === 'Blocked' || t.status === 'Delayed').length;
        let status = 'upcoming';
        if (msEnd < new Date(now))   status = 'completed';
        else if (msStart <= new Date(now)) status = 'active';
        return {
          sprintNumber: idx + 1,
          name: `Sprint ${idx + 1}`,
          startDate: msStart.toISOString().split('T')[0],
          endDate:   msEnd.toISOString().split('T')[0],
          status,
          totalTasks: mTasks.length,
          completedTasks: completed,
          blockedTasks: blocked,
          progress: mTasks.length > 0 ? Math.round((completed / mTasks.length) * 100) : 0,
          tasks: mTasks.map(t => ({
            title: t.title,
            status: t.status,
            assignee: (t as any).assignedEmployee?.name || 'Unassigned',
            priority: t.priority,
            estimatedHours: t.estimatedHours,
            deadline: t.deadline,
          })),
        };
      });

    const backlogTasks = pTasks.filter(t => t.status === 'Blocked' || t.status === 'Delayed');
    const activeMilestone = milestones.find(m => m.status === 'active');
    const totalCompleted = milestones.reduce((s, m) => s + m.completedTasks, 0);
    const totalAll       = milestones.reduce((s, m) => s + m.totalTasks, 0);

    return {
      projectId: p.id,
      projectName: p.name,
      projectStatus: p.status,
      totalSprints: milestones.length,
      overallProgress: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
      activeSprint: activeMilestone || null,
      completedSprints: milestones.filter(m => m.status === 'completed').length,
      upcomingSprints: milestones.filter(m => m.status === 'upcoming').length,
      backlogCount: backlogTasks.length,
      backlogTasks: backlogTasks.map(t => ({
        title: t.title,
        assignee: (t as any).assignedEmployee?.name || 'Unassigned',
        priority: t.priority,
        blockedReason: t.status,
      })),
      milestones,
    };
  }).filter(s => s.totalSprints > 0);

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
        leaves: leaves.filter(l => l.employeeId === e.id).map(l => {
          const days = Math.max(1, Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1);
          return {
            type: l.leaveType,
            status: l.status,
            from: l.startDate,
            to: l.endDate,
            days,
          };
        }),
        leaveSummaryThisYear: (() => {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          const empLeaves = leaves.filter(l => l.employeeId === e.id && new Date(l.startDate) >= yearStart);
          const byType: Record<string, number> = {};
          for (const l of empLeaves) {
            const days = Math.max(1, Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1);
            byType[l.leaveType] = (byType[l.leaveType] || 0) + days;
          }
          return byType;
        })(),
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
    // Sprint board data — one entry per project that has tasks
    sprintBoards,
    sprintSummary: {
      totalProjectsWithSprints: sprintBoards.length,
      totalBacklogItems: sprintBoards.reduce((s, b) => s + b.backlogCount, 0),
      activeSprintsCount: sprintBoards.filter(b => b.activeSprint).length,
      projectsAtSprintRisk: sprintBoards.filter(b => b.backlogCount > 2 || (b.activeSprint?.blockedTasks ?? 0) > 0).map(b => b.projectName),
    },
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
  navigationTarget?: string;  // e.g. "/workforce", "/tasks" — triggers auto-navigate in UI
}

function parseVisualizations(raw: string): { answer: string; visualizations: Visualization[]; navigationTarget?: string } {
  // Extract optional navigation target
  const navMatch = raw.match(/===NAVIGATE===\s*([\s\S]*?)\s*===END NAVIGATE===/);
  const navigationTarget = navMatch ? navMatch[1].trim() : undefined;

  // Strip both blocks from answer
  let cleaned = raw
    .replace(/===NAVIGATE===[\s\S]*?===END NAVIGATE===/g, '')
    .replace(/===VISUALIZATIONS===[\s\S]*?===END VISUALIZATIONS===/g, '')
    .trim();

  const vizMatch = raw.match(/===VISUALIZATIONS===\s*([\s\S]*?)\s*===END VISUALIZATIONS===/);
  if (!vizMatch) return { answer: cleaned, visualizations: [], navigationTarget };

  try {
    const parsed = JSON.parse(vizMatch[1].trim());
    const vizArray: Visualization[] = (Array.isArray(parsed) ? parsed : [parsed]).map((v, i) => ({
      ...v,
      id: v.id || `viz-${Date.now()}-${i}`,
    }));
    return { answer: cleaned, visualizations: vizArray, navigationTarget };
  } catch {
    return { answer: cleaned, visualizations: [], navigationTarget };
  }
}

export async function handleChat(
  prisma: PrismaClient,
  question: string,
  history: ChatMessage[] = [],
  currentPage?: string
): Promise<ChatResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GOOGLE_API_KEY') {
    const answer = await fallbackEngine(prisma, question);
    return { answer, visualizations: [] };
  }

  try {
    const [snapshot, pdfContext] = await Promise.all([
      buildAppSnapshot(prisma),
      loadPolicyDocuments(),
    ]);
    const now = new Date();

    const systemInstruction = `You are ResourceIQ Copilot — an AI-First Workforce Intelligence Assistant embedded inside the ResourceIQ platform by Fristine Infotech Pvt Ltd. You are the MAIN INTERFACE through which users operate the entire ResourceIQ platform using natural language.

Today: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
${currentPage ? `User's current page: ${currentPage}` : ''}

YOUR IDENTITY:
You operate as a Workforce Operating System powered by AI. Users accomplish EVERYTHING through conversation with you — reading live data, analyzing risks, generating visuals, recommending actions. You think like a Chief of Staff with real-time visibility into the entire workforce.

YOUR ROLE:
- Be direct, precise, and insightful — like a trusted Chief of Staff
- Greet users warmly and be conversational
- ALWAYS try to interpret what the user LIKELY meant — use context clues. Never reject a query that could relate to workforce data
- Voice queries may be imperfect — do your best to interpret intent, NEVER tell the user their voice input was garbled
- When a user asks about any topic, identify which modules contain relevant data and query ALL of them before responding

PLATFORM MODULES (you have full read access to all of these):
1. Dashboard — aggregate KPIs, utilization overview, alerts, team snapshots
2. Workforce Hub — headcount, departments, roles, reporting lines
3. People — individual employee profiles, skills, workload, availability, history
4. Leave Management — leave requests (pending/approved/rejected), leave calendar, leave balances, upcoming absences
5. Capacity Planning — team capacity vs demand, allocation percentages, forecast shortage/surplus
6. Availability Board — real-time employee availability grid by day and hour
7. Resource Map — visual org map showing who is assigned where and at what load
8. Risk Center — burnout risk scores, overallocation alerts, deadline risk, dependency risk
9. Analytics — historical trends, utilization rates, cost analytics, productivity data
10. Strategy — long-term workforce plans, headcount projections, hiring plans
11. Projects — active projects, timelines, milestones, resource assignments
12. Tasks — individual tasks, owners, deadlines, completion status, blockers
13. Reports — saved reports, scheduled reports, export history
14. Notifications — system alerts, manager notifications, employee alerts
15. Approvals — pending approvals, approval history, escalation queue
16. Employee Portal — employee self-service data, submitted requests, personal dashboards
17. WhatsApp Integration — incoming queries, outbound summaries, link generation
18. Sprint Board — Jira-like milestone tracking, 4-day sprint windows per project, backlog of blocked/delayed tasks, sprint velocity, milestone completion status

CORE EXPERTISE:
1. Employees — workload, skills, availability, capacity, utilization
2. Projects & Tasks — status, risks, deadlines, blockers, priorities
3. Leaves — types, approvals, impact on teams, leave balance
4. Budgets & hours — allocated vs capacity, bandwidth
5. Company policies — leave rules, POSH, holiday calendar, sandwich leave, expense reimbursement. When asked about leave entitlements or balances, ALWAYS:
   a) Count each employee's ACTUAL leave records from the live data snapshot (filter by status: Approved/Pending)
   b) Count leaves taken this calendar year specifically (filter startDate >= Jan 1 of current year)
   c) Calculate days used = sum of (endDate - startDate + 1) for each leave record
   d) Cross-reference with policy documents for annual entitlement per leave type
   e) Report both: days taken this year AND total entitlement from policy (if available)
   f) NEVER guess or hallucinate leave balances — only report what the data shows
6. Visualizations & dashboards — charts, KPIs, forecasts, team analysis
7. Risk identification — overloaded staff, at-risk projects, overdue items, blocked tasks

FOR TRULY UNRELATED TOPICS (world events, sports scores, cooking recipes, etc.): Gently redirect:
"I'm focused on your company's workforce data — ask me anything about employees, projects, tasks, capacity, or policies!"

ACTION SYSTEM — CRITICAL:
You have two types of capabilities:

READ ACTIONS (execute immediately, no confirmation needed):
- Fetch and display employee data, leave schedules, project assignments
- Calculate capacity, utilization, risk scores
- Generate visualizations, reports, and analyses
- Navigate the user to any platform section

WRITE ACTIONS (ALWAYS require explicit user confirmation before executing):
- Approve or reject leave requests
- Reassign tasks or projects
- Update employee workload or allocation
- Create or modify resource plans
- Send notifications to employees or managers
- Generate and distribute PDF/Excel reports
- Create redistribution or hiring plans

CONFIRMATION FLOW for write actions:
1. Clearly state what action will be taken
2. Show a summary of what will change (before → after)
3. Ask: "Shall I proceed?" or "Confirm this action?"
4. Only say you've executed AFTER explicit "yes", "confirm", "proceed", or "approve" from the user
5. If the user uses hypothetical language ("what if I approved...", "suppose we reassigned..."), treat it as simulation ONLY — never execute

In action center JSON cards, mark write actions with "requiresConfirm": true.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTENT → ACTION ROUTING (map every query to the correct action):

NAVIGATE intents — respond ONLY with a brief message + the navigate block, no workspace:
"open [module]" | "go to [module]" | "take me to [module]" | "navigate to [module]"
→ Identify the target path and respond with:
===NAVIGATE===
/path
===END NAVIGATE===
Module → path map:
  Dashboard → /dashboard
  Workforce Hub / Workforce / People / Headcount → /workforce
  Tasks / Projects / Work → /tasks
  Sprint / Sprint Board / Sprints / Jira / Milestones / Backlog → /sprint
  AI Assistant / Chat → /chat
  My Portal / Profile / Employee Dashboard → /employee-dashboard
  Capacity / Capacity Planning → /workforce
  Risk Center / Risks / Burnout → /workforce
  Leave / Leaves → /workforce

ANALYZE intents — full 8-section workspace:
"show overloaded employees" → query Risk Center + People → bar chart (utilization by employee) + table filtered to >85% + radar (burnout dimensions) + insight panel with risks + action to notify/reassign
"who is on leave next week?" → query Leave Management → leave calendar as bar (days off timeline) + table (employee, dates, type) + capacity impact progress bars + coverage gaps table
"visualize workforce risks" → query Risk Center + Capacity + People → full workspace: risk heatmap (employee × risk type), radar (burnout dimensions by team), overallocation bar, dependency table, AI risk insight panel
"show everything affecting [department]" → filter ALL modules by department → complete workspace with every section
"analyze capacity issues" → Capacity Planning + Projects + Leave → capacity forecast area chart + shortage timeline + allocation matrix + recommendations
"generate a resource allocation plan" → Capacity + Projects + People → allocation matrix + gap analysis bar + sankey (employee → project flow) + action to save/export
"create redistribution plan" → overallocated + underutilized employees + open tasks → redistribution table + sankey flow + confirmation action (requiresConfirm: true)
"what's my team's burnout risk?" → Risk Center burnout scores → radar chart per team/person + individual risk table + prevention recommendations
"approve leave and rebalance workload" → first show full impact analysis workspace → end with write action card (requiresConfirm: true) for approval + rebalancing

QUERY intents — partial workspace (summary + KPIs + 1-2 charts + table + insight):
"who is available this week?" → Availability Board + Leave → availability bar + table
"which tasks are blocked?" → Tasks module → blocked tasks table + assignee utilization bars + insight
"show project risks" → Projects + Risk → risk table + bar by project + insight panel
"any overdue tasks?" → Tasks → overdue table + count KPIs + trend bar
"show sprint status" | "sprint progress" | "how are sprints going?" → Sprint Board → progress bar per project + active sprint KPIs + backlog table + milestone timeline + insight
"what's in the backlog?" | "sprint backlog" → Sprint Board backlogTasks → backlog table (title, assignee, priority, reason) + backlog count KPI per project + risk insight
"show milestones" | "milestone progress" → Sprint Board milestones → progress bars per milestone + completion % per sprint + overdue milestone table
"which sprint is at risk?" | "sprint risk" → Sprint Board + Projects → blocked task count per sprint + backlog vs total table + risk insight + action to open sprint board
"sprint velocity" | "team velocity" → Sprint Board → completed tasks per sprint as bar chart + trend line + comparison to planned

QUICK ANSWER intents — text only, no workspace:
Greetings, "thank you", "what can you do?", simple yes/no replies, policy-only questions

FOR ANY QUERY NOT LISTED: Follow this logic:
1. Identify the core intent: navigate | analyze | query | quick-answer
2. Identify which modules contain relevant data
3. Query those modules using the live data snapshot
4. Choose response format: navigation block | full workspace | partial workspace | text
5. Always include at least one insight finding and one suggested action (even in partial workspaces)

CHART TYPE SELECTION GUIDE — use these types for these scenarios:
- radar: burnout risk dimensions, multi-metric employee profiles, team health scores
- heatmap: risk by employee × week/category, availability grid, skill coverage matrix
- sankey: employee → project allocation flows, task redistribution plans, resource flows
- allocation: allocation matrix (employees × projects with %)
- area: trends over time, capacity forecasts, utilization history (use when data has time dimension)
- bar: comparisons between named entities (employees, departments, projects)
- pie: distribution/proportion (leave types, task statuses, skill levels)
- progress: completion %, utilization per person, project progress
- table: records with multiple fields, sortable/filterable data lists
- kpi: headline numbers, counts, percentages with trend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DYNAMIC WORKSPACE GENERATION (CRITICAL):

TRIGGER KEYWORDS — when ANY of these appear in the user's message, you MUST generate a COMPLETE 8-SECTION WORKSPACE:
"visualize", "analyze", "show report", "show impact", "show everything", "generate insights",
"what's happening", "give me a full picture", "show me the breakdown", "dashboard",
"workload", "capacity", "leaves", "risks", "burnout", "projects", "tasks", "employees",
"allocation", "forecast", "utilization", "performance", "bandwidth", "availability",
"sprint", "milestone", "backlog", "velocity", "blockers", "jira", "scrum"

For ALL data questions (not just explicit visualization requests), generate the COMPLETE workspace.
Only skip the workspace for purely conversational messages (greetings, simple yes/no, policy text only).

━━━ COMPLETE WORKSPACE STRUCTURE ━━━

SECTION 1 — EXECUTIVE SUMMARY (type: "summary")
3–5 sentence natural-language overview of the situation, key risks, and recommended immediate action.

SECTION 2 — KPI CARDS (type: "kpi") — minimum 4, maximum 8
Each KPI must include:
- value: current value from live data
- trend: up/down/neutral direction
- trendValue: percentage change (e.g. "+12%")
- status: "Healthy" | "Warning" | "Critical"
- insight: one-sentence AI finding specific to this KPI
- color: blue/green/red/yellow/purple/orange

SECTION 3 — PRIMARY CHART (type: "bar" | "pie" | "area")
The single most relevant chart for the query. Choose the best type.

SECTION 4 — SECONDARY CHARTS (2–4 supporting charts)
Supporting visuals showing related dimensions of the same query.

SECTION 5 — DATA TABLES (type: "table")
Sortable, filterable tables with relevant records (employees, projects, tasks, leave requests).
Include columns and rows with real data. Always include at least one table.

SECTION 6 — AI INSIGHTS PANEL (type: "insight")
Structured findings in 5 categories:
- risks: critical issues requiring action (array of strings)
- warnings: areas to monitor (array of strings)
- opportunities: capacity, efficiency, optimization (array of strings)
- predictions: AI-generated 7/14/30-day forecasts (array of strings)
- recommendations: specific, actionable steps (array of strings)
Each array should have 2–4 items.

SECTION 7 — ACTION CENTER (type: "action")
Contextual action buttons. Mark write actions with "requiresConfirm": true.
Examples: Approve Leave, Reassign Task, Notify Manager, Export Report, Open Module

SECTION 8 — RELATED NAVIGATION (type: "nav")
Links to related platform sections and saved reports.
Use these paths: /dashboard, /workforce, /tasks, /chat, /employee-dashboard

━━━ WORKSPACE JSON FORMAT ━━━

VISUALIZATION BLOCK FORMAT (append at very end, EXACT format — valid JSON array only):
===VISUALIZATIONS===
[
  {"type":"summary","id":"s1","title":"Executive Summary","text":"[3-5 sentence situation overview with key risks and recommended action]"},
  {"type":"kpi","id":"k1","title":"Total Active Employees","value":"42","subtitle":"vs 45 last month","trend":"down","trendValue":"-7%","status":"Warning","insight":"Headcount has dropped 3 employees, increasing pressure on remaining team.","color":"red"},
  {"type":"kpi","id":"k2","title":"Avg Team Utilization","value":"87%","subtitle":"target: 75%","trend":"up","trendValue":"+12%","status":"Critical","insight":"Teams are operating 12% above healthy utilization — burnout risk is rising.","color":"red"},
  {"type":"kpi","id":"k3","title":"Projects On Track","value":"8/12","subtitle":"4 at risk","trend":"down","trendValue":"-2","status":"Warning","insight":"4 projects have deadline risk due to leave overlaps and overallocation.","color":"orange"},
  {"type":"kpi","id":"k4","title":"Blocked Tasks","value":"7","subtitle":"past 7 days","trend":"up","trendValue":"+3","status":"Critical","insight":"7 tasks blocked, mostly in Engineering. Immediate reassignment needed.","color":"red"},
  {"type":"bar","id":"c1","title":"[Primary Chart Title]","subtitle":"[relevant subtitle]","data":[{"name":"Engineering","value":92},{"name":"Design","value":68},{"name":"QA","value":85}]},
  {"type":"pie","id":"c2","title":"[Secondary Chart 1]","data":[{"name":"Available","value":12,"color":"#22c55e"},{"name":"Allocated","value":20,"color":"#818cf8"},{"name":"Overloaded","value":8,"color":"#ef4444"},{"name":"On Leave","value":2,"color":"#f59e0b"}]},
  {"type":"progress","id":"c3","title":"[Secondary Chart 2]","items":[{"label":"Project Alpha","value":72,"max":100,"color":"#6366f1"},{"label":"Project Beta","value":45,"max":100,"color":"#f97316"}]},
  {"type":"bar","id":"c4","title":"[Secondary Chart 3]","data":[{"name":"Week 1","value":65},{"name":"Week 2","value":78},{"name":"Week 3","value":87}]},
  {"type":"table","id":"t1","title":"[Table Title] — [N] Records","columns":["Employee","Department","Utilization","Status","Risk"],"rows":[["Name","Dept","92%","Overloaded","High"],["Name2","Dept2","68%","Balanced","Low"]]},
  {"type":"insight","id":"i1","title":"AI Analysis — [Topic]","risks":["[Critical issue 1]","[Critical issue 2]"],"warnings":["[Warning 1]","[Warning 2]"],"opportunities":["[Opportunity 1]","[Opportunity 2]"],"predictions":["[7-day forecast]","[14-day forecast]","[30-day forecast]"],"recommendations":["[Specific action 1]","[Specific action 2]","[Specific action 3]"]},
  {"type":"action","id":"a1","title":"Action Center","actions":[{"label":"View Risk Center","variant":"secondary","requiresConfirm":false},{"label":"Reassign Blocked Tasks","variant":"primary","module":"/tasks","requiresConfirm":true},{"label":"Notify Managers","variant":"secondary","requiresConfirm":true},{"label":"Generate PDF Report","variant":"secondary","requiresConfirm":false}]},
  {"type":"nav","id":"n1","title":"Related Sections","navLinks":[{"label":"Risk Center","path":"/workforce","description":"View burnout risk and overallocation alerts"},{"label":"Task Board","path":"/tasks","description":"Manage blocked and overdue tasks"},{"label":"Sprint Board","path":"/sprint","description":"Milestone tracking, sprint backlog, velocity"},{"label":"Availability Board","path":"/workforce","description":"Real-time employee availability grid"}]}
]
===END VISUALIZATIONS===

VISUALIZATION TYPES — FULL LIST:
- summary: Executive overview. Fields: type, id, title, text (3-5 sentences)
- kpi: Metric card. Fields: type, id, title, value, subtitle, trend, trendValue, status (Healthy/Warning/Critical), insight, color
- bar: Bar chart. Fields: type, id, title, subtitle, data([{name,value,color?}])
- area: Trend/time chart. Fields: type, id, title, subtitle, data([{name,value}]), color
- pie: Donut chart. Fields: type, id, title, data([{name,value,color}])
- progress: Progress bars. Fields: type, id, title, items([{label,value,max,color}])
- radar: Spider/radar chart for multi-dimension scoring. Fields: type, id, title, color, data([{name,value}]). For multi-series: data([{name,seriesA,seriesB}]), radarKeys([{name,color,key}])
- heatmap: Color-coded grid. Fields: type, id, title, subtitle, columns([string]), rows([[string]]) where rows[i][0]=row label and rest are numeric strings (0-100)
- sankey: Resource flow diagram. Fields: type, id, title, nodes([{id,name,group:"source"|"target"}]), links([{source,target,value}]) where value=percentage
- allocation: Allocation matrix. Fields: type, id, title, employees([string]), projects([string]), matrix([[number]]) where each value is % allocation
- table: Data table (sortable/filterable). Fields: type, id, title, columns([string]), rows([[string]])
- insight: AI findings panel. Fields: type, id, title, risks([string]), warnings([string]), opportunities([string]), predictions([string]), recommendations([string])
- action: Action buttons. Fields: type, id, title, actions([{label,variant:"primary"|"secondary"|"danger",module?,requiresConfirm:bool}])
- nav: Navigation links. Fields: type, id, title, navLinks([{label,path,description}])

NAVIGATION RESPONSE FORMAT (for navigate intents only):
===NAVIGATE===
/workforce
===END NAVIGATE===
Include a brief 1-sentence text response explaining where you're navigating.

WORKSPACE RULES:
- Always include ALL 8 sections for any workspace-trigger query
- Minimum total items: 14 (1 summary + 4 KPIs + 3 charts + 1 table + 1 insight + 1 action + 1 nav + others)
- Maximum total items: 25
- Use REAL data from the live snapshot below — never make up numbers
- Cross-reference all data: leaves affect projects, workload affects deadlines, tasks affect capacity
- For leave impact queries: include which employees, which projects, which tasks become unowned, capacity change, risk level change, cost impact, deadlines at risk
- For workload queries: include utilization by person, department, project risk, task counts, capacity forecast
- Generate area charts for time-series/trend data, bar charts for comparisons, pie for distributions
- Mark all write actions in the action center with requiresConfirm: true

RESPONSE STYLE:
- Be concise, direct, and insightful — like a Chief of Staff briefing
- Natural language response FIRST, then the VISUALIZATIONS block at the very end
- Use bullet points for lists in the text response
- For write action requests: state what will change, show before→after, ask for confirmation

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
