import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

test('production plugin registers routes and mounts with host-provided React', { timeout: 30000 }, async (t) => {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="fia"></div></body></html>', {
    url: 'http://localhost:3000/fia',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.matchMedia = (media) => ({
    media,
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  window.scrollTo = () => {};
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.WebSocket = class {
    addEventListener() {}
    removeEventListener() {}
    close() {}
  };

  // SciGateway loads the React 18 UMD files before loading the plugin script.
  for (const packageName of ['react', 'react-dom']) {
    const packageDirectory = path.dirname(require.resolve(`${packageName}/package.json`));
    const source = await readFile(path.join(packageDirectory, 'umd', `${packageName}.production.min.js`), 'utf8');
    window.eval(source);
  }

  const registeredRoutes = [];
  window.document.addEventListener('scigateway', (event) => {
    if (event.detail?.type === 'scigateway:api:register_route') registeredRoutes.push(event.detail.payload);
  });
  const script = window.document.createElement('script');
  script.src = 'http://localhost:5001/main.js';
  Object.defineProperty(window.document, 'currentScript', { configurable: true, value: script });

  // Execute the emitted browser bundle without a Node/CommonJS require global.
  window.eval(await readFile(path.join(projectRoot, 'build/main.js'), 'utf8'));
  Object.defineProperty(window.document, 'currentScript', { value: null });
  assert.deepEqual(Object.keys(window.fia).sort(), ['bootstrap', 'mount', 'unmount']);
  assert.ok(registeredRoutes.some(({ plugin, link }) => plugin === 'fia' && link === '/fia'));
  assert.ok(registeredRoutes.some(({ link }) => link === '/fia/reduction-history'));
  for (const route of registeredRoutes) {
    assert.doesNotThrow(() => new URL(route.logoLightMode));
    assert.doesNotThrow(() => new URL(route.logoDarkMode));
  }

  // Host theme options need to be completed by the plugin's own MUI version.
  // Older hosts do not provide MUI 9's theme helpers and motion defaults.
  window.document.dispatchEvent(
    new window.CustomEvent('scigateway', {
      detail: {
        type: 'scigateway:api:send_themeoptions',
        payload: { theme: { palette: { mode: 'dark', primary: { main: '#ff3366' } } } },
      },
    })
  );

  const props = { name: 'fia' };
  await window.fia.bootstrap(props);
  await window.fia.mount(props);
  assert.match(window.document.getElementById('fia').textContent, /Data reduction/);
  assert.ok(window.document.querySelector('#fia a[href="/fia/isis-instruments"]'));
  const paper = window.document.querySelector('#fia .MuiPaper-root');
  assert.equal(window.getComputedStyle(paper).backgroundColor, 'rgb(18, 18, 18)');
  await window.fia.unmount(props);
  assert.equal(window.document.getElementById('fia').childElementCount, 0);
});
