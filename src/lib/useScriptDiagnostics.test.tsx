import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { fiaApi } from './api';
import { DEBOUNCE_BLURRED_MS, DEBOUNCE_TYPING_MS, useScriptDiagnostics } from './useScriptDiagnostics';

import type { Diagnostic } from './scriptDiagnostics';

vi.mock('./api', () => ({ fiaApi: { post: vi.fn() } }));

interface Deferred {
  promise: Promise<{ data: unknown }>;
  resolve: (value: { data: unknown }) => void;
  reject: (error: unknown) => void;
}

const deferred = (): Deferred => {
  let resolve: (value: { data: unknown }) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<{ data: unknown }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const diagnostic = (message: string, line = 1): Diagnostic => ({
  message,
  severity: 'warning',
  source: 'pyflakes',
  start_line: line,
  start_column: 1,
  end_line: line,
  end_column: 5,
});

const responseFor = (hash: string, diagnostics: Diagnostic[], parses = true): unknown => ({
  content_hash: hash,
  parses,
  diagnostics,
  truncated: false,
});

/** The requests the hook has started, in order, so a test can answer them out of order. */
let requests: { content: string; deferred: Deferred }[] = [];

const takeRequest = (index = 0): { content: string; deferred: Deferred } => {
  const request = requests[index];
  if (request === undefined) {
    throw new Error(`expected a request at ${index}, saw ${requests.length}`);
  }
  return request;
};

beforeEach(() => {
  vi.useFakeTimers();
  // Without this the hash goes through the host's real WebCrypto, whose promise resolves on a later tick
  // than the fake-timer flushes below assume — which shows up as a test passing alone and failing when
  // other files load the worker. The fallback hash is synchronous, and is itself under test.
  vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array(8) });
  requests = [];
  vi.mocked(fiaApi.post).mockImplementation((_url: string, data?: unknown) => {
    const entry = { content: (data as { content: string }).content, deferred: deferred() };
    requests.push(entry);
    return entry.deferred.promise;
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Let queued work run: the timer callback, then `analyseScript`'s own awaits, then the state update.
 * A single microtask is not enough, and the number that is depends on how many awaits sit between them.
 */
const flush = async (): Promise<void> => {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) {
      await Promise.resolve();
    }
  });
};

const runTimers = async (ms: number): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    for (let tick = 0; tick < 10; tick += 1) {
      await Promise.resolve();
    }
  });
};

