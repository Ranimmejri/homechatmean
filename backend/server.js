import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { addSseClient, removeSseClient, startPolling } from './poller.js';
import { initVapid, addSubscription, removeSubscription } from './notifier.js';

const PORT       = process.env.PORT            || 4000;
const ESP32_URL  = process.env.ESP32_URL       || 'http://192.168.1.100';
const POLL_MS    = Number(process.env.POLL_INTERVAL_MS) || 2000;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ─── SSE — real-time sensor stream ───────────────────────────────────────────
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if behind proxy
  res.flushHeaders();

  // keep-alive comment every 25s to prevent proxy timeouts
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

  const clientId = addSseClient(res);
  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(clientId);
  });
});

// ─── Web Push ─────────────────────────────────────────────────────────────────
app.get('/api/push/vapid-public-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'VAPID not configured' });
  res.json({ publicKey: key });
});

app.post('/api/push/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) return res.status(400).json({ error: 'invalid subscription' });
  addSubscription(sub);
  res.status(201).json({ ok: true });
});

app.delete('/api/push/subscribe', (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) removeSubscription(endpoint);
  res.json({ ok: true });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
initVapid();
startPolling(ESP32_URL, POLL_MS);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] polling ESP32 at ${ESP32_URL} every ${POLL_MS}ms`);
});
