import { useCallback, useEffect, useRef } from 'react';

import { clearScriptMarkers, setScriptMarkers } from './scriptMarkers';

import type { ScriptEditorInstance, ScriptMonaco } from './monaco';
import type { ScriptDiagnostics } from './useScriptDiagnostics';
import type { OnMount } from '@monaco-editor/react';

/**
 * Applies the diagnostics the hook found to the editor as markers.
 *
 * Separate from `useScriptDiagnostics`, which knows about the service and nothing about Monaco, and from
 * `scriptMarkers`, which knows about Monaco and nothing about React; `useScriptEditor` hands the editors the
 * pair. Advisory — nothing here is consulted before saving or rerunning.
 */
export type ScriptMarkers = {
  /** Give to `<Editor onMount={...} />`. */
  onMount: OnMount;
};

export const useScriptMarkers = (diagnostics: ScriptDiagnostics): ScriptMarkers => {
  const monacoRef = useRef<ScriptMonaco | null>(null);
  const editorRef = useRef<ScriptEditorInstance | null>(null);
  const modelSubscriptionRef = useRef<{ dispose: () => void } | null>(null);
  // Read by the mount callback and the model subscription, both created once, so they see the current
  // value rather than the one present when they were made.
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

      // Markers belong to a model, not an editor, and the library can swap the model (a language change, or
      // one editor showing several scripts), so a swap needs a redraw.
      modelSubscriptionRef.current?.dispose();
      modelSubscriptionRef.current = editorInstance.onDidChangeModel(apply);
    },
    [apply]
  );

  // `onMount`'s return value is ignored by the editor library, so cleanup has to live here: without it a
  // disposed editor's subscription, and its markers, outlive it.
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
