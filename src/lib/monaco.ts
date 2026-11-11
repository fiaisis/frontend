/**
 * Self-hosted Monaco: the types an editor is handed, and where its AMD assets are fetched from.
 *
 * Two decisions live here because both are easy to undo by accident, and both cost days to diagnose:
 *
 * 1. Monaco is served by this plugin, never from the jsDelivr CDN `@monaco-editor/react` defaults to, so a
 *    third party cannot decide which version users get. `scripts/copy-monaco.mjs` stages it into
 *    `public/monaco/vs`, and the build copies it into `build/monaco/vs` beside `main.js`.
 * 2. The asset path follows `main.js`, not the page. Inside SciGateway the plugin is served by its own
 *    static server (port 5001 in development) while the document belongs to the host, and a host asked for
 *    a file it does not have answers with its SPA fallback — `200 OK`, `text/html`, `index.html`. That
 *    looks like a successful load, never defines `monaco`, and raises nothing, so the editor sits on
 *    "Loading..." forever while every API call on the page returns 200. `BASE_URL` is relative to the
 *    document, so it is the fallback here, not the answer.
 *
 * Types come from `@monaco-editor/react`, never from `monaco-editor`: a value import of that package bundles
 * a second, disconnected Monaco into `main.js`, whose `setModelMarkers` cannot see the models the editor is
 * showing. Import this module for types with `import type`, which erases and keeps the loader's side effect
 * with the entry point.
 */
import { loader } from '@monaco-editor/react';

import type { Monaco, OnMount } from '@monaco-editor/react';

export type ScriptMonaco = Monaco;
export type ScriptEditorInstance = Parameters<OnMount>[0];
/** What `getModel()` returns, null included: an editor can legitimately be without a model. */
export type ScriptModel = ReturnType<ScriptEditorInstance['getModel']>;
export type ScriptMarkerData = Parameters<ScriptMonaco['editor']['setModelMarkers']>[2][number];

/**
 * Where to ask for `monaco/vs`.
 *
 * An absolute `BASE_URL` is a build-time statement that the assets live somewhere other than beside the
 * bundle, so it wins. Otherwise the bundle's own URL, because that is where the assets were copied to.
 * Otherwise `BASE_URL`, which is correct when the bundle cannot identify itself.
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

/**
 * The URL this bundle was fetched from, or null when it cannot say. `document.currentScript` is the script
 * being evaluated, which for a global bundle injected as `<script src>` by the host is `main.js` itself;
 * it is null for an ES module import, hence the fallback above.
 */
export const currentScriptSrc = (): string | null => {
  const script = document.currentScript;
  return script instanceof HTMLScriptElement && script.src !== '' ? script.src : null;
};

export const MONACO_VS_PATH = monacoVsPathFor(import.meta.env.BASE_URL, currentScriptSrc());

/** Configures the loader; fetches nothing until an `<Editor>` mounts. */
loader.config({ paths: { vs: MONACO_VS_PATH } });
