import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { fiaApi } from './api';
import { DEBOUNCE_BLURRED_MS, DEBOUNCE_TYPING_MS } from './useScriptDiagnostics';
import { useScriptEditor } from './useScriptEditor';

import type { ScriptMonaco } from './monacoTypes';
import type { Mock } from 'vitest';

vi.mock('./api', () => ({
  fiaApi: { post: vi.fn() },
  h5Api: {},
}));

const model = { uri: 'file:///script.py' };

type Fakes = {
  monaco: ScriptMonaco;
  editor: {
    getModel: () => never;
    onDidChangeModel: () => { dispose: () => void };
    onDidFocusEditorWidget: (callback: () => void) => { dispose: () => void };
    onDidBlurEditorWidget: (callback: () => void) => { dispose: () => void };
  };
  setModelMarkers: Mock;
  focusListeners: (() => void)[];
  blurListeners: (() => void)[];
};

const createFakes = (): Fakes => {
  const setModelMarkers = vi.fn();
  const monaco = {
    MarkerSeverity: { Error: 8, Warning: 4 },
    editor: { setModelMarkers },
  } as unknown as ScriptMonaco;

  const focusListeners: (() => void)[] = [];
  const blurListeners: (() => void)[] = [];
  const editor = {
    getModel: () => model as never,
    onDidChangeModel: (): { dispose: () => void } => ({ dispose: vi.fn() }),
    onDidFocusEditorWidget: (callback: () => void): { dispose: () => void } => {
      focusListeners.push(callback);
      return { dispose: vi.fn() };
    },
    onDidBlurEditorWidget: (callback: () => void): { dispose: () => void } => {
      blurListeners.push(callback);
      return { dispose: vi.fn() };
    },
  };

  return { monaco, editor, setModelMarkers, focusListeners, blurListeners };
};

/** The content of every script the hook actually sent, in order. */
const postedContents = (): string[] =>
  vi.mocked(fiaApi.post).mock.calls.map((call) => (call[1] as { content: string }).content);

/**
 * A reply that echoes back the hash of the script it was asked about, which is what the real service does
 * and what the hook needs to accept it rather than discard it as stale.
 */
const reply = (diagnostics: unknown[], parses = true): void => {
  vi.mocked(fiaApi.post).mockImplementation((_url: string, payload?: unknown) =>
    Promise.resolve({
      data: {
        content_hash: (payload as { content_hash: string }).content_hash,
        parses,
        truncated: false,
        diagnostics,
      },
    })
  );
};

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
    await flush();
  });
};

describe('useScriptEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // See `useScriptDiagnostics.test.tsx`: with the host's real WebCrypto the digest resolves on a later
    // tick than these flushes assume, so a test passes alone and fails once other files load the worker.
    vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array(8) });
    reply([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test('asks nothing while the script is still loading', async () => {
    // The editor opens on an empty value before the stored script arrives; checking that would be a wasted
    // round trip and would show "no problems found" about a script nobody has typed yet.
    const { rerender } = renderHook(({ text }: { text: string }) => useScriptEditor(text, { enabled: false }), {
      initialProps: { text: '' },
    });

    rerender({ text: 'print(1)' });
    await runTimers(DEBOUNCE_TYPING_MS + 1000);

    expect(postedContents()).toEqual([]);
  });

  test('asks once the text has settled', async () => {
    const { result } = renderHook(({ text }: { text: string }) => useScriptEditor(text), {
      initialProps: { text: 'print(1)' },
    });
    const { monaco, editor } = createFakes();
    act(() => result.current.onMount(editor as never, monaco));

    await runTimers(DEBOUNCE_TYPING_MS);

    expect(postedContents()).toEqual(['print(1)']);
  });

  test('asks again as soon as the editor loses focus', async () => {
    // Monaco reports focus — the editor library exposes no onFocus/onBlur props to hang this on.
    const { result, rerender } = renderHook(({ text }: { text: string }) => useScriptEditor(text), {
      initialProps: { text: 'print(1)' },
    });
    const { monaco, editor, blurListeners } = createFakes();
    act(() => result.current.onMount(editor as never, monaco));
    await runTimers(DEBOUNCE_TYPING_MS);
    expect(postedContents()).toEqual(['print(1)']);

    act(() => blurListeners.forEach((listener) => listener()));
    rerender({ text: 'print(2)' });
    await runTimers(DEBOUNCE_BLURRED_MS - 1);
    expect(postedContents()).toEqual(['print(1)']);

    await runTimers(1);
    expect(postedContents()).toEqual(['print(1)', 'print(2)']);
  });

  test('puts what comes back onto the editor as markers', async () => {
    reply(
      [
        {
          message: 'invalid syntax',
          severity: 'error',
          source: 'compile',
          start_line: 1,
          start_column: 1,
          end_line: 1,
          end_column: 2,
        },
      ],
      false
    );

    const { result } = renderHook(({ text }: { text: string }) => useScriptEditor(text), {
      initialProps: { text: 'x = ' },
    });
    const { monaco, editor, setModelMarkers } = createFakes();
    act(() => result.current.onMount(editor as never, monaco));

    await runTimers(DEBOUNCE_TYPING_MS);
    await flush();

    expect(result.current.diagnostics.status).toBe('problems');
    expect(setModelMarkers).toHaveBeenLastCalledWith(model, expect.any(String), [
      expect.objectContaining({ message: 'invalid syntax', severity: 8 }),
    ]);
  });

  test('leaves the markers of an unchecked script alone when the service is cold', async () => {
    // A cold service is the one failure where the squiggles already on screen are still the newest true
    // thing about this script, and clearing them would read as "no problems found".
    vi.mocked(fiaApi.post).mockRejectedValue({
      response: { status: 503, data: { detail: { reason: 'warming_up' } } },
    });

    const { result } = renderHook(({ text }: { text: string }) => useScriptEditor(text), {
      initialProps: { text: 'x = ' },
    });
    const { monaco, editor, setModelMarkers } = createFakes();
    act(() => result.current.onMount(editor as never, monaco));
    setModelMarkers.mockClear();

    await runTimers(DEBOUNCE_TYPING_MS);
    await flush();

    expect(result.current.diagnostics.status).toBe('warming_up');
    expect(setModelMarkers).not.toHaveBeenCalled();
  });

  test('closes its editor subscriptions on unmount', () => {
    // `onMount`'s return value is ignored by the editor library, so the subscriptions it opens are closed by
    // an unmount effect; left open they would outlive the editor and fire into a component that is gone.
    const dispose = vi.fn();
    const { result, unmount } = renderHook(() => useScriptEditor('print(1)'));
    const { monaco } = createFakes();
    const editor = {
      getModel: () => model as never,
      onDidChangeModel: (): { dispose: () => void } => ({ dispose }),
      onDidFocusEditorWidget: (): { dispose: () => void } => ({ dispose }),
      onDidBlurEditorWidget: (): { dispose: () => void } => ({ dispose }),
    };
    act(() => result.current.onMount(editor as never, monaco));
    expect(dispose).not.toHaveBeenCalled();

    unmount();

    expect(dispose).toHaveBeenCalledTimes(3);
  });
});
