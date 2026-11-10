/**
 * Where the self-hosted Monaco AMD build is served from.
 *
 * Separate from `monaco.ts` because that module configures the editor loader as an import side effect, and
 * this decision — which of three origins the assets live on — is the part worth testing on its own.
 *
 * Three ways this bundle is served, and the right answer differs between them:
 *
 * - `yarn start`, standalone: the bundle, the document and `public/monaco/vs` all share one origin, and
 *   `BASE_URL` is `/`.
 * - the deployed plugin: built with `VITE_PLUGIN_URL=/f-i-a`, so `BASE_URL` is `/f-i-a/` and the assets
 *   were copied alongside `main.js` under that prefix.
 * - a locally built plugin loaded by a SciGateway host ("Mode 2" in `AGENTS.md`): `main.js` is served by
 *   this repo's static server while the *document* belongs to the host on another port, so a path resolved
 *   against the document asks the host for a file it does not have.
 *
 * That last case is why this is not simply `${BASE_URL}monaco/vs`. A Vite-style host answers an unknown
 * path with its SPA fallback rather than a 404 — `200 OK`, `text/html`, `index.html` — so the loader
 * script "loads", never defines `monaco`, and raises nothing for anyone to catch: the editor sits on its
 * loading placeholder forever while every API call on the page succeeds. Asking the running script where
 * it came from is what makes the assets follow the bundle instead of the page.
 */

/** `import.meta.env.BASE_URL`, which is `base` from `vite.config.ts`: `/`, `/f-i-a/`, or a full URL. */
export type BaseUrl = string;

/**
 * The path Monaco's loader should be requested from, without touching `document` or `import.meta` so the
 * three inputs can be tested directly.
 *
 * Order matters, and it is not the obvious one:
 *
 * 1. An absolute `BASE_URL` is a build-time statement that the assets live somewhere other than beside the
 *    bundle (a CDN, a different vhost), so it is honoured as given.
 * 2. Otherwise the bundle's own URL wins: assets were copied into the same `build/` directory as
 *    `main.js`, so wherever `main.js` was served from is where they are. This is what fixes hosting the
 *    plugin from one origin inside a page from another.
 * 3. Otherwise fall back to `BASE_URL`, which reproduces the same-origin behaviour. `document.currentScript`
 *    is null for an ES module import and for a host that `eval`s the bundle rather than inserting a script
 *    tag, so this branch is reached in practice and must stay correct for the standalone case.
 */
export const monacoVsPathFor = (baseUrl: BaseUrl, scriptSrc: string | null): string => {
  if (/^https?:\/\//i.test(baseUrl)) {
    return `${baseUrl.replace(/\/+$/, '')}/monaco/vs`;
  }
  if (scriptSrc !== null) {
    return new URL('monaco/vs', scriptSrc).href;
  }
  return `${baseUrl}monaco/vs`;
};

/**
 * The URL this bundle was fetched from, or null when it cannot tell.
 *
 * `document.currentScript` is the script currently being evaluated, which for a global bundle injected as
 * a `<script src>` by single-spa is `main.js` itself — this module runs during that same synchronous
 * evaluation, so reading it at module scope is sound. It is null for module scripts, hence the fallback.
 */
export const currentScriptSrc = (): string | null => {
  const script = document.currentScript;
  return script instanceof HTMLScriptElement && script.src !== '' ? script.src : null;
};
