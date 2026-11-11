import { useCallback, useEffect, useRef } from 'react';

import { clearScriptMarkers, setScriptMarkers } from './scriptMarkers';

import type { ScriptEditorInstance, ScriptMonaco } from './monaco';
import type { ScriptDiagnostics } from './useScriptDiagnostics';
import type { OnMount } from '@monaco-editor/react';

/**
 * Puts the diagnostics the hook found onto the editor as markers.
 *
 * Kept separate from `useScriptDiagnostics`, which knows about the service and nothing about Monaco, and
 * from `scriptMarkers`, which knows about Monaco and nothing about React. The editors get the pair of them
 * from here, and neither editor has to know either half exists.
 *
 * Advisory throughout: nothing here is consulted before saving or rerunning. A squiggle is advice about
 * what the runner is likely to say, not a gate on the user's ability to try anyway — which matters because
 * the analysis cannot model facility code, so it is occasionally wrong about a name being unknown.
 */
export type ScriptMarkers = {
  /** Give to `<Editor onMount={...} />`. */
  onMount: OnMount;
};

export const useScriptMarkers = (diagnostics: ScriptDiagnostics): ScriptMarkers => {
  const monacoRef = useRef<ScriptMonaco | null>(null);
  const editorRef = useRef<ScriptEditorInstance | null>(null);
  const modelSubscriptionRef = useRef<{ dispose: () => void } | null>(null);
  // The latest diagnostics, so the mount callback and the model subscription — both created once — read
  // the current value instead of the one that happened to be there when they were made.
  const diagnosticsRef = useRef(diagnostics.diagnostics);
  diagnosticsRef.current = diagnostics.diagnostics;

  const apply = useCallback(() => {
    const monaco = monacoRef.current;
    const editorInstance = editorRef.current;
    if (monaco === null || editorInstance === null) {
      return;
    }
    setScriptMarkers(monaco, editorInstance.getModel(), diagnosticsRef.current);
  }, []);

  useEffect(() => {
    apply();
  }, [diagnostics.diagnostics, apply]);

  const onMount = useCallback(
    (editorInstance: ScriptEditorInstance, monaco: ScriptMonaco) => {
      monacoRef.current = monaco;
      editorRef.current = editorInstance;
      apply();

      // The library can hand the editor a different model — a language change, or a `path` change when one
      // editor shows several scripts — and markers belong to a model, not to an editor, so a swap would
      // otherwise leave the new one blank until the user next typed.
      modelSubscriptionRef.current?.dispose();
      modelSubscriptionRef.current = editorInstance.onDidChangeModel(apply);
    },
    [apply]
  );

  // `onMount`'s return value is ignored by the editor library, so it cannot hand back its own cleanup;
  // the unmount effect is what stops a disposed editor's subscription outliving it and what takes the
  // markers with it. Without that, a script opened again later shows squiggles from a run that finished
  // in the previous visit.
  useEffect(
    () => () => {
      modelSubscriptionRef.current?.dispose();
      modelSubscriptionRef.current = null;
      const monaco = monacoRef.current;
      const editorInstance = editorRef.current;
      if (monaco !== null && editorInstance !== null) {
        clearScriptMarkers(monaco, editorInstance.getModel());
      }
      monacoRef.current = null;
      editorRef.current = null;
    },
    []
  );

  return { onMount };
};
