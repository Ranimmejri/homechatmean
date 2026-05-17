import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export function useSseData() {
  const [data, setData]               = useState(null);
  const [error, setError]             = useState(null);
  const [connected, setConnected]     = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef                      = useRef(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/sensors`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!active) return;
        if (Object.keys(json).length > 0) {
          setData(json);
          setConnected(true);
          setError(null);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!active) return;
        setConnected(false);
        setError('Lost connection to backend');
      }
    }

    poll();
    timerRef.current = setInterval(poll, 2000);

    return () => {
      active = false;
      clearInterval(timerRef.current);
    };
  }, []);

  return { data, error, connected, lastUpdated };
}
