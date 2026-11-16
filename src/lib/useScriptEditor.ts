import { useCallback, useEffect, useRef, useState } from 'react';

import { useScriptDiagnostics } from './useScriptDiagnostics';
import { useScriptMarkers } from './useScriptMarkers';

import type { ScriptEditorInstance, ScriptMonaco } from './monaco';
import type { ScriptDiagnosticsState } from './useScriptDiagnostics';
import type { OnMount } from '@monaco-editor/react';

/**
 * Everything an editor needs to check its Python, behind one `onMount`.
 *
 * The two halves stay separate — the service and Monaco know nothing about each other — but an editor takes
 * one mount callback, and only Monaco can report focus. Advisory: nothing here can block a save or a rerun.
 */
export type ScriptEditorControls = {
  diagnostics: ScriptDiagnosticsState;
  /** Give to `<Editor onMount={...} />`. */
  onMount: OnMount;
};

export const useScriptEditor = (
  value: string,
  options?: {
    /** Pass false while the script is still loading, so the first check asks about the real text. */
    enabled?: boolean;
  }
): ScriptEditorControls => {
  const [blurred, setBlurred] = useState<boolean>(false);
  const diagnostics = useScriptDiagnostics(value, { enabled: options?.enabled ?? true, blurred });
  const { onMount: attachMarkers } = useScriptMarkers(diagnostics);
  const subscriptionsRef = useRef<{ dispose: () => void }[]>([]);

  const onMount = useCallback(
    (editor: ScriptEditorInstance, monaco: ScriptMonaco) => {
      attachMarkers(editor, monaco);

      // The editor library exposes no onFocus/onBlur props, and a window-level listener would fire for every
      // other widget on the page.
      subscriptionsRef.current.push(
        editor.onDidFocusEditorWidget(() => setBlurred(false)),
        editor.onDidBlurEditorWidget(() => setBlurred(true))
      );
    },
    [attachMarkers]
  );

  // `onMount`'s return value is ignored by the editor library, so the subscriptions it opens close here.
  useEffect(
    () => () => {
      subscriptionsRef.current.forEach((subscription) => subscription.dispose());
      subscriptionsRef.current = [];
    },
    []
  );

  return { diagnostics, onMount };
};
