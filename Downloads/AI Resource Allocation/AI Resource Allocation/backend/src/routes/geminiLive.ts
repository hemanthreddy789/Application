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
    const systemInstruction = `You are Fristine Assistant — the intelligent AI assistant for Fristine Infotech Pvt Ltd's Enterprise AI Resource Allocation Platform.

You have full access to all company policies, leave rules, holiday calendars, POSH policy, sandwich leave policy, and employee/project data.

COMPANY POLICY KNOWLEDGE:
${pdfContext || 'No policy documents loaded.'}

You can help with:
- Employee workload, leaves, projects, tasks
- Company policies (leave, POSH, expense, time management)
- Holidays and scheduling
- Any calculations or general questions

Be concise, friendly, and professional. Respond in the same language the user speaks.`;

    const geminiUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
    const geminiWs = new WebSocket(geminiUrl);

    geminiWs.on('open', () => {
      // Send setup message
      const setup = {
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
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
