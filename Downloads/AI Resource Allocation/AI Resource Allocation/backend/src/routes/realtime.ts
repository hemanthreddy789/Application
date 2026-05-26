// Enterprise Real-Time Collaboration API Routes (Server-Sent Events)
import express from 'express';

const router = express.Router();

let clients: any[] = [];

/**
 * 1. Subscribe to Server-Sent Events (SSE) Stream
 */
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'HANDSHAKE', message: 'Connected to Enterprise Real-Time Staffing Stream' })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

/**
 * 2. Broadcast Staffing Update Webhook
 * Triggered internally when Manager A assigns a task or overrides recommendations.
 */
export function broadcastStaffingUpdate(tenantId: string, updatePayload: any) {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type: 'STAFFING_UPDATE', tenantId, data: updatePayload })}\n\n`);
  });
}

router.post('/broadcast', (req, res) => {
  const { tenantId, updatePayload } = req.body;
  broadcastStaffingUpdate(tenantId || "e207b7b0-8f92-4f11-9a73-000000000001", updatePayload);

  res.json({ success: true, message: 'Broadcast dispatched to active client streams.' });
});

export default router;
