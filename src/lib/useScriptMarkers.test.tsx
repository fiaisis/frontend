import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useScriptDiagnostics } from './useScriptDiagnostics';
import { useScriptMarkers } from './useScriptMarkers';

import type { ScriptMonaco } from './monaco';
import type { Diagnostic } from './scriptDiagnostics';
import type { Mock } from 'vitest';

vi.mock('./api', () => ({
  fiaApi: { post: vi.fn() },
  h5Api: {},
}));

const diagnostic: Diagnostic = {
  message: 'invalid syntax',
  severity: 'error',
  source: 'compile',
  start_line: 1,
  start_column: 6,
  end_line: 1,
  end_column: 7,
};

const model = { uri: 'file:///script.py' };

/** A Monaco and an editor, reduced to what the bridge calls — see `scriptMarkers.test.ts` for why. */
type Fakes = {
  monaco: ScriptMonaco;
  editor: {
    getModel: () => never;
    onDidChangeModel: (callback: () => void) => { dispose: () => void };
  };
  setModelMarkers: Mock;
  modelListeners: (() => void)[];
  dispose: Mock;
};

const createFakes = (): Fakes => {
  const setModelMarkers = vi.fn();
  const monaco = {
    MarkerSeverity: { Error: 8, Warning: 4 },
    editor: { setModelMarkers },
  } as unknown as ScriptMonaco;

  const modelListeners: (() => void)[] = [];
  const dispose = vi.fn();
  const editor = {
    getModel: () => model as never,
    onDidChangeModel: (callback: () => void): { dispose: () => void } => {
      modelListeners.push(callback);
      return { dispose };
    },
  };

  return { monaco, editor, setModelMarkers, modelListeners, dispose };
};

describe('useScriptMarkers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('draws what it is given as soon as the editor mounts', () => {
    const { result } = renderHook(() =>
      useScriptMarkers({
        status: 'problems',
        diagnostics: [diagnostic],
        parses: false,
        truncated: false,
        retryAfterSeconds: null,
      })
    );
    const { monaco, editor, setModelMarkers } = createFakes();

    act(() => result.current.onMount(editor as never, monaco));

    expect(setModelMarkers).toHaveBeenCalledTimes(1);
    expect(setModelMarkers.mock.calls[0][2]).toEqual([
      expect.objectContaining({ message: 'invalid syntax', severity: 8 }),
    ]);
  });

  test('redraws when a new result arrives', () => {
    const { result, rerender } = renderHook(
      ({ problems }: { problems: Diagnostic[] }) =>
        useScriptMarkers({
          status: 'problems',
          diagnostics: problems,
          parses: true,
          truncated: false,
          retryAfterSeconds: null,
        }),
      {
        initialProps: { problems: [] as Diagnostic[] },
      }
    );
    const { monaco, editor, setModelMarkers } = createFakes();
    act(() => result.current.onMount(editor as never, monaco));

    rerender({ problems: [diagnostic] });

    expect(setModelMarkers).toHaveBeenLastCalledWith(model, expect.any(String), [expect.anything()]);
  });

  test('redraws onto a model the editor swaps in', () => {
    // Markers belong to a model rather than an editor, so without this the new model stays blank until the
    // user types something.
    const { result } = renderHook(() =>
      useScriptMarkers({
        status: 'problems',
        diagnostics: [diagnostic],
        parses: true,
        truncated: false,
        retryAfterSeconds: null,
      })
    );
    const { monaco, editor, setModelMarkers, modelListeners } = createFakes();
    act(() => result.current.onMount(editor as never, monaco));
    setModelMarkers.mockClear();

    act(() => modelListeners.forEach((listener) => listener()));

    expect(setModelMarkers).toHaveBeenCalledTimes(1);
  });

  test('takes its markers with it on unmount', () => {
    // Otherwise a script opened again later shows squiggles left over from the previous visit.
    const { result, unmount } = renderHook(() =>
      useScriptMarkers({
        status: 'problems',
        diagnostics: [diagnostic],
        parses: true,
        truncated: false,
        retryAfterSeconds: null,
      })
    );
    const { monaco, editor, setModelMarkers, dispose } = createFakes();
    act(() => result.current.onMount(editor as never, monaco));

    unmount();

    expect(dispose).toHaveBeenCalled();
    expect(setModelMarkers).toHaveBeenLastCalledWith(model, expect.any(String), []);
  });

  test('does nothing before the editor has mounted', () => {
    // The hook's own effect runs on the first render, which is before Monaco has an editor to draw on.
    const { setModelMarkers } = createFakes();
    renderHook(() =>
      useScriptMarkers({
        status: 'problems',
        diagnostics: [diagnostic],
        parses: true,
        truncated: false,
        retryAfterSeconds: null,
      })
    );
    expect(setModelMarkers).not.toHaveBeenCalled();
  });
});

describe('useScriptDiagnostics and useScriptMarkers together', () => {
  // The pair the editors use: a reply from the service has to end up as a squiggle without the page doing
  // anything beyond handing the hook the text and the editor its onMount.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array(8) });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test('a reply from the service appears as a marker', async () => {
    const { fiaApi } = await import('./api');
    // The service echoes the hash of the script it analysed, and a reply whose echo does not match is
    // discarded as stale — so the fake has to echo rather than invent one.
    vi.mocked(fiaApi.post).mockImplementation((_url: string, payload?: unknown) =>
      Promise.resolve({
        data: {
          content_hash: (payload as { content_hash: string }).content_hash,
          parses: false,
          truncated: false,
          diagnostics: [diagnostic],
        },
      })
    );

    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => {
        const diagnostics = useScriptDiagnostics(text);
        return { markers: useScriptMarkers(diagnostics), diagnostics };
      },
      { initialProps: { text: 'x = ' } }
    );

    const { monaco, editor, setModelMarkers } = createFakes();
    act(() => result.current.markers.onMount(editor as never, monaco));

    rerender({ text: 'x = +' });
    await act(async () => {
      vi.advanceTimersByTime(1000);
      for (let tick = 0; tick < 10; tick += 1) {
        await Promise.resolve();
      }
    });

    expect(setModelMarkers).toHaveBeenLastCalledWith(model, expect.any(String), [
      expect.objectContaining({ message: 'invalid syntax', severity: 8 }),
    ]);
  });
});
