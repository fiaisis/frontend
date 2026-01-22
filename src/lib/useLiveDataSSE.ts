import { useEffect, useState, useRef, useCallback } from 'react';

interface FileChangedEvent {
  file: string;
  change_type: 'added' | 'modified' | 'deleted';
}

interface SSEState {
  isConnected: boolean;
  changedFile: FileChangedEvent | null;
  lastUpdated: Date | null;
  error: string | null;
}

const isDev = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';

/**
 * Custom React hook for managing SSE connection to live data endpoint
 * @param instrument - The instrument name to watch (e.g., 'MARI')
 * @param enabled - Whether the SSE connection should be active
 * @returns SSE state including connection status, changed file info, and errors
 */
export function useLiveDataSSE(instrument: string | null, enabled: boolean = true): SSEState {
  const [isConnected, setIsConnected] = useState(false);
  const [changedFile, setChangedFile] = useState<FileChangedEvent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!instrument || !enabled) {
      cleanup();
      setIsConnected(false);
      setChangedFile(null);
      setError(null);
      return;
    }

    const connect = () => {
      cleanup();

      const baseUrl = import.meta.env.VITE_FIA_PLOTTING_API_URL;
      const token = !isDev ? localStorage.getItem('scigateway:token') : '';
      const url = `${baseUrl}/live/live-data/${instrument}${token ? `?token=${token}` : ''}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('[LiveDataSSE] Connected to directory:', data.directory);
        setIsConnected(true);
        setError(null);
      });

      eventSource.addEventListener('file_changed', (event) => {
        const data: FileChangedEvent = JSON.parse(event.data);
        console.log('[LiveDataSSE] File changed:', data);
        setChangedFile(data);
        setLastUpdated(new Date());
      });

      eventSource.addEventListener('error', (event) => {
        if (event instanceof MessageEvent) {
          const data = JSON.parse(event.data);
          console.error('[LiveDataSSE] Server error:', data.error);
          setError(data.error);
        }
      });

      eventSource.onerror = () => {
        console.error('[LiveDataSSE] Connection error, attempting reconnect...');
        setIsConnected(false);
        cleanup();

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[LiveDataSSE] Reconnecting...');
          connect();
        }, 5000);
      };

      eventSource.onopen = () => {
        console.log('[LiveDataSSE] Connection opened');
      };
    };

    connect();

    return cleanup;
  }, [instrument, enabled, cleanup]);

  return { isConnected, changedFile, lastUpdated, error };
}
