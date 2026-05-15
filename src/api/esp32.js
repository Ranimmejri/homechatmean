const BASE_URL = import.meta.env.VITE_ESP32_URL || 'http://192.168.1.100';

/**
 * Expected ESP32 JSON response from GET /sensors:
 * {
 *   "temperature": 25.4,   // °C
 *   "humidity": 65.2,      // %
 *   "flame": false,        // boolean — true if flame detected
 *   "movement": false,     // boolean — true if motion detected
 *   "gas": 120,            // raw ADC value (0–4095) or PPM
 *   "gas_alert": false     // true if gas exceeds threshold
 * }
 */
export async function fetchSensors() {
  const res = await fetch(`${BASE_URL}/sensors`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function controlServo(action) {
  const res = await fetch(`${BASE_URL}/servo/${action}`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
