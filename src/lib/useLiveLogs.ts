import { useCallback, useEffect, useRef, useState } from 'react';

const isDev = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
const BASE_URL = import.meta.env.VITE_FIA_REST_API_URL || '';

export interface LogMessage {
  msg: string;
  level: string;
  timestamp: number;
}

interface LogSSEState {
  isConnected: boolean;
  logs: LogMessage[];
  error: string | null;
}

export function useLiveLogsSSE(instrument: string | null, enabled: boolean = true): LogSSEState {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!instrument || !enabled) {
      cleanup();
      setIsConnected(false);
      setLogs([]);
      setError(null);
      return;
    }

    const connect = async (): Promise<void> => {
      cleanup();
      abortControllerRef.current = new AbortController();

      const token = !isDev ? localStorage.getItem('scigateway:token') : '';

      try {
        const response = await fetch(`${BASE_URL}/live-data/${instrument}/logs`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setIsConnected(true);
        setError(null);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        if (!reader) throw new Error('Stream reading not supported');

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || ''; // Keep incomplete chunk in buffer

          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const dataStr = part.replace(/^data: /, '').trim();
              if (dataStr) {
                try {
                  const parsed = JSON.parse(dataStr);
                  setLogs((prev) => [...prev, { ...parsed, timestamp: Date.now() + Math.random() }]);
                } catch {
                  console.error('[LiveLogsSSE] Failed to parse log JSON:', dataStr);
                }
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[LiveLogsSSE] Connection error:', err.message);
          setIsConnected(false);
          setError(err.message);

          // Reconnect logic matching your existing pattern
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      }
    };

    connect();

    return cleanup;
  }, [instrument, enabled, cleanup]);

  return { isConnected, logs, error };
}
