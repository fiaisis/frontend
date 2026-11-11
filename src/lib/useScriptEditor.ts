import { useCallback, useEffect, useRef, useState } from 'react';

import { useScriptDiagnostics } from './useScriptDiagnostics';
import { useScriptMarkers } from './useScriptMarkers';

import type { ScriptEditorInstance, ScriptMonaco } from './monaco';
import type { ScriptDiagnosticsState } from './useScriptDiagnostics';
import type { OnMount } from '@monaco-editor/react';

/**
 * Everything a Monaco editor needs to check the Python in it, behind one mount callback.
 *
 * The two halves are separate on purpose — `useScriptDiagnostics` knows about the service and nothing about
 * Monaco, `useScriptMarkers` the other way round — but an editor can only be given one `onMount`, and focus
 * is something only Monaco itself can report, so the composition has to live somewhere. Here keeps both
 * editors down to one import and one prop.
 *
 * Advisory throughout. Nothing in here is consulted before saving or rerunning, and nothing in here can
 * prevent either: the checker cannot model facility code, so it is sometimes wrong about a name being
 * unknown, and a gate built on that would stop scripts that run fine.
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

      // Focus is what tells the hook to check sooner after the user stops typing, and Monaco reports it —
      // the editor library exposes no onFocus/onBlur props, and a window-level listener would fire for
      // every other widget on the page.
      subscriptionsRef.current.push(
        editor.onDidFocusEditorWidget(() => setBlurred(false)),
        editor.onDidBlurEditorWidget(() => setBlurred(true))
      );
    },
    [attachMarkers]
  );

  // `onMount`'s return value is ignored by the editor library, so the subscriptions it opens have to be
  // closed from an effect.
  useEffect(
    () => () => {
      subscriptionsRef.current.forEach((subscription) => subscription.dispose());
      subscriptionsRef.current = [];
    },
    []
  );

  return { diagnostics, onMount };
};
