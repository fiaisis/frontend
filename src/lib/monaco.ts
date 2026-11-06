import { loader } from '@monaco-editor/react';

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
 * `import.meta.env.BASE_URL` mirrors the `base` option in `vite.config.ts`, so the path resolves to
 * `/monaco/vs` when developing standalone and `/f-i-a/monaco/vs` for the plugin bundle served by
 * SciGateway. Both are same-origin, so Monaco can create its web workers without any extra
 * `worker-src`/CORS handling.
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
export const MONACO_VS_PATH = `${import.meta.env.BASE_URL}monaco/vs`;

loader.config({ paths: { vs: MONACO_VS_PATH } });
