import mqtt from 'mqtt';
import { sendNotification } from './notifier.js';

// ─── Change-detection thresholds ─────────────────────────────────────────────
// Numeric sensors: only forward to SSE clients when delta ≥ threshold.
// Boolean sensors (flame, movement, gas_alert): any flip always forwards.
const THRESHOLDS = {
  temperature: 0.5,   // °C
  humidity:    1.0,   // %
  gas:         15,    // raw ADC units
};

// ─── SSE client registry ──────────────────────────────────────────────────────
const clients = new Map();
let clientIdSeq = 0;
let lastSnapshot = null;

export function getLastSnapshot() { return lastSnapshot; }

export function addSseClient(res) {
  const id = ++clientIdSeq;
  clients.set(id, res);
  console.log(`[mqtt-sub] SSE client connected (total: ${clients.size})`);
  if (lastSnapshot) sendEvent(res, 'sensor', lastSnapshot); // immediate snapshot
  return id;
}

export function removeSseClient(id) {
  clients.delete(id);
  console.log(`[mqtt-sub] SSE client disconnected (total: ${clients.size})`);
}

function broadcast(eventName, data) {
  for (const res of clients.values()) sendEvent(res, eventName, data);
}

function sendEvent(res, eventName, data) {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─── Filter: has anything changed meaningfully? ───────────────────────────────
function hasChanged(prev, curr) {
  if (!prev) return true;

  for (const key of ['flame', 'movement', 'gas_alert']) {
    if (prev[key] !== curr[key]) return true;
  }
  for (const [key, threshold] of Object.entries(THRESHOLDS)) {
    if (Math.abs((prev[key] ?? 0) - (curr[key] ?? 0)) >= threshold) return true;
  }
  return false;
}

// ─── Danger detection (rising-edge only — no repeated alerts) ─────────────────
function getDangerAlerts(prev, curr) {
  const alerts = [];
  if (!prev?.flame && curr.flame)
    alerts.push({ title: 'Fire Alert!',        body: 'Flame detected by sensor.',         tag: 'flame', critical: true  });
  if (!prev?.gas_alert && curr.gas_alert)
    alerts.push({ title: 'Gas Alert!',         body: `Gas level critical: ${curr.gas} ppm.`, tag: 'gas',   critical: true  });
  if ((prev?.temperature ?? 0) < 40 && (curr.temperature ?? 0) >= 40)
    alerts.push({ title: 'High Temperature!',  body: `${curr.temperature?.toFixed(1)}°C reached.`, tag: 'temp', critical: false });
  return alerts;
}

// ─── MQTT subscriber ──────────────────────────────────────────────────────────
export function startMqttSubscriber(brokerUrl, sensorTopic, options = {}) {
  console.log(`[mqtt-sub] connecting to broker: ${brokerUrl}`);

  const client = mqtt.connect(brokerUrl, {
    clientId:      `esp32-backend-${Math.random().toString(16).slice(2, 8)}`,
    clean:         true,
    reconnectPeriod: 3000,
    ...options,
  });

  client.on('connect', () => {
    console.log(`[mqtt-sub] connected — subscribing to "${sensorTopic}"`);
    client.subscribe(sensorTopic, { qos: 1 }, (err) => {
      if (err) console.error('[mqtt-sub] subscribe error:', err.message);
    });
  });

  client.on('message', async (_topic, message) => {
    let curr;
    try {
      curr = JSON.parse(message.toString());
    } catch (err) {
      console.error('[mqtt-sub] invalid JSON payload:', err.message);
      return;
    }

    // ── FILTER: drop the message if nothing changed ───────────────────────
    if (!hasChanged(lastSnapshot, curr)) return;

    const dangerAlerts = getDangerAlerts(lastSnapshot, curr);
    lastSnapshot = curr;

    broadcast('sensor', curr);
    console.log('[mqtt-sub] data changed — SSE broadcast sent');

    for (const alert of dangerAlerts) {
      await sendNotification(alert);
      broadcast('alert', alert);
      console.log(`[mqtt-sub] danger alert dispatched: ${alert.title}`);
    }
  });

  client.on('error',   (err) => {
    console.error(`[mqtt-sub] error: ${err.message}`);
    broadcast('error', { message: `MQTT error: ${err.message}` });
  });

  client.on('offline', () => {
    console.warn('[mqtt-sub] broker offline — reconnecting…');
    broadcast('error', { message: 'MQTT broker offline' });
  });

  client.on('reconnect', () => console.log('[mqtt-sub] reconnecting…'));

  return client; // caller may publish servo commands on the same client
}
