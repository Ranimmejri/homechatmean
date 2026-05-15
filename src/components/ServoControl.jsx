import { useState } from 'react';
import { LockOpen, Lock, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { controlServo } from '../api/esp32';

const STATUS = { idle: 'idle', loading: 'loading', ok: 'ok', error: 'error' };

export default function ServoControl() {
  const [position, setPosition] = useState(null); // 'open' | 'close' | null
  const [status, setStatus] = useState(STATUS.idle);
  const [statusMsg, setStatusMsg] = useState('');

  async function send(action) {
    setStatus(STATUS.loading);
    setStatusMsg('');
    try {
      await controlServo(action);
      setPosition(action);
      setStatus(STATUS.ok);
      setStatusMsg(`Door ${action === 'open' ? 'opened' : 'closed'} successfully`);
    } catch (err) {
      setStatus(STATUS.error);
      setStatusMsg(err.message);
    } finally {
      setTimeout(() => setStatus(STATUS.idle), 3000);
    }
  }

  const isLoading = status === STATUS.loading;

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-gray-800 p-2 text-violet-400">
          {position === 'open' ? <LockOpen size={18} /> : <Lock size={18} />}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Servo / Door Control</h2>
          <p className="text-xs text-gray-500">
            {position == null ? 'Position unknown' : `Currently ${position === 'open' ? 'open' : 'closed'}`}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => send('open')}
          disabled={isLoading || position === 'open'}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LockOpen size={16} />}
          Open
        </button>

        <button
          onClick={() => send('close')}
          disabled={isLoading || position === 'close'}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          Close
        </button>
      </div>

      {status !== STATUS.idle && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
            status === STATUS.ok
              ? 'bg-emerald-900/50 text-emerald-400'
              : status === STATUS.error
              ? 'bg-rose-900/50 text-rose-400'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {status === STATUS.ok && <CheckCircle size={14} />}
          {status === STATUS.error && <XCircle size={14} />}
          {status === STATUS.loading && <Loader2 size={14} className="animate-spin" />}
          {status === STATUS.loading ? 'Sending command…' : statusMsg}
        </div>
      )}
    </div>
  );
}
