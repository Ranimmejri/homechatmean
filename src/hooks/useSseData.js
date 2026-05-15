import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export function useSseData() {
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    function connect() {
      const es = new EventSource(`${BACKEND_URL}/api/events`);
      esRef.current = es;

      es.addEventListener('sensor', (e) => {
        setData(JSON.parse(e.data));
        setConnected(true);
        setError(null);
        setLastUpdated(new Date());
      });

      es.addEventListener('error', (e) => {
        setConnected(false);
        setError(JSON.parse(e.data || '{}').message || 'ESP32 unreachable');
      });

      es.onerror = () => {
        setConnected(false);
        setError('Lost connection to backend');
        // browser auto-reconnects SSE; clear error once it reopens
      };

      es.onopen = () => {
        setConnected(true);
        setError(null);
      };
    }

    connect();
    return () => esRef.current?.close();
  }, []);

  return { data, error, connected, lastUpdated };
}
