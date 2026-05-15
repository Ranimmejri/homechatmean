import { Thermometer, Droplets, Flame, Activity, Wind } from 'lucide-react';

const SENSORS = {
  temperature: {
    label: 'Temperature',
    icon: Thermometer,
    unit: '°C',
    format: (v) => v?.toFixed(1) ?? '--',
    color: (v) => {
      if (v == null) return 'text-gray-400';
      if (v >= 35) return 'text-red-400';
      if (v >= 28) return 'text-orange-400';
      return 'text-sky-400';
    },
    border: (v) => {
      if (v == null) return 'border-gray-700';
      if (v >= 35) return 'border-red-500/50';
      if (v >= 28) return 'border-orange-500/50';
      return 'border-sky-500/40';
    },
    subtext: (v) => {
      if (v == null) return 'No data';
      if (v >= 35) return 'High temperature';
      if (v >= 28) return 'Warm';
      return 'Normal';
    },
  },
  humidity: {
    label: 'Humidity',
    icon: Droplets,
    unit: '%',
    format: (v) => v?.toFixed(1) ?? '--',
    color: (v) => {
      if (v == null) return 'text-gray-400';
      if (v > 80 || v < 20) return 'text-orange-400';
      return 'text-cyan-400';
    },
    border: (v) => {
      if (v == null) return 'border-gray-700';
      if (v > 80 || v < 20) return 'border-orange-500/50';
      return 'border-cyan-500/40';
    },
    subtext: (v) => {
      if (v == null) return 'No data';
      if (v > 80) return 'Very humid';
      if (v < 20) return 'Very dry';
      return 'Comfortable';
    },
  },
  flame: {
    label: 'Flame',
    icon: Flame,
    unit: '',
    format: (v) => (v == null ? '--' : v ? 'DETECTED' : 'Clear'),
    color: (v) => {
      if (v == null) return 'text-gray-400';
      return v ? 'text-red-400' : 'text-emerald-400';
    },
    border: (v) => {
      if (v == null) return 'border-gray-700';
      return v ? 'border-red-500' : 'border-emerald-500/40';
    },
    subtext: (v) => {
      if (v == null) return 'No data';
      return v ? 'Fire risk!' : 'No flame';
    },
    isAlert: (v) => v === true,
  },
  movement: {
    label: 'Movement',
    icon: Activity,
    unit: '',
    format: (v) => (v == null ? '--' : v ? 'DETECTED' : 'None'),
    color: (v) => {
      if (v == null) return 'text-gray-400';
      return v ? 'text-yellow-400' : 'text-gray-400';
    },
    border: (v) => {
      if (v == null) return 'border-gray-700';
      return v ? 'border-yellow-500/60' : 'border-gray-700';
    },
    subtext: (v) => {
      if (v == null) return 'No data';
      return v ? 'Motion active' : 'No motion';
    },
  },
  gas: {
    label: 'Gas',
    icon: Wind,
    unit: 'ppm',
    format: (v) => v ?? '--',
    color: (v, alert) => {
      if (v == null) return 'text-gray-400';
      if (alert) return 'text-red-400';
      if (v > 300) return 'text-orange-400';
      return 'text-green-400';
    },
    border: (v, alert) => {
      if (v == null) return 'border-gray-700';
      if (alert) return 'border-red-500';
      if (v > 300) return 'border-orange-500/50';
      return 'border-green-500/40';
    },
    subtext: (v, alert) => {
      if (v == null) return 'No data';
      if (alert) return 'Gas alert!';
      if (v > 300) return 'Elevated';
      return 'Normal';
    },
    isAlert: (_, alert) => alert === true,
  },
};

export default function SensorCard({ type, value, gasAlert }) {
  const cfg = SENSORS[type];
  if (!cfg) return null;

  const Icon = cfg.icon;
  const alert = type === 'gas' ? gasAlert : undefined;
  const isAlerting = cfg.isAlert?.(value, alert) ?? false;

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border bg-gray-900/60 p-5 backdrop-blur transition-all duration-300 ${cfg.border(value, alert)} ${
        isAlerting ? 'shadow-lg shadow-red-500/20' : ''
      }`}
    >
      {isAlerting && (
        <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
      )}

      <div className="flex items-center gap-2">
        <div className={`rounded-lg bg-gray-800 p-2 ${cfg.color(value, alert)}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-gray-400">{cfg.label}</span>
      </div>

      <div className="flex items-end gap-1">
        <span className={`text-4xl font-bold tabular-nums leading-none ${cfg.color(value, alert)}`}>
          {cfg.format(value, alert)}
        </span>
        {cfg.unit && (
          <span className="mb-1 text-lg font-medium text-gray-500">{cfg.unit}</span>
        )}
      </div>

      <p className={`text-xs font-medium ${cfg.color(value, alert)} opacity-80`}>
        {cfg.subtext(value, alert)}
      </p>
    </div>
  );
}
