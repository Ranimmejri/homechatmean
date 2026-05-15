import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

function buildAlerts(data) {
  if (!data) return [];
  const alerts = [];
  if (data.flame) alerts.push({ id: 'flame', msg: 'Flame detected — fire risk!', level: 'critical' });
  if (data.gas_alert) alerts.push({ id: 'gas', msg: `Gas level critical (${data.gas} ppm)`, level: 'critical' });
  if (data.temperature >= 40) alerts.push({ id: 'temp', msg: `Extreme temperature: ${data.temperature?.toFixed(1)}°C`, level: 'warning' });
  if (data.gas > 300 && !data.gas_alert) alerts.push({ id: 'gas_warn', msg: `Elevated gas level (${data.gas} ppm)`, level: 'warning' });
  return alerts;
}

export default function AlertBanner({ data }) {
  const [dismissed, setDismissed] = useState(new Set());
  const alerts = buildAlerts(data).filter((a) => !dismissed.has(a.id));

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            alert.level === 'critical'
              ? 'border border-red-500/50 bg-red-900/40 text-red-300'
              : 'border border-yellow-500/50 bg-yellow-900/40 text-yellow-300'
          }`}
        >
          <AlertTriangle size={16} className="shrink-0 animate-pulse-fast" />
          <span className="flex-1">{alert.msg}</span>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
            className="rounded p-0.5 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
