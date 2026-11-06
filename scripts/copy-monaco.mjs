/**
 * Stage the AMD build of the `monaco-editor` package we already depend on into `public/monaco/vs`
 * so the script editors load Monaco from the plugin's own static assets.
 *
 * Without this, `@monaco-editor/react` falls back to its default loader config and fetches
 * `https://cdn.jsdelivr.net/npm/monaco-editor@<version pinned by @monaco-editor/loader>/min/vs` at
 * runtime — i.e. a third-party CDN decides which Monaco version users get, and the editor is broken
 * whenever that CDN is unreachable. `src/lib/monaco.ts` points the loader at the copy made here.
 *
 * It is registered as a Vite plugin in `vite.config.ts` (so it runs for `vite dev`, `vite build` and
 * the Cypress component dev server alike — CI drives Cypress directly rather than through a
 * `package.json` script) and is also runnable on its own via `yarn copy-monaco`. The copy is skipped
 * when it already matches the version asked for, so re-running it costs one file read.
 */
import { existsSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultSource = join(repoRoot, 'node_modules', 'monaco-editor', 'min', 'vs');
const defaultTarget = join(repoRoot, 'public', 'monaco', 'vs');

/** Read the installed monaco-editor version, or null when the package is not installed. */
function installedVersion() {
  const manifest = join(repoRoot, 'node_modules', 'monaco-editor', 'package.json');
  if (!existsSync(manifest)) {
    return null;
  }
  return JSON.parse(readFileSync(manifest, 'utf8')).version;
}

/**
 * Copy an AMD Monaco build into place unless a copy of that version is already there.
 *
 * @param {object} [options]
 * @param {string | null} [options.version] version to stage; defaults to the installed package version.
 * @param {string} [options.sourceDir] directory to copy from; defaults to the installed `min/vs`.
 * @param {string} [options.targetDir] directory to copy to; defaults to `public/monaco/vs`.
 * @param {boolean} [options.quiet] suppress the log line (used when called from Vite).
 * @returns {{ status: 'copied' | 'up-to-date', version: string }} what happened, for the caller to report.
 * @throws when monaco-editor is not installed or ships no AMD build.
 */
export function copyMonaco({
  version = installedVersion(),
  sourceDir = defaultSource,
  targetDir = defaultTarget,
  quiet = false,
} = {}) {
  const versionMarker = join(targetDir, '.monaco-version');

  if (!version) {
    throw new Error('copy-monaco: monaco-editor is not installed. Run `yarn install` first.');
  }

  if (existsSync(versionMarker) && readFileSync(versionMarker, 'utf8').trim() === version) {
    if (!quiet) {
      console.log(`copy-monaco: public/monaco/vs already up to date (monaco-editor ${version}).`);
    }
    return { status: 'up-to-date', version };
  }

  if (!existsSync(sourceDir)) {
    throw new Error(`copy-monaco: expected an AMD build at ${relative(repoRoot, sourceDir)} but found none.`);
  }

  // Remove the old copy first: monaco's chunk file names are content hashed, so stale chunks from a
  // previous version would otherwise linger in the build output and the container image.
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(dirname(targetDir), { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
  writeFileSync(versionMarker, `${version}\n`);

  if (!quiet) {
    console.log(`copy-monaco: copied monaco-editor ${version} AMD build to public/monaco/vs.`);
  }
  return { status: 'copied', version };
}

/**
 * Whether Vite should stage the assets while resolving its config.
 *
 * Vitest runs Vite plugin hooks in every worker, and unit tests mock the editor rather than fetch
 * Monaco, so staging there only buys a ~24 MB copy competing for CPU and I/O with the suite —
 * `ExperimentViewer.test.tsx` already needs ~26 s of its 30 s budget in CI. The Cypress component
 * spec is what guards the assets actually being served.
 *
 * @param {Record<string, string | undefined>} [env] environment to read; defaults to the real one.
 * @returns {boolean} false when running under Vitest.
 */
export function shouldStageMonacoAssets(env = process.env) {
  return !env.VITEST;
}

/** Vite plugin so every Vite-driven entry point (dev, build, Cypress component tests) gets the assets. */
export function monacoAssetsPlugin() {
  return {
    name: 'fia:monaco-assets',
    /**
     * Copied at config-resolution time, i.e. before the dev server listens or a build reads `public/`.
     * `buildStart` is too late: Cypress' component dev server starts serving as soon as it listens,
     * and the page requests the loader while the copy is still running, so the request falls through
     * to the SPA fallback and Monaco's AMD loader rejects on a script tag that returned HTML.
     */
    configResolved() {
      if (!shouldStageMonacoAssets()) {
        return;
      }

      try {
        copyMonaco({ quiet: true });
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }
    },
  };
}

// CLI entry point: only when executed directly, not when imported by vite.config.ts.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    copyMonaco();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
