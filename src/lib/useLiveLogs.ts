import { useCallback, useEffect, useRef, useState } from 'react';

const isDev = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
const BASE_URL = import.meta.env.VITE_FIA_REST_API_URL || '';

export interface LogMessage {
  msg: string;
  level: string;
  timestamp: number;
  valkey_id?: string; // Added to track the stream ID
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

  // Track the last received ID across reconnects without triggering re-renders
  const lastIdRef = useRef<string>('0');

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

  // Reset logs and the Last-Event-ID if the instrument changes entirely
  useEffect(() => {
    lastIdRef.current = '0';
    setLogs([]);
  }, [instrument]);

  useEffect(() => {
    if (!instrument || !enabled) {
      cleanup();
      setIsConnected(false);
      setError(null);
      return;
    }

    const connect = async (): Promise<void> => {
      cleanup();
      abortControllerRef.current = new AbortController();

      const token = !isDev ? localStorage.getItem('scigateway:token') : '';

      try {
        // Append the ?since parameter using the last known ID
        const response = await fetch(`${BASE_URL}/live-data/${instrument}/logs?since=${lastIdRef.current}`, {
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
            // Parse standard SSE chunks which might contain both 'id:' and 'data:' lines
            const lines = part.split('\n');
            let dataStr = '';
            let eventId = '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                dataStr = line.substring(5).trim();
              } else if (line.startsWith('id:')) {
                eventId = line.substring(3).trim();
              }
            }

            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);

                // Use the ID from the SSE event, or fallback to the injected JSON one
                const currentId = eventId || parsed.valkey_id;
                if (currentId) {
                  lastIdRef.current = currentId;
                }

                setLogs((prev) => [
                  ...prev,
                  {
                    ...parsed,
                    valkey_id: currentId,
                    // Prefer the server's timestamp. Removed Math.random() as it breaks React keys/deduplication
                    timestamp: parsed.timestamp || Date.now(),
                  },
                ]);
              } catch {
                console.error('[LiveLogsSSE] Failed to parse log JSON:', dataStr);
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
