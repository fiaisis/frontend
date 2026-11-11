/**
 * Self-hosted Monaco: the types an editor is handed, and where its AMD assets come from.
 *
 * Never from the jsDelivr CDN `@monaco-editor/react` defaults to: `scripts/copy-monaco.mjs` stages the
 * package's AMD build into `public/monaco/vs` and the build copies it beside `main.js`. The path then
 * follows `main.js` rather than the page, because inside SciGateway the plugin is served by its own static
 * server while the document belongs to the host — and a host asked for a file it lacks answers with its SPA
 * fallback (`200 OK`, `index.html`), so the loader never defines `monaco`, nothing throws, and the editor
 * sits on "Loading..." forever with a healthy-looking network tab.
 *
 * Types come from `@monaco-editor/react`, never `monaco-editor`: a value import bundles a second,
 * disconnected Monaco whose `setModelMarkers` cannot see the model on screen.
 */
import { loader } from '@monaco-editor/react';

import type { Monaco, OnMount } from '@monaco-editor/react';

export type ScriptMonaco = Monaco;
export type ScriptEditorInstance = Parameters<OnMount>[0];
/** What `getModel()` returns, null included: an editor can legitimately be without a model. */
export type ScriptModel = ReturnType<ScriptEditorInstance['getModel']>;
export type ScriptMarkerData = Parameters<ScriptMonaco['editor']['setModelMarkers']>[2][number];

/**
 * Where to ask for `monaco/vs`: an absolute `BASE_URL` is a build-time statement that the assets live
 * somewhere other than beside the bundle, so it wins; otherwise the bundle's own URL, which is where they
 * were copied; otherwise `BASE_URL`, correct when the bundle cannot say where it came from.
 */
export const monacoVsPathFor = (baseUrl: string, scriptSrc: string | null): string => {
  if (/^https?:\/\//i.test(baseUrl)) {
    return `${baseUrl.replace(/\/+$/, '')}/monaco/vs`;
  }
  if (scriptSrc !== null) {
    return new URL('monaco/vs', scriptSrc).href;
  }
  return `${baseUrl}monaco/vs`;
};

/** The URL this bundle was fetched from, or null. `document.currentScript` is `main.js` when a host injects
 * it as `<script src>`, and null for an ES module import — hence the fallback above. */
export const currentScriptSrc = (): string | null => {
  const script = document.currentScript;
  return script instanceof HTMLScriptElement && script.src !== '' ? script.src : null;
};

export const MONACO_VS_PATH = monacoVsPathFor(import.meta.env.BASE_URL, currentScriptSrc());

/** Configures the loader; fetches nothing until an `<Editor>` mounts. */
loader.config({ paths: { vs: MONACO_VS_PATH } });
