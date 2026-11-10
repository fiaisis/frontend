import { describe, expect, test, vi } from 'vitest';

import { clearScriptMarkers, MARKER_OWNER, setScriptMarkers, toMarkers } from './scriptMarkers';

import type { ScriptMonaco } from './monacoTypes';
import type { Diagnostic } from './scriptDiagnostics';

const diagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  message: "undefined name 'BinMQ'",
  severity: 'warning',
  source: 'pyflakes',
  start_line: 12,
  start_column: 5,
  end_line: 12,
  end_column: 10,
  ...overrides,
});

/**
 * The slice of Monaco the bridge touches.
 *
 * A real Monaco cannot be constructed in jsdom, and bundling one into a unit test is the mistake this repo
 * already pays for once with Monaco. Everything the bridge calls is here instead, which also means a change
 * to the bridge's assumptions fails loudly rather than quietly passing against a stub that grew to match it.
 */
const createFakeMonaco = (): {
  monaco: ScriptMonaco;
  setModelMarkers: ReturnType<typeof vi.fn>;
} => {
  const setModelMarkers = vi.fn();
  const monaco = {
    MarkerSeverity: { Error: 8, Warning: 4 },
    editor: { setModelMarkers },
  } as unknown as ScriptMonaco;
  return { monaco, setModelMarkers };
};

const model = { uri: 'file:///script.py' };

describe('toMarkers', () => {
  test('copies positions across unchanged', () => {
    // The contract is already 1-based lines, 1-based UTF-16 columns, exclusive end — Monaco's own units.
    // Any arithmetic here would shift the squiggle off the word the user needs to see.
    expect(toMarkers(createFakeMonaco().monaco, [diagnostic()])[0]).toMatchObject({
      startLineNumber: 12,
      startColumn: 5,
      endLineNumber: 12,
      endColumn: 10,
    });
  });

  test('keeps the message and names where it came from', () => {
    const [marker] = toMarkers(createFakeMonaco().monaco, [diagnostic()]);
    expect(marker).toMatchObject({
      message: "undefined name 'BinMQ'",
      source: 'pyflakes',
    });
  });

  test('maps the two severities to error and warning squiggles', () => {
    const { monaco } = createFakeMonaco();
    const [error, warning] = toMarkers(monaco, [
      diagnostic({ severity: 'error' }),
      diagnostic({ severity: 'warning' }),
    ]);
    expect(error.severity).toBe(8);
    expect(warning.severity).toBe(4);
  });
});

describe('setScriptMarkers', () => {
  test('files markers under the bridge owner so a later call replaces them', () => {
    const { monaco, setModelMarkers } = createFakeMonaco();
    setScriptMarkers(monaco, model as never, [diagnostic()]);
    expect(setModelMarkers).toHaveBeenCalledWith(model, MARKER_OWNER, [expect.anything()]);
  });

  test('an empty list is sent rather than skipped, because no squiggles is an answer', () => {
    const { monaco, setModelMarkers } = createFakeMonaco();
    setScriptMarkers(monaco, model as never, []);
    expect(setModelMarkers).toHaveBeenCalledWith(model, MARKER_OWNER, []);
  });

  test('does nothing while the editor has no model', () => {
    // Called from an effect that can run before Monaco has mounted, and again after it has unmounted.
    const { monaco, setModelMarkers } = createFakeMonaco();
    setScriptMarkers(monaco, null, [diagnostic()]);
    expect(setModelMarkers).not.toHaveBeenCalled();
  });
});

describe('clearScriptMarkers', () => {
  test('clears only its own owner', () => {
    const { monaco, setModelMarkers } = createFakeMonaco();
    clearScriptMarkers(monaco, model as never);
    expect(setModelMarkers).toHaveBeenCalledWith(model, MARKER_OWNER, []);
  });
});
