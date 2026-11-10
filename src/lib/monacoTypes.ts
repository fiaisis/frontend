import type { Monaco, OnMount } from '@monaco-editor/react';

/**
 * The Monaco types this bridge needs, taken from the editor library rather than from `monaco-editor`.
 *
 * A value import of `monaco-editor` bundles a second, disconnected copy into the plugin — the mistake
 * `src/lib/monaco.ts` exists to prevent — and even a type-only import of it fails to resolve under this
 * repo's `moduleResolution: node`, because the package points `main` at an AMD script with no adjacent
 * declarations. `@monaco-editor/react` already re-exports both halves of what an editor is handed, so the
 * types come from there and the plugin still ships exactly one Monaco.
 */
export type ScriptMonaco = Monaco;
export type ScriptEditorInstance = Parameters<OnMount>[0];
/** What `getModel()` returns, null included: an editor can legitimately be without one. */
export type ScriptModel = ReturnType<ScriptEditorInstance['getModel']>;
export type ScriptMarkerData = Parameters<ScriptMonaco['editor']['setModelMarkers']>[2][number];
