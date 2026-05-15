import { useState, useEffect } from 'react';
import { Cpu, Settings, X } from 'lucide-react';
import SensorCard from './components/SensorCard';
import ServoControl from './components/ServoControl';
import AlertBanner from './components/AlertBanner';
import ConnectionStatus from './components/ConnectionStatus';
import NotificationToggle from './components/NotificationToggle';
import { useSseData } from './hooks/useSseData';
import { registerServiceWorker } from './notifications';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default function App() {
  const { data, error, connected, lastUpdated } = useSseData();
  const [showConfig, setShowConfig]             = useState(false);
  const [swReg, setSwReg]                       = useState(null);

  useEffect(() => {
    registerServiceWorker().then((reg) => { if (reg) setSwReg(reg); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600/20 p-2.5 text-violet-400">
              <Cpu size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ESP32 Dashboard</h1>
              <p className="text-xs text-gray-500">{BACKEND_URL}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NotificationToggle swRegistration={swReg} />
            <ConnectionStatus
              error={error}
              connected={connected}
              lastUpdated={lastUpdated}
            />
            <button
              onClick={() => setShowConfig(true)}
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300"
              title="Configuration"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Alerts */}
        <AlertBanner data={data} />

        {/* Sensor grid */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Sensors
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SensorCard type="temperature" value={data?.temperature} />
            <SensorCard type="humidity"    value={data?.humidity} />
            <SensorCard type="flame"       value={data?.flame} />
            <SensorCard type="movement"    value={data?.movement} />
            <SensorCard type="gas"         value={data?.gas} gasAlert={data?.gas_alert} />
          </div>
        </section>

        {/* Servo control */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Actuator
          </h2>
          <ServoControl />
        </section>

        <footer className="text-center text-xs text-gray-700">
          Real-time via SSE &mdash; changes filtered server-side &mdash; ESP32 Dashboard
        </footer>
      </div>

      {/* Config modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Configuration</h2>
              <button onClick={() => setShowConfig(false)} className="rounded-lg p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-400">
              <p>
                Create a <code className="rounded bg-gray-800 px-1 text-violet-400">backend/.env</code> and a{' '}
                <code className="rounded bg-gray-800 px-1 text-violet-400">.env</code> in the project root.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-gray-800 p-3 text-xs text-gray-300">{`# backend/.env
ESP32_URL=http://192.168.x.x
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# .env (frontend)
VITE_BACKEND_URL=http://localhost:4000
VITE_VAPID_PUBLIC_KEY=...`}</pre>
              <p>Run <code className="text-violet-400">npm run gen-vapid</code> inside <code>backend/</code> to generate VAPID keys.</p>
              <div className="rounded-lg bg-gray-800 p-3">
                <p className="text-xs text-gray-500">Backend endpoints</p>
                <ul className="mt-1 space-y-1 text-xs text-gray-300">
                  <li><code className="text-violet-400">GET</code>  /api/events — SSE sensor stream</li>
                  <li><code className="text-emerald-400">POST</code> /api/push/subscribe — register notifications</li>
                  <li><code className="text-rose-400">DELETE</code> /api/push/subscribe — unregister</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
