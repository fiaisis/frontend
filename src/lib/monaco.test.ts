import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { copyMonaco, shouldStageMonacoAssets } from '../../scripts/copy-monaco.mjs';

const { configMock } = vi.hoisted(() => ({ configMock: vi.fn() }));

vi.mock('@monaco-editor/react', () => ({ loader: { config: configMock } }));

describe('Monaco loader configuration', () => {
  beforeEach(() => {
    configMock.mockClear();
    // The module under test configures the loader as an import side effect, so it has to be
    // re-imported for each test to observe the call again.
    vi.resetModules();
  });

  test('points the AMD loader at the monaco/vs copy served by the plugin itself', async () => {
    const { MONACO_VS_PATH } = await import('./monaco');

    expect(configMock).toHaveBeenCalledTimes(1);
    expect(configMock).toHaveBeenCalledWith({ paths: { vs: MONACO_VS_PATH } });
  });

  test('does not leave the loader on its jsDelivr CDN default', async () => {
    const { MONACO_VS_PATH } = await import('./monaco');

    expect(MONACO_VS_PATH).not.toContain('cdn.jsdelivr.net');
    expect(MONACO_VS_PATH).not.toContain('http');
    // `base` is '/' when VITE_PLUGIN_URL is unset (development and tests), and '/f-i-a/' when the
    // plugin is built for SciGateway — both are served by this repo's own assets.
    expect(MONACO_VS_PATH).toBe(`${import.meta.env.BASE_URL}monaco/vs`);
    expect(MONACO_VS_PATH).toBe('/monaco/vs');
  });
});

describe('staging the Monaco assets', () => {
  let workspace: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(() => {
    // A throwaway workspace stands in for node_modules/ and public/, so the tests never touch the
    // real copy (which is what a fresh CI checkout does not have).
    workspace = mkdtempSync(join(tmpdir(), 'fia-monaco-assets-'));
    sourceDir = join(workspace, 'vs');
    targetDir = join(workspace, 'public', 'monaco', 'vs');
    mkdirSync(join(sourceDir, 'editor'), { recursive: true });
    writeFileSync(join(sourceDir, 'loader.js'), 'define("vs/loader", []);');
    writeFileSync(join(sourceDir, 'editor', 'editor.main.js'), 'define("vs/editor/editor.main", []);');
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  // Derived rather than spelled out, so it tracks whatever the JSDoc on copyMonaco declares.
  type StageResult = ReturnType<typeof copyMonaco>;
  const stage = (version: string): StageResult => copyMonaco({ version, sourceDir, targetDir, quiet: true });

  test('copies the AMD build with its layout and records the version', () => {
    expect(stage('1.2.3')).toEqual({ status: 'copied', version: '1.2.3' });

    expect(readFileSync(join(targetDir, 'loader.js'), 'utf8')).toContain('vs/loader');
    expect(readFileSync(join(targetDir, 'editor', 'editor.main.js'), 'utf8')).toContain('vs/editor/editor.main');
    expect(readFileSync(join(targetDir, '.monaco-version'), 'utf8').trim()).toBe('1.2.3');
  });

  test('leaves an up-to-date copy alone, which is what makes re-running it cheap', () => {
    stage('1.2.3');
    // A file the copy does not produce: if staging re-copied, it would be gone (the target is
    // deleted first), so this distinguishes a genuine no-op from a redundant copy.
    writeFileSync(join(targetDir, 'sentinel.txt'), 'keep me');

    expect(stage('1.2.3').status).toBe('up-to-date');
    expect(readFileSync(join(targetDir, 'sentinel.txt'), 'utf8')).toBe('keep me');
  });

  test('replaces the previous copy when the version changes', () => {
    stage('1.2.3');
    writeFileSync(join(targetDir, 'chunk-of-an-old-build.js'), 'stale');

    stage('2.0.0');

    // Monaco's chunk file names are content hashed, so leftovers from the old version would be
    // dead weight in build/ and in the container image.
    expect(existsSync(join(targetDir, 'chunk-of-an-old-build.js'))).toBe(false);
    expect(readFileSync(join(targetDir, '.monaco-version'), 'utf8').trim()).toBe('2.0.0');
  });

  test('fails loudly rather than leaving the loader pointed at nothing', () => {
    expect(() => copyMonaco({ version: null, sourceDir, targetDir })).toThrow(/not installed/);
    expect(() => copyMonaco({ version: '1.2.3', sourceDir: join(workspace, 'not-installed'), targetDir })).toThrow(
      /AMD build/
    );
    expect(existsSync(join(targetDir, 'loader.js'))).toBe(false);
  });

  test('does not stage during unit test runs, which never fetch Monaco', () => {
    // Vitest runs this plugin hook in every worker; copying ~24 MB per worker steals CPU and I/O
    // from the suite it is supposed to be testing.
    expect(shouldStageMonacoAssets({})).toBe(true);
    expect(shouldStageMonacoAssets({ VITEST: 'true' })).toBe(false);
  });
});
