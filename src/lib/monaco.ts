import { loader } from '@monaco-editor/react';

import { currentScriptSrc, monacoVsPathFor } from './monacoPath';

/**
 * Path that `@monaco-editor/react`'s AMD loader script is served from.
 *
 * By default the loader injects `<script src="https://cdn.jsdelivr.net/npm/monaco-editor@X/min/vs/
 * loader.js">`, which means the editor's version and availability are controlled by a third-party CDN
 * (`X` is pinned by `@monaco-editor/loader`, not by our `monaco-editor` dependency). We ship the AMD
 * build of the `monaco-editor` package ourselves instead — `scripts/copy-monaco.mjs` copies it to
 * `public/monaco/vs`, which Vite serves in development and copies into `build/monaco/vs` on build —
 * and this module points the loader at that copy.
 *
 * The path is resolved by `monacoVsPathFor` rather than read straight off `import.meta.env.BASE_URL`,
 * because `BASE_URL` is relative to the *document* and the bundle is not always served from the document's
 * origin: a locally built plugin loaded by a SciGateway host comes from this repo's static server, and
 * asking the host for `/monaco/vs/loader.js` gets its SPA fallback (`200`, `text/html`) instead of the
 * loader, which hangs the editor with no error anywhere. See `monacoPath.ts` for the full reasoning.
 *
 * Where the assets are cross-origin to the page — that local Mode 2 case only — Monaco's language workers
 * may be refused, since a worker script has to be same-origin with the document; Monaco substitutes an
 * error worker, so the editor still functions with degraded background work. In the deployed plugin the
 * bundle, its assets and the page share an origin, so neither the loader nor the workers are affected.
 *
 * Importing this module has a side effect (it configures the loader) but performs no network request:
 * Monaco is only fetched when an `<Editor>` actually mounts.
 *
 * Note for future edits: keep using the Monaco instance handed to `onMount(editor, monaco)` (or the
 * `window.monaco` global). Do not `import * as monaco from 'monaco-editor'` in application code — a
 * value import bundles a second copy of Monaco into `build/main.js` and gives you a different instance
 * whose `setModelMarkers` does not see the models the editor is showing. Type-only imports
 * (`import type * as monaco from 'monaco-editor'`) are fine because they are erased at build time.
 */
export const MONACO_VS_PATH = monacoVsPathFor(import.meta.env.BASE_URL, currentScriptSrc());

loader.config({ paths: { vs: MONACO_VS_PATH } });