describe('useScriptDiagnostics', () => {
  test('waits for a pause in typing instead of asking on every keystroke', async () => {
    const { result, rerender } = renderHook(({ text }: { text: string }) => useScriptDiagnostics(text), {
      initialProps: { text: 'x = ' },
    });

    rerender({ text: 'x = 1' });
    await runTimers(DEBOUNCE_TYPING_MS - 1);
    expect(requests).toHaveLength(0);

    rerender({ text: 'x = 12' });
    await runTimers(DEBOUNCE_TYPING_MS);

    expect(requests).toHaveLength(1);
    expect(takeRequest().content).toBe('x = 12');
    expect(result.current.status).toBe('checking');
  });

  test('asks sooner once the editor has lost focus', async () => {
    renderHook(() => useScriptDiagnostics('x = 1', { blurred: true }));

    await runTimers(DEBOUNCE_BLURRED_MS);

    expect(requests).toHaveLength(1);
  });

  test('throws away a reply for text the user has already replaced', async () => {
    const { result, rerender } = renderHook(({ text }: { text: string }) => useScriptDiagnostics(text), {
      initialProps: { text: 'first' },
    });

    await runTimers(DEBOUNCE_TYPING_MS);
    rerender({ text: 'second' });
    await runTimers(DEBOUNCE_TYPING_MS);
    expect(requests).toHaveLength(2);

    // The second answer wins even though the first one arrives afterwards.
    const older = takeRequest(0);
    const newer = takeRequest(1);
    await act(async () => {
      newer.deferred.resolve({ data: responseFor(newer.content, [diagnostic('undefined name b')]) });
    });
    await flush();
    await act(async () => {
      older.deferred.resolve({ data: responseFor(older.content, [diagnostic('from the discarded script')]) });
    });
    await flush();

    expect(result.current.diagnostics.map((item) => item.message)).toEqual(['undefined name b']);
  });

  test('keeps the markers already on screen when the service is still starting', async () => {
    const { result, rerender } = renderHook(({ text }: { text: string }) => useScriptDiagnostics(text), {
      initialProps: { text: 'first' },
    });

    await runTimers(DEBOUNCE_TYPING_MS);
    takeRequest().deferred.resolve({ data: responseFor('first', [diagnostic('a')]) });
    await flush();
    expect(result.current.status).toBe('problems');

    rerender({ text: 'second' });
    await runTimers(DEBOUNCE_TYPING_MS);
    takeRequest(1).deferred.reject({ response: { status: 503, data: { detail: { reason: 'warming_up' } } } });
    await flush();

    // Clearing them here would read as "fixed it", which is the one thing this must never say.
    expect(result.current.status).toBe('warming_up');
    expect(result.current.diagnostics.map((item) => item.message)).toEqual(['a']);
    expect(result.current.parses).toBe(true);
  });

  test('stops asking for the backoff window after a 429', async () => {
    const { result, rerender } = renderHook(({ text }: { text: string }) => useScriptDiagnostics(text), {
      initialProps: { text: 'first' },
    });

    await runTimers(DEBOUNCE_TYPING_MS);
    takeRequest().deferred.reject({
      response: { status: 429, data: { detail: { reason: 'rate_limited' } }, headers: { 'retry-after': '7' } },
    });
    await flush();

    expect(result.current.status).toBe('rate_limited');
    expect(result.current.retryAfterSeconds).toBe(7);

    rerender({ text: 'second' });
    // Backoff is measured from the 429, not from the next edit, so this edit is still waiting.
    await runTimers(DEBOUNCE_TYPING_MS + 5000);
    expect(requests).toHaveLength(1);

    await runTimers(2000);
    expect(requests).toHaveLength(2);
  });

  test('still backs off when the 429 does not say for how long', async () => {
    const { result, rerender } = renderHook(({ text }: { text: string }) => useScriptDiagnostics(text), {
      initialProps: { text: 'first' },
    });

    await runTimers(DEBOUNCE_TYPING_MS);
    takeRequest().deferred.reject({ response: { status: 429, data: { detail: { reason: 'rate_limited' } } } });
    await flush();

    rerender({ text: 'second' });
    await runTimers(DEBOUNCE_TYPING_MS + 3500);
    expect(result.current.retryAfterSeconds).toBeNull();
    expect(requests).toHaveLength(1);

    await runTimers(1500);
    expect(requests).toHaveLength(2);
  });

  test('never sends a script the services would refuse', async () => {
    const huge = 'x'.repeat(200_001);
    const { result } = renderHook(() => useScriptDiagnostics(huge));

    await runTimers(DEBOUNCE_TYPING_MS * 2);

    expect(requests).toHaveLength(0);
    expect(result.current.status).toBe('too_large');
  });

  test('says nothing and asks nothing while disabled', async () => {
    const { result } = renderHook(() => useScriptDiagnostics('x = 1', { enabled: false }));

    await runTimers(DEBOUNCE_TYPING_MS * 2);

    expect(requests).toHaveLength(0);
    expect(result.current.status).toBe('idle');
  });

  test('reports a clean script as clean', async () => {
    const { result } = renderHook(() => useScriptDiagnostics('x = 1'));

    await runTimers(DEBOUNCE_TYPING_MS);
    takeRequest().deferred.resolve({ data: responseFor('x = 1', []) });
    await flush();

    expect(result.current).toMatchObject({ status: 'valid', parses: true, diagnostics: [] });
  });

  test('a script that will not run is not merely a warning', async () => {
    const { result } = renderHook(() => useScriptDiagnostics('def broken(:'));

    await runTimers(DEBOUNCE_TYPING_MS);
    takeRequest().deferred.resolve({
      data: responseFor('def broken(:', [diagnostic('SyntaxError: invalid syntax')], false),
    });
    await flush();

    expect(result.current).toMatchObject({ status: 'problems', parses: false });
  });

  test('cancels a request the component no longer wants', async () => {
    const { unmount } = renderHook(() => useScriptDiagnostics('x = 1'));

    await runTimers(DEBOUNCE_TYPING_MS);
    const signal = vi.mocked(fiaApi.post).mock.calls[0]?.[2] as { signal: AbortSignal } | undefined;
    expect(signal?.signal.aborted).toBe(false);

    unmount();

    expect(signal?.signal.aborted).toBe(true);
  });

  test('refresh asks again about the same text', async () => {
    const { result } = renderHook(() => useScriptDiagnostics('x = 1'));

    await runTimers(DEBOUNCE_TYPING_MS);
    takeRequest().deferred.resolve({ data: responseFor('x = 1', [diagnostic('a')]) });
    await flush();

    act(() => result.current.refresh());
    await runTimers(DEBOUNCE_TYPING_MS);

    expect(requests).toHaveLength(2);
    expect(requests[1]?.content).toBe('x = 1');
  });
});
