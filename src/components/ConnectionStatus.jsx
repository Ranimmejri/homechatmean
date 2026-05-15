import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus({ error, connected, lastUpdated }) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          connected
            ? 'bg-emerald-900/50 text-emerald-400'
            : 'bg-red-900/50 text-red-400'
        }`}
      >
        {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        {connected ? 'Live' : 'Disconnected'}
      </div>

      {error && (
        <span className="hidden max-w-[160px] truncate text-xs text-red-500 sm:inline" title={error}>
          {error}
        </span>
      )}

      <span className="text-xs text-gray-500">Updated {timeStr}</span>
    </div>
  );
}
