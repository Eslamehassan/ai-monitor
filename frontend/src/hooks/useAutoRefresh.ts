import { useState, useEffect, useCallback } from "react";

const REFRESH_INTERVAL = 5000;

export function useAutoRefresh() {
  const [enabled, setEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setLastUpdated(new Date());
      window.dispatchEvent(new CustomEvent("ai-monitor-refresh"));
    }, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [enabled]);

  return { enabled, setEnabled, lastUpdated };
}

export function useRefreshListener(callback: () => void) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener("ai-monitor-refresh", handler);
    return () => window.removeEventListener("ai-monitor-refresh", handler);
  }, [callback]);
}

export function usePollingData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  useRefreshListener(load);

  return { data, loading, error, refetch: load };
}
