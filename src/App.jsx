import { useState } from 'react';
import { Cpu, Settings, X } from 'lucide-react';
import SensorCard from './components/SensorCard';
import ServoControl from './components/ServoControl';
import AlertBanner from './components/AlertBanner';
import ConnectionStatus from './components/ConnectionStatus';
import { useSensorData } from './hooks/useSensorData';

const ESP32_URL = import.meta.env.VITE_ESP32_URL || 'http://192.168.1.100';

export default function App() {
  const { data, error, loading, lastUpdated, refresh } = useSensorData(2000);
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600/20 p-2.5 text-violet-400">
              <Cpu size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ESP32 Dashboard</h1>
              <p className="text-xs text-gray-500">{ESP32_URL}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionStatus
              error={error}
              loading={loading}
              lastUpdated={lastUpdated}
              onRefresh={refresh}
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
            <SensorCard type="humidity" value={data?.humidity} />
            <SensorCard type="flame" value={data?.flame} />
            <SensorCard type="movement" value={data?.movement} />
            <SensorCard type="gas" value={data?.gas} gasAlert={data?.gas_alert} />
          </div>
        </section>

        {/* Servo control */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Actuator
          </h2>
          <ServoControl />
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-700">
          Polling every 2 s &mdash; ESP32 Sensor Dashboard
        </footer>
      </div>

      {/* Config modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Configuration</h2>
              <button
                onClick={() => setShowConfig(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-400">
              <p>
                Set your ESP32 IP address by creating a{' '}
                <code className="rounded bg-gray-800 px-1 text-violet-400">.env</code> file:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-gray-800 p-3 text-xs text-gray-300">
                {`# .env\nVITE_ESP32_URL=http://192.168.x.x`}
              </pre>
              <p>Restart the dev server after editing.</p>
              <div className="mt-2 rounded-lg bg-gray-800 p-3">
                <p className="text-xs text-gray-500">Expected endpoints</p>
                <ul className="mt-1 space-y-1 text-xs text-gray-300">
                  <li><code className="text-violet-400">GET</code> /sensors — all sensor data</li>
                  <li><code className="text-emerald-400">POST</code> /servo/open — open door</li>
                  <li><code className="text-rose-400">POST</code> /servo/close — close door</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
