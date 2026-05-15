import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function ConnectionStatus({ error, loading, lastUpdated, onRefresh }) {
  const connected = !error;
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
        {connected ? 'Connected' : 'Disconnected'}
      </div>

      {error && (
        <span className="hidden text-xs text-red-500 sm:inline">{error}</span>
      )}

      <span className="text-xs text-gray-500">Updated {timeStr}</span>

      <button
        onClick={onRefresh}
        disabled={loading}
        title="Refresh now"
        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300 disabled:opacity-40"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}
