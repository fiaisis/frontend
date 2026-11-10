import { afterEach, describe, expect, test, vi } from 'vitest';

import { currentScriptSrc, monacoVsPathFor } from './monacoPath';

describe('monacoVsPathFor', () => {
  test('uses the document origin when developing standalone', () => {
    // `yarn start`: bundle, page and public/monaco/vs share an origin, and there is no script URL to ask.
    expect(monacoVsPathFor('/', null)).toBe('/monaco/vs');
  });

  test('keeps the deployed prefix that VITE_PLUGIN_URL sets', () => {
    expect(monacoVsPathFor('/f-i-a/', null)).toBe('/f-i-a/monaco/vs');
  });

  test('follows the bundle when a host on another origin loads it', () => {
    // The bug this exists for: SciGateway on :3001 loads main.js from this repo's plugin server on :5001.
    // Resolving against the document asks :3001 for the loader and gets its SPA fallback — 200, index.html
    // — so Monaco never defines itself and the editor hangs without ever raising an error.
    expect(monacoVsPathFor('/', 'http://localhost:5001/main.js')).toBe('http://localhost:5001/monaco/vs');
  });

  test('resolves against the bundle in its deployed subdirectory too', () => {
    expect(monacoVsPathFor('/f-i-a/', 'https://dev.reduce.isis.cclrc.ac.uk/f-i-a/main.js')).toBe(
      'https://dev.reduce.isis.cclrc.ac.uk/f-i-a/monaco/vs'
    );
  });

  test('is unaffected by a cache-busting query on the bundle URL', () => {
    expect(monacoVsPathFor('/f-i-a/', 'https://dev.reduce.isis.cclrc.ac.uk/f-i-a/main.js?v=455c32e')).toBe(
      'https://dev.reduce.isis.cclrc.ac.uk/f-i-a/monaco/vs'
    );
  });

  test('follows the bundle however deep its path is', () => {
    expect(monacoVsPathFor('/', 'https://cdn.example/plugins/fia/1.2.3/main.js')).toBe(
      'https://cdn.example/plugins/fia/1.2.3/monaco/vs'
    );
  });

  test('honours a build-time absolute base over wherever the bundle came from', () => {
    // An absolute `base` is a deliberate statement that the assets live somewhere other than beside the
    // bundle, so the bundle's own URL must not overrule it.
    expect(monacoVsPathFor('https://assets.example/fia/', 'http://localhost:5001/main.js')).toBe(
      'https://assets.example/fia/monaco/vs'
    );
  });

  test('does not double the slash when an absolute base has none', () => {
    expect(monacoVsPathFor('https://assets.example/fia', null)).toBe('https://assets.example/fia/monaco/vs');
  });
});

describe('currentScriptSrc', () => {
  const setCurrentScript = (value: Element | null): void => {
    Object.defineProperty(document, 'currentScript', { value, configurable: true });
  };

  afterEach(() => {
    // `currentScript` is read-only in the real DOM, so the tests define it; leave nothing behind for
    // anything else that imports this module in the same worker.
    delete (document as { currentScript?: unknown }).currentScript;
    vi.restoreAllMocks();
  });

  test('is null when the bundle cannot identify itself', () => {
    // An ES module import, or a host that eval()s the bundle: both take the BASE_URL fallback.
    setCurrentScript(null);
    expect(currentScriptSrc()).toBeNull();
  });

  test('is the URL the bundle was fetched from', () => {
    const script = document.createElement('script');
    script.src = 'http://localhost:5001/main.js';
    setCurrentScript(script);
    expect(currentScriptSrc()).toBe('http://localhost:5001/main.js');
  });

  test('ignores a currentScript that is not a script element', () => {
    setCurrentScript(document.createElement('div'));
    expect(currentScriptSrc()).toBeNull();
  });

  test('ignores a script element with no src', () => {
    // An inline script would otherwise resolve the assets against the document's own URL.
    const inline = document.createElement('script');
    inline.textContent = 'window.fia = {}';
    setCurrentScript(inline);
    expect(currentScriptSrc()).toBeNull();
  });
});
