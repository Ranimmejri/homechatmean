import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { addSseClient, removeSseClient, startMqttSubscriber } from './mqtt-subscriber.js';
import { initVapid, addSubscription, removeSubscription } from './notifier.js';

const PORT          = process.env.PORT              || 4000;
const MQTT_URL      = process.env.MQTT_BROKER_URL   || 'mqtt://localhost:1883';
const SENSOR_TOPIC  = process.env.MQTT_SENSOR_TOPIC || 'esp32/sensors';
const SERVO_TOPIC   = process.env.MQTT_SERVO_TOPIC  || 'esp32/servo/command';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ─── SSE — real-time filtered sensor stream ───────────────────────────────────
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',       'text/event-stream');
  res.setHeader('Cache-Control',      'no-cache');
  res.setHeader('Connection',         'keep-alive');
  res.setHeader('X-Accel-Buffering',  'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setTimeout(0);
  req.socket.setTimeout(0);
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
  const clientId  = addSseClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(clientId);
  });
});

// ─── Servo control — frontend POSTs here, backend publishes MQTT command ──────
app.post('/api/servo/:action', (req, res) => {
  const { action } = req.params;
  if (action !== 'open' && action !== 'close') {
    return res.status(400).json({ error: 'action must be "open" or "close"' });
  }
  mqttClient.publish(SERVO_TOPIC, action, { qos: 1 }, (err) => {
    if (err) return res.status(502).json({ error: 'MQTT publish failed', detail: err.message });
    res.json({ ok: true, action });
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
const mqttClient = startMqttSubscriber(MQTT_URL, SENSOR_TOPIC);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] MQTT broker : ${MQTT_URL}`);
  console.log(`[server] sensor topic: ${SENSOR_TOPIC}`);
  console.log(`[server] servo topic : ${SERVO_TOPIC}`);
});
