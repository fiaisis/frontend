import { useCallback, useEffect, useRef, useState } from 'react';

import { analyseScript, type Diagnostic, type DiagnosticsFailure, isWithinSizeCap } from './scriptDiagnostics';

/**
 * Debounced, stale-safe Python diagnostics for the script editors.
 *
 * Advisory only: nothing here gates saving or "Rerun with changes". Validation disagrees with Mantid
 * occasionally — the runner accepts things the lint does not like, and a live-data script is not the same
 * dialect as a reduction script — and an editor that refused to run a script on the strength of a guess
 * would be worse than no editor at all.
 */

/** Long enough that a burst of typing is one request, short enough that a fix shows up immediately. */
export const DEBOUNCE_TYPING_MS = 1000;

/** On blur the user has stopped typing, so there is nothing further to wait for. */
export const DEBOUNCE_BLURRED_MS = 300;

/** Used when a 429 arrives without a `Retry-After` header. */
export const DEFAULT_BACKOFF_SECONDS = 5;

export type DiagnosticsStatus = 'idle' | 'checking' | 'valid' | 'problems' | DiagnosticsFailure;

export interface ScriptDiagnostics {
  status: DiagnosticsStatus;
  /**
   * The diagnostics for the last script that was actually analysed, which is not necessarily the one on
   * screen: a reply for text the user has replaced is discarded, and a fresh script keeps the previous
   * squiggles until its own reply lands.
   */
  diagnostics: Diagnostic[];
  /** Whether CPython would accept the script, or null when nothing has answered yet. */
  parses: boolean | null;
  /** The service found more diagnostics than it was willing to send. */
  truncated: boolean;
  /** How long to wait before it is worth asking again, for a 429. */
  retryAfterSeconds: number | null;
}

export interface ScriptDiagnosticsState extends ScriptDiagnostics {
  /**
   * Ask again about the script currently on screen. The editors call this on save, so that a user who
   * fixes a script and immediately reruns it is not shown the verdict for the previous text.
   */
  refresh: () => void;
}

const IDLE: ScriptDiagnostics = {
  status: 'idle',
  diagnostics: [],
  parses: null,
  truncated: false,
  retryAfterSeconds: null,
};

export const useScriptDiagnostics = (
  value: string,
  options: { enabled?: boolean; blurred?: boolean } = {}
): ScriptDiagnosticsState => {
  const { enabled = true, blurred = false } = options;
  const [state, setState] = useState<ScriptDiagnostics>(IDLE);
  const inFlight = useRef<AbortController | null>(null);
  /** Monotonic, so a reply can be judged against the newest request rather than the one it was. */
  const requestId = useRef(0);
  /** Not compared on state: this has to be readable when scheduling, not when rendering. */
  const backoffUntil = useRef(0);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((current) => current + 1), []);

  useEffect(() => {
    inFlight.current?.abort();
    inFlight.current = null;

    if (!enabled) {
      setState((current) => ({ ...current, status: 'idle' }));
      return;
    }

    // A script over the cap is never sent, so this is settled without asking anything.
    if (!isWithinSizeCap(value)) {
      setState((current) => ({ ...current, status: 'too_large', parses: null, retryAfterSeconds: null }));
      return;
    }

    const delay = Math.max(blurred ? DEBOUNCE_BLURRED_MS : DEBOUNCE_TYPING_MS, backoffUntil.current - Date.now());
    const id = requestId.current + 1;

    const timer = window.setTimeout(() => {
      requestId.current = id;
      const controller = new AbortController();
      inFlight.current = controller;
      setState((current) => ({ ...current, status: 'checking' }));

      analyseScript(value, controller.signal)
        .then((outcome) => {
          // Either the user typed again, or this component is gone: in both cases this reply is about a
          // script nobody is looking at, and the hash the service echoed back is how we know.
          if (requestId.current !== id) {
            return;
          }
          if (outcome.ok) {
            setState({
              status: outcome.response.parses && outcome.response.diagnostics.length === 0 ? 'valid' : 'problems',
              diagnostics: outcome.response.diagnostics,
              parses: outcome.response.parses,
              truncated: outcome.response.truncated,
              retryAfterSeconds: null,
            });
            return;
          }
          if (outcome.failure === 'rate_limited') {
            const seconds = outcome.retryAfterSeconds ?? DEFAULT_BACKOFF_SECONDS;
            backoffUntil.current = Date.now() + seconds * 1000;
          }
          // Anything else is our problem, not the user's: keep the markers already on screen, because
          // dropping them would claim the script had nothing wrong with it.
          setState((current) => ({
            ...current,
            status: outcome.failure,
            parses: outcome.failure === 'warming_up' ? current.parses : null,
            retryAfterSeconds: outcome.retryAfterSeconds,
          }));
        })
        .catch(() => {
          // Aborted, which is the caller losing interest rather than a failure worth reporting.
        });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [value, enabled, blurred, nonce]);

  useEffect(
    () => () => {
      requestId.current += 1;
      inFlight.current?.abort();
    },
    []
  );

  return { ...state, refresh };
};
