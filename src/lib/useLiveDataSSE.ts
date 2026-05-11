import { useEffect, useState, useRef, useCallback } from 'react';

interface FileChangedEvent {
  file: string;
  change_type: 'added' | 'modified' | 'deleted';
}

interface SSEState {
  isConnected: boolean;
  directory: string | null;
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
  const [directory, setDirectory] = useState<string | null>(null);
  const [changedFile, setChangedFile] = useState<FileChangedEvent | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
      setDirectory(null);
      setChangedFile(null);
      setError(null);
      return;
    }

    const connect = async (): Promise<void> => {
      cleanup();
      abortControllerRef.current = new AbortController();

      const baseUrl = import.meta.env.VITE_FIA_PLOTTING_API_URL;
      const token = !isDev ? localStorage.getItem('scigateway:token') : '';
      const url = `${baseUrl}/live/live-data/${instrument}`;

      try {
        const response = await fetch(url, {
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
            const lines = part.split('\n');
            let eventName = '';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.substring(5).trim();
              }
            }

            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                if (eventName === 'connected') {
                  setDirectory(data.directory);
                  setIsConnected(true);
                } else if (eventName === 'file_changed') {
                  setChangedFile(data);
                  setLastUpdated(new Date());
                } else if (eventName === 'error') {
                  console.error('[LiveDataSSE] Server error:', data.error);
                  setError(data.error);
                }
              } catch (e) {
                console.error('[LiveDataSSE] Failed to parse event JSON:', dataStr, e);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[LiveDataSSE] Connection error:', err.message);
          setIsConnected(false);
          setError(err.message);

          // Reconnect logic matching the log viewer pattern
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      }
    };

    connect();

    return cleanup;
  }, [instrument, enabled, cleanup]);

  return { isConnected, directory, changedFile, lastUpdated, error };
}
