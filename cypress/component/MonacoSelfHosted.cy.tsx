import Editor from '@monaco-editor/react';
import { mount } from 'cypress/react';
import React from 'react';

// Configures the Monaco loader to use the copy this repo serves from public/monaco/vs. Component
// tests do not go through src/index.tsx (the plugin entry), so the side-effect import lives here.
import '../../src/lib/monaco';

/** Every Monaco URL the page has fetched, from the browser's own resource-timing buffer. */
const fetchedMonacoUrls = (win: Window): string[] =>
  win.performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((name) => /monaco/i.test(name));

describe('Monaco is served by the plugin instead of the jsDelivr CDN', () => {
  const mountEditor = (): void => {
    mount(<Editor height="200px" defaultLanguage="python" value={'def reduce_run():\n    return 1\n'} />);
    // Wait for Monaco to have actually loaded and styled the editor: the loader fetch is async, and
    // view-lines only exist (and only become visible) once the AMD bundle has run.
    cy.get('.monaco-editor .view-lines').should('be.visible');
  };

  it('fetches Monaco from the plugin origin and never from the CDN', () => {
    mountEditor();

    cy.window().then((win) => {
      const urls = fetchedMonacoUrls(win);
      const cdn = urls.filter((url) => url.includes('cdn.jsdelivr.net'));
      const local = urls.filter((url) => url.includes('/monaco/vs/'));

      expect(cdn, `expected no jsDelivr requests, fetched: ${JSON.stringify(urls.slice(0, 8))}`).to.have.length(0);
      expect(
        local.length,
        `expected local monaco/vs requests, fetched: ${JSON.stringify(urls.slice(0, 8))}`
      ).to.be.greaterThan(0);
    });
  });
});
