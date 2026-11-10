import Editor from '@monaco-editor/react';
import { mount } from 'cypress/react';
import React, { useState } from 'react';

import ScriptDiagnosticsStatus from '../../src/components/script/ScriptDiagnosticsStatus';
import '../../src/lib/monaco'; // Configures the self-hosted loader; component tests skip src/index.tsx.
import { useScriptEditor } from '../../src/lib/useScriptEditor';

import type { ScriptEditorInstance, ScriptMonaco } from '../../src/lib/monacoTypes';

/**
 * The checker's findings, applied to a real Monaco model.
 *
 * The unit tests for `useScriptMarkers` use a stand-in editor, which proves what it *calls* but not that
 * the calls do what Monaco needs: that the positions are the ones Monaco highlights, that our marker owner
 * does not clobber Monaco's own syntax squiggles, and that markers survive the re-render which follows the
 * reply. Only the real editor can say that, and `MonacoSelfHosted.cy.tsx` already proves it boots in about
 * two seconds, so there is no reason to settle for the stand-in here.
 *
 * `cy.intercept` stubs the analysis call instead of pointing at a live service: what is under test is this
 * repo's half of the contract, fed the same JSON the service returns with the hash echoed back the way
 * FIA-API echoes it.
 */

type Mounted = { editor: ScriptEditorInstance; monaco: ScriptMonaco };

const Harness: React.FC<{ enabled?: boolean; initial: string }> = ({ enabled = true, initial }) => {
  const [value, setValue] = useState(initial);
  const { diagnostics, onMount } = useScriptEditor(value, { enabled });

  return (
    <div style={{ height: 300 }}>
      <Editor
        value={value}
        language="python"
        height={200}
        onChange={(next) => setValue(next ?? '')}
        onMount={(editor: ScriptEditorInstance, monaco: ScriptMonaco) => {
          // Exposed for the assertions below: Cypress can only reach what the page itself can reach.
          (window as unknown as Record<string, unknown>).__scriptEditor = { editor, monaco };
          onMount(editor, monaco);
        }}
      />
      <ScriptDiagnosticsStatus diagnostics={diagnostics} />
    </div>
  );
};

const SCRIPT = 'LoadRawFNDSansPIUS("GROUP1")\n';

const mounted = (): Cypress.Chainable<Mounted> =>
  cy.window().then((win) => (win as unknown as Record<string, unknown>).__scriptEditor as Mounted);

/**
 * Everything Monaco is currently showing as a problem, from any owner, for this model.
 *
 * Reads the live window rather than queueing Cypress commands so it can be called repeatedly from inside a
 * retryable `cy.window().should()`: the reply arriving and the markers reaching the model are separated by
 * a React state update and an effect, and a snapshot taken at `cy.wait('@analyse')` time is too early.
 */
const markersNow = (win: Window): Marker[] => {
  const { editor, monaco } = (win as unknown as Record<string, unknown>).__scriptEditor as Mounted;
  const model = editor.getModel();
  if (model === null) {
    throw new Error('the editor mounted without a model');
  }
  return monaco.editor.getModelMarkers({ resource: model.uri }) as unknown as Marker[];
};

type Marker = {
  message: string;
  severity: number;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

const analyserReturning = (diagnostics: unknown[]): void => {
  // The service echoes the hash of the script it checked and FIA-API forwards that echo unchanged; it is how
  // the hook discards an answer about text the user has already replaced.
  cy.intercept('POST', '**/api/script/analyse', (req) => {
    req.reply({
      statusCode: 200,
      body: { content_hash: req.body.content_hash, parses: true, diagnostics, truncated: false },
    });
  }).as('analyse');
};

describe('Script diagnostics reach the editor', () => {
  it('puts the checker findings on the model, at the positions the checker gave', () => {
    analyserReturning([
      {
        message: "undefined name 'LoadRawFNDSansPIUS'",
        severity: 'warning',
        source: 'pyflakes',
        start_line: 1,
        start_column: 1,
        end_line: 1,
        end_column: 19,
      },
    ]);

    mount(<Harness initial={SCRIPT} />);
    cy.wait('@analyse');

    cy.window().should((win) => {
      const markers = markersNow(win as unknown as Window);
      expect(markers).to.have.length(1);
      const [marker] = markers;

      expect(marker.message).to.equal("undefined name 'LoadRawFNDSansPIUS'");
      expect([marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn]).to.deep.equal([
        1, 1, 1, 19,
      ]);

      // Compared against Monaco's own enum rather than a literal, so this stays true if Monaco ever
      // renumbers severities, and fails loudly if the bridge maps the wrong one. It is a top-level export,
      // not part of `monaco.editor`.
      const { monaco } = (win as unknown as Record<string, unknown>).__scriptEditor as Mounted;
      expect(marker.severity).to.equal(monaco.MarkerSeverity.Warning);
    });
  });

  it('advises without taking the editor away', () => {
    analyserReturning([]);

    mount(<Harness initial={SCRIPT} />);
    cy.wait('@analyse');
    cy.get('[role="status"]').should('have.text', 'No problems found');

    mounted().then(({ editor, monaco }) => {
      expect(editor.getOption(monaco.editor.EditorOption.readOnly)).to.equal(false);

      // The behaviour that matters most: a verdict never stops someone editing or saving the script.
      editor.executeEdits('test', [{ range: editor.getModel()!.getFullModelRange(), text: 'ChangeRunTitle()\n' }]);
      expect(editor.getValue()).to.equal('ChangeRunTitle()\n');
    });
  });

  it('says the checker is unavailable rather than that the script is clean', () => {
    // 503 is what FIA-API returns when it cannot reach the analysis service. Reporting "no problems" here
    // would be a lie, so the two have to look different.
    cy.intercept('POST', '**/api/script/analyse', {
      statusCode: 503,
      body: { detail: 'analysis service unavailable' },
    }).as('analyse');

    mount(<Harness initial={SCRIPT} />);
    cy.wait('@analyse');

    cy.get('[role="status"]').should('contain.text', 'Checker unavailable');
    cy.window().should((win) => {
      expect(markersNow(win as unknown as Window)).to.have.length(0);
    });
  });

  it('asks nothing while the script is still loading', () => {
    // The editors hold the check back until the real script text has arrived, or the first verdict would be
    // about an empty buffer.
    const never = cy.spy().as('neverCalled');
    cy.intercept('POST', '**/api/script/analyse', never).as('analyse');

    // A fake clock makes "nothing was ever scheduled" observable instead of merely quiet so far: the tick is
    // where the debounce would have fired had the check been enabled.
    cy.clock();
    mount(<Harness enabled={false} initial={SCRIPT} />);
    cy.tick(1500);

    cy.get('@neverCalled').should('not.have.been.called');
    cy.get('[role="status"]').should('not.exist');
  });
});
