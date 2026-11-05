import Editor from '@monaco-editor/react';
import { mount } from 'cypress/react';
import React from 'react';

// Configures the Monaco loader to use the copy this repo serves from public/monaco/vs. Component
// tests do not go through src/index.tsx (the plugin entry), so the module is imported here — which
// runs that configuration for its side effect — and it also provides the path that was configured.
import { MONACO_VS_PATH } from '../../src/lib/monaco';

/** Every Monaco URL the page has fetched, from the browser's own resource-timing buffer. */
const fetchedMonacoUrls = (win: Window): string[] =>
  win.performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((name) => /monaco/i.test(name));

describe('Monaco is served by the plugin instead of the jsDelivr CDN', () => {
  it('serves the self-hosted Monaco assets as scripts, not as an SPA fallback', () => {
    // Checked with cy.request so a missing or mis-served asset reports a status and content type here
    // rather than surfacing later as an opaque script-load rejection inside Monaco's AMD loader.
    // MONACO_VS_PATH is the exact path the app requests, and is base-relative because Cypress serves
    // the app under its own base (/__cypress/src/) rather than at the origin root.
    const assetUrls = [
      `${MONACO_VS_PATH}/loader.js`,
      `${MONACO_VS_PATH}/editor/editor.main.js`,
      `${MONACO_VS_PATH}/editor/editor.worker.js`,
    ];

    assetUrls.forEach((url) => {
      cy.request(url).then((response) => {
        expect(response.status, `${url} status`).to.equal(200);
        expect(response.headers['content-type'], `${url} content type`).to.contain('javascript');
      });
    });
  });

  const mountEditor = (): void => {
    mount(<Editor height="200px" defaultLanguage="python" value={'def reduce_run():\n    return 1\n'} />);
    // Wait for Monaco to have actually loaded and styled the editor: the loader fetch is async, and
    // view-lines only exist (and only become visible) once the AMD bundle has run.
    cy.get('.monaco-editor .view-lines').should('be.visible');
  };

  it('fetches Monaco from the plugin origin and never from a third party', () => {
    mountEditor();

    cy.window().then((win) => {
      const urls = fetchedMonacoUrls(win);
      // Compare parsed URLs rather than looking for the CDN's name in the string: that catches Monaco
      // being served from anything other than this app (jsDelivr today, another host after a
      // refactor), and does not rely on a substring match being exhaustive.
      const parsed = urls.map((url) => new URL(url, win.location.origin));
      const foreign = parsed.filter((url) => url.origin !== win.location.origin);
      const selfHosted = parsed.filter((url) => url.pathname.startsWith(`${MONACO_VS_PATH}/`));

      expect(
        foreign.map((url) => url.href),
        `expected no cross-origin Monaco requests, fetched: ${JSON.stringify(urls.slice(0, 8))}`
      ).to.have.length(0);
      expect(
        selfHosted.length,
        `expected requests under ${MONACO_VS_PATH}, fetched: ${JSON.stringify(urls.slice(0, 8))}`
      ).to.be.greaterThan(0);
    });
  });
});
