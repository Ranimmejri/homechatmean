import fetch from 'node-fetch';
import { sendNotification } from './notifier.js';

// ─── Change-detection thresholds ─────────────────────────────────────────────
// Numeric sensors only broadcast when the value moves by at least this much.
// Boolean sensors (flame, movement, gas_alert) always broadcast on any change.
const THRESHOLDS = {
  temperature: 0.5,   // °C
  humidity: 1.0,      // %
  gas: 15,            // raw ADC units
};

// ─── SSE client registry ──────────────────────────────────────────────────────
const clients = new Map();
let clientIdSeq = 0;

export function addSseClient(res) {
  const id = ++clientIdSeq;
  clients.set(id, res);
  console.log(`[poller] SSE client connected (total: ${clients.size})`);

  // send the last known snapshot immediately so the UI isn't blank
  if (lastSnapshot) {
    sendEvent(res, 'sensor', lastSnapshot);
  }

  return id;
}

export function removeSseClient(id) {
  clients.delete(id);
  console.log(`[poller] SSE client disconnected (total: ${clients.size})`);
}

function broadcast(eventName, data) {
  for (const res of clients.values()) {
    sendEvent(res, eventName, data);
  }
}

function sendEvent(res, eventName, data) {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─── Change detection ─────────────────────────────────────────────────────────
function hasChanged(prev, curr) {
  if (!prev) return true;

  // Boolean fields: any flip counts
  for (const key of ['flame', 'movement', 'gas_alert']) {
    if (prev[key] !== curr[key]) return true;
  }

  // Numeric fields: only if delta exceeds threshold
  for (const [key, threshold] of Object.entries(THRESHOLDS)) {
    if (Math.abs((prev[key] ?? 0) - (curr[key] ?? 0)) >= threshold) return true;
  }

  return false;
}

// ─── Danger notification (rising-edge only) ────────────────────────────────────
function checkDangerAlerts(prev, curr) {
  const alerts = [];

  if (!prev?.flame && curr.flame) {
    alerts.push({ title: 'Fire Alert!', body: 'Flame detected by sensor.', tag: 'flame', critical: true });
  }
  if (!prev?.gas_alert && curr.gas_alert) {
    alerts.push({ title: 'Gas Alert!', body: `Dangerous gas level: ${curr.gas} ppm.`, tag: 'gas', critical: true });
  }
  if ((prev?.temperature ?? 0) < 40 && (curr.temperature ?? 0) >= 40) {
    alerts.push({ title: 'High Temperature!', body: `Temperature reached ${curr.temperature?.toFixed(1)}°C.`, tag: 'temp', critical: false });
  }

  return alerts;
}

// ─── Polling loop ─────────────────────────────────────────────────────────────
let lastSnapshot = null;
let pollTimer = null;

export function startPolling(esp32Url, intervalMs = 2000) {
  console.log(`[poller] starting — ESP32: ${esp32Url}, interval: ${intervalMs}ms`);

  async function tick() {
    try {
      const res = await fetch(`${esp32Url}/sensors`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const curr = await res.json();

      if (hasChanged(lastSnapshot, curr)) {
        const dangerAlerts = checkDangerAlerts(lastSnapshot, curr);
        lastSnapshot = curr;

        broadcast('sensor', curr);
        console.log('[poller] data changed — broadcast sent');

        for (const alert of dangerAlerts) {
          await sendNotification(alert);
          broadcast('alert', alert);
          console.log(`[poller] danger alert sent: ${alert.title}`);
        }
      }
    } catch (err) {
      broadcast('error', { message: err.message });
      console.error(`[poller] fetch error: ${err.message}`);
    }
  }

  tick(); // run immediately
  pollTimer = setInterval(tick, intervalMs);
}

export function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
}
