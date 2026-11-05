#!/usr/bin/env node
/**
 * Copy the AMD build of the `monaco-editor` package we already depend on into `public/monaco/vs`
 * so the script editors load Monaco from the plugin's own static assets.
 *
 * Without this, `@monaco-editor/react` falls back to its default loader config and fetches
 * `https://cdn.jsdelivr.net/npm/monaco-editor@<version pinned by @monaco-editor/loader>/min/vs` at
 * runtime — i.e. a third-party CDN decides which Monaco version users get, and the editor is broken
 * whenever that CDN is unreachable. `src/lib/monaco.ts` points the loader at the copy made here.
 *
 * The copy is skipped when it already matches the installed package version, so running it on every
 * `yarn start`/`yarn build` costs nothing after the first run.
 */
import { existsSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(repoRoot, 'node_modules', 'monaco-editor', 'min', 'vs');
const target = join(repoRoot, 'public', 'monaco', 'vs');
const versionMarker = join(target, '.monaco-version');

/** Read the installed monaco-editor version, or null when the package is not installed. */
function installedVersion() {
  const manifest = join(repoRoot, 'node_modules', 'monaco-editor', 'package.json');
  if (!existsSync(manifest)) {
    return null;
  }
  return JSON.parse(readFileSync(manifest, 'utf8')).version;
}

function main() {
  const version = installedVersion();

  if (version === null) {
    console.error('copy-monaco: monaco-editor is not installed. Run `yarn install` first.');
    process.exitCode = 1;
    return;
  }

  if (existsSync(versionMarker) && readFileSync(versionMarker, 'utf8').trim() === version) {
    console.log(`copy-monaco: public/monaco/vs already up to date (monaco-editor ${version}).`);
    return;
  }

  if (!existsSync(source)) {
    console.error(`copy-monaco: expected an AMD build at ${relative(repoRoot, source)} but found none.`);
    process.exitCode = 1;
    return;
  }

  // Remove the old copy first: monaco's chunk file names are content hashed, so stale chunks from a
  // previous version would otherwise linger in the build output and the container image.
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
  writeFileSync(versionMarker, `${version}\n`);

  console.log(`copy-monaco: copied monaco-editor ${version} AMD build to public/monaco/vs.`);
}

main();
