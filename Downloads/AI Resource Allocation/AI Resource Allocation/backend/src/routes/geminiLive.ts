import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { loadPdfContext } from '../services/chatService';

const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export function setupGeminiLiveWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws/gemini-live' });

  wss.on('connection', async (clientWs) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'GOOGLE_API_KEY not configured.' }));
      clientWs.close();
      return;
    }

    const pdfContext = await loadPdfContext();
    const systemInstruction = `You are ResourceIQ Copilot — an AI-First Workforce Intelligence Assistant embedded inside the ResourceIQ platform by Fristine Infotech Pvt Ltd.

You are the MAIN INTERFACE through which users operate the entire ResourceIQ platform using natural language. You think like a Chief of Staff with real-time visibility into the entire workforce.

AVAILABLE MODULES (query ALL relevant ones when answering):
1. Dashboard — aggregate KPIs, utilization overview, alerts, team snapshots
2. Workforce Hub — headcount, departments, roles, reporting lines
3. People — individual employee profiles, skills, workload, availability, history
4. Leave Management — leave requests, leave calendar, balances, upcoming absences
5. Capacity Planning — team capacity vs demand, allocation %, forecast shortage/surplus
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
18. Sprint Board — Jira-like milestone tracking, 4-day sprint windows, backlog of blocked/delayed tasks, sprint velocity

NAVIGATION — when the user asks to open or go to a section, respond with the section name and path:
  Dashboard → /dashboard
  Workforce / People / Headcount → /workforce
  Tasks / Projects → /tasks
  Sprint / Sprint Board / Sprints / Milestones / Backlog / Jira → /sprint
  Chat / AI Assistant → /chat
  My Portal / Employee Portal → /employee-dashboard

COMPANY POLICY KNOWLEDGE:
${pdfContext || 'No policy documents loaded.'}

RESPONSE STYLE FOR VOICE:
- Be concise and conversational — voice responses should be easy to hear
- Lead with the key insight, follow with supporting detail
- Use natural sentence structure, avoid bullet-heavy formatting
- Voice queries may be imperfect — always interpret intent charitably, NEVER reject as garbled
- For sprint/milestone questions: summarize the active sprint, backlog count, and any blockers in 2-3 sentences
- After answering, suggest 1-2 natural follow-up questions the user might want to ask`;

    const geminiUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
    const geminiWs = new WebSocket(geminiUrl);

    geminiWs.on('open', () => {
      // Send setup message
      const setup = {
        setup: {
          model: 'models/gemini-2.0-flash-live-001',
          generation_config: {
            response_modalities: ['TEXT'],
          },
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
        },
      };
      geminiWs.send(JSON.stringify(setup));
      clientWs.send(JSON.stringify({ type: 'ready' }));
    });

    // Relay: Gemini → Client
    geminiWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data.toString());
      }
    });

    geminiWs.on('error', (err) => {
      console.error('[GeminiLive] Gemini WS error:', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    geminiWs.on('close', () => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'closed' }));
        clientWs.close();
      }
    });

    // Relay: Client → Gemini
    clientWs.on('message', (data) => {
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(data.toString());
      }
    });

    clientWs.on('close', () => {
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close();
      }
    });

    clientWs.on('error', (err) => {
      console.error('[GeminiLive] Client WS error:', err.message);
    });
  });

  console.log('[GeminiLive] WebSocket relay ready at /ws/gemini-live');
}
