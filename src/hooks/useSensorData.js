import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSensors } from '../api/esp32';

export function useSensorData(intervalMs = 2000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const sensors = await fetchSensors();
      if (!mountedRef.current) return;
      setData(sensors);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [poll, intervalMs]);

  return { data, error, loading, lastUpdated, refresh: poll };
}
