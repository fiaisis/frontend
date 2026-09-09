import { Box } from '@mui/material';
import { mount } from 'cypress/react';
import React, { useState } from 'react';

import PlotViewer from '../../src/components/experimentViewer/Graph';
import Viewer2D from '../../src/components/experimentViewer/Viewer2D';

const RefreshableViewer = (): React.ReactElement => {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
        Refresh data
      </button>
      <Box sx={{ height: 500 }}>
        <Viewer2D filepath="/image.nxs" refreshKey={refreshKey} />
      </Box>
    </>
  );
};

describe('Viewer toolbars', () => {
  beforeEach(() => {
    cy.viewport(1200, 800);
    cy.clearLocalStorage();
  });

  it('keeps the 1D and MD controls visible without a selected file', () => {
    mount(
      <>
        <Box sx={{ height: 300 }}>
          <PlotViewer linePlotData={[]} showErrors={false} onShowErrorsChange={() => undefined} />
        </Box>
        <Box sx={{ height: 300 }}>
          <Viewer2D filepath={null} />
        </Box>
      </>
    );
    cy.get('[aria-label="1D plot controls"]').should('be.visible').find('button').first().should('be.disabled');
    cy.get('[aria-label="Plot controls"]').should('be.visible').and('have.attr', 'inert');
    cy.contains('Select a file to view 1D data').should('be.visible');
    cy.contains('Select a file to view 2D data').should('be.visible');
    cy.screenshot('viewer-toolbars-empty', { capture: 'viewport' });
  });

  it('keeps controls visible while loading and restores working controls after a refresh', () => {
    cy.viewport(1600, 900);
    cy.intercept('GET', '**/plottingapi/meta*', {
      delay: 1200,
      body: {
        name: 'image',
        kind: 'dataset',
        shape: [2, 2],
        type: { class: 1, size: 4, order: 0 },
        chunks: null,
        filters: null,
        attributes: [],
      },
    }).as('metadata');
    cy.intercept('GET', '**/plottingapi/data*', {
      delay: 1200,
      headers: { 'content-type': 'application/octet-stream' },
      fixture: 'heatmap.f32,null',
    }).as('data');
    mount(<RefreshableViewer />);
    cy.get('[aria-label="Plot controls"]').should('be.visible');
    cy.wait('@metadata');
    cy.get('[data-testid="LoadingDatasetValue"]').should('be.visible');
    cy.get('[aria-label="Plot controls"]').should('be.visible');
    cy.screenshot('viewer-toolbar-loading', { capture: 'viewport' });
    cy.wait('@data');
    cy.get('[aria-label="Plot controls"]').should('not.exist');
    cy.contains('button', 'Grid').should('be.enabled').click();
    cy.contains('button', 'Grid').should('have.attr', 'aria-pressed', 'false');
    cy.contains('button', 'Refresh data').click();
    cy.get('[aria-label="Plot controls"]').should('be.visible');
    cy.wait('@metadata');
    cy.wait('@data');
    cy.get('[aria-label="Plot controls"]').should('not.exist');
    cy.contains('button', 'Grid').should('be.enabled').and('have.attr', 'aria-pressed', 'false');
    cy.screenshot('viewer-toolbar-loaded', { capture: 'viewport' });
  });
});
