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

const ToggleableLineViewer = (): React.ReactElement => {
  const [hasData, setHasData] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setHasData(!hasData)}>
        {hasData ? 'Clear data' : 'Load data'}
      </button>
      <Box sx={{ height: 500 }}>
        <PlotViewer
          linePlotData={hasData ? [{ filename: 'signal', data: [1, 3, 2, 4, 1] }] : []}
          showErrors={false}
          onShowErrorsChange={() => undefined}
        />
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
    cy.get('[aria-label="1D plot controls"]').should('have.attr', 'inert');
    for (const bound of ['min', 'max']) {
      cy.get(`[aria-label="1D plot controls"] [aria-label="Change ${bound} limit"]`)
        .should('have.attr', 'aria-disabled', 'true')
        .and('have.attr', 'tabindex', '-1');
    }
    cy.get('[aria-label="Plot controls"]').should('be.visible').and('have.attr', 'inert');
    cy.contains('Select a file to view 1D data').should('be.visible');
    cy.contains('Select a file to view 2D data').should('be.visible');
    cy.screenshot('viewer-toolbars-empty', { capture: 'viewport' });
  });

  it('enables the 1D domain slider only while a graph is displayed', () => {
    mount(<ToggleableLineViewer />);
    const toolbar = '[aria-label="1D plot controls"]';
    const minSlider = `${toolbar} [aria-label="Change min limit"]`;

    cy.get(minSlider).then(($slider) => {
      $slider[0].focus();
      expect($slider[0].ownerDocument.activeElement).not.to.equal($slider[0]);
    });
    cy.contains('button', 'Load data').click();
    cy.get('canvas').should('be.visible');
    cy.get(toolbar).should('not.have.attr', 'inert');
    cy.get(minSlider).should('not.have.attr', 'aria-disabled');
    cy.get(minSlider).focus();
    cy.get(minSlider).then(($slider) => {
      const previousValue = $slider.attr('aria-valuenow');
      cy.realPress('ArrowRight');
      cy.get(minSlider).should('not.have.attr', 'aria-valuenow', previousValue);
    });

    cy.contains('button', 'Clear data').click();
    cy.contains('Select a file to view 1D data').should('be.visible');
    cy.get(toolbar).should('have.attr', 'inert');
    cy.get(minSlider).should('have.attr', 'aria-disabled', 'true').and('have.attr', 'tabindex', '-1');
    cy.get(minSlider).then(($slider) => {
      const previousValue = $slider.attr('aria-valuenow');
      cy.get(minSlider).realClick();
      cy.get(minSlider).should('not.have.focus').and('have.attr', 'aria-valuenow', previousValue);
    });
    cy.get(`${toolbar} [role="dialog"]`).should('not.be.visible');
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
