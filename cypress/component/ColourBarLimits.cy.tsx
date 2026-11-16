import { formatBound, formatBoundInput } from '@h5web/shared/vis-utils';
import { Box } from '@mui/material';
import { mount } from 'cypress/react';
import React from 'react';

import { BOUND_CLASSES } from '../../src/components/experimentViewer/colourBarBounds';
import Viewer2D from '../../src/components/experimentViewer/Viewer2D';

import type { ColourBarBound } from '../../src/components/experimentViewer/colourBarBounds';

const LIMIT_FIELDS: Record<ColourBarBound, string> = {
  min: 'Lower colour-scale limit',
  max: 'Upper colour-scale limit',
};

// The fixture is a 2x2 image of 1, 2, 3, 4, so H5Web labels the colour bar 1e+0 and 4e+0.
const DATA_MIN = 1;
const DATA_MAX = 4;

const limit = (bound: ColourBarBound): string => `[class~="${BOUND_CLASSES[bound]}"]`;
const limitField = (bound: ColourBarBound): string => `[aria-label="${LIMIT_FIELDS[bound]}"]`;

const mountHeatmapViewer = (): void => {
  cy.intercept('GET', '**/plottingapi/meta*', {
    body: {
      name: 'image',
      kind: 'dataset',
      shape: [2, 2],
      type: { class: 1, size: 4, order: 0 },
      chunks: null,
      filters: null,
      attributes: [],
    },
  });
  cy.intercept('GET', '**/plottingapi/data*', {
    headers: { 'content-type': 'application/octet-stream' },
    fixture: 'heatmap.f32,null',
  });

  // Both the experiment viewer and the live data viewer show 2D data through this component.
  mount(
    <Box sx={{ height: 500 }}>
      <Viewer2D filepath="/image.nxs" />
    </Box>
  );

  cy.get('canvas').should('be.visible');
  cy.get(limit('max')).should('have.text', formatBound(DATA_MAX));
  cy.get(limit('min')).should('have.text', formatBound(DATA_MIN));
};

const openLimit = (bound: ColourBarBound): void => {
  cy.get(limit(bound)).dblclick();
};

const typeLimit = (bound: ColourBarBound, value: string): void => {
  openLimit(bound);
  cy.get(limitField(bound)).clear();
  cy.get(limitField(bound)).type(`${value}{enter}`);
};

const expectCustomDomain = (customDomain: [number | null, number | null]): void => {
  cy.window().should((win) => {
    const persisted = JSON.parse(win.localStorage.getItem('h5web:heatmap') ?? '{}');
    expect(persisted.state?.customDomain, 'H5Web heatmap config').to.deep.equal(customDomain);
  });
};

/** Until a limit is typed, H5Web has never written a custom domain, so nothing is stored for it. */
const expectAutomaticLimits = (): void => {
  cy.window().should((win) => {
    const persisted = JSON.parse(win.localStorage.getItem('h5web:heatmap') ?? '{}');
    expect(persisted.state?.customDomain ?? [null, null], 'H5Web heatmap config').to.deep.equal([null, null]);
  });
};

/** The toolbar's domain widget reads the same heatmap config, so it must agree with the colour bar. */
const expectDomainWidgetToShow = (min: number | null, max: number | null): void => {
  cy.get('button[aria-label="Edit domain"]').click();
  cy.get('[role="dialog"][aria-label="Edit domain"]').within(() => {
    cy.get('#min-bound').should('have.value', formatBoundInput(min ?? DATA_MIN));
    cy.get('#max-bound').should('have.value', formatBoundInput(max ?? DATA_MAX));
    cy.contains('button', 'Min').should('have.attr', 'aria-pressed', String(min === null));
    cy.contains('button', 'Max').should('have.attr', 'aria-pressed', String(max === null));
  });
};

describe('Colour-scale limits in the 2D viewer', () => {
  beforeEach(() => {
    cy.viewport(1200, 800);
    cy.clearLocalStorage();
  });

  it('edits the upper limit above the colour bar and the lower limit below it', () => {
    mountHeatmapViewer();

    typeLimit('max', '3');
    cy.get(limit('max')).should('have.text', formatBound(3));
    cy.get(limitField('max')).should('not.exist');

    openLimit('min');
    cy.screenshot('colour-bar-limit-editor', { capture: 'viewport' });
    cy.get(limitField('min')).clear();
    cy.get(limitField('min')).type('2{enter}');
    cy.get(limit('min')).should('have.text', formatBound(2));

    // The limit belongs to H5Web's heatmap config, so the toolbar's domain widget shows it too.
    expectCustomDomain([2, 3]);
    expectDomainWidgetToShow(2, 3);
  });

  it('hands a limit back to the data when auto is typed', () => {
    mountHeatmapViewer();

    typeLimit('max', '3');
    cy.get(limit('max')).should('have.text', formatBound(3));
    expectCustomDomain([null, 3]);

    typeLimit('max', 'auto');
    cy.get(limit('max')).should('have.text', formatBound(DATA_MAX));
    expectCustomDomain([null, null]);
  });

  it('shows the current limit and leaves it alone when the editor is cancelled', () => {
    mountHeatmapViewer();

    openLimit('min');
    cy.get(limitField('min')).should('have.value', formatBound(DATA_MIN));
    cy.get(limitField('min')).clear();
    cy.get(limitField('min')).type('2{esc}');

    cy.get(limitField('min')).should('not.exist');
    cy.get(limit('min')).should('have.text', formatBound(DATA_MIN));
    expectAutomaticLimits();
  });

  it('pops up an error and changes nothing when a limit is not a number', () => {
    mountHeatmapViewer();

    typeLimit('min', 'bright pink');

    cy.get('[role="alert"]').should('contain.text', 'Enter a number for the lower limit');
    cy.get(limitField('min')).should('not.exist');
    cy.get(limit('min')).should('have.text', formatBound(DATA_MIN));
    expectAutomaticLimits();
  });

  it('pops up an error and changes nothing when the limits would cross over', () => {
    mountHeatmapViewer();

    typeLimit('min', '9');

    cy.get('[role="alert"]').should('contain.text', 'The lower limit must be less than the upper limit');
    cy.get(limit('min')).should('have.text', formatBound(DATA_MIN));
    cy.get(limit('max')).should('have.text', formatBound(DATA_MAX));
    expectAutomaticLimits();
  });

  it('hints that a limit is editable when it is hovered', () => {
    mountHeatmapViewer();

    cy.get(limit('max')).should('not.have.attr', 'title');
    cy.get(limit('max')).trigger('pointerover', { bubbles: true });
    cy.get(limit('max')).should('have.attr', 'title', 'Double-click to edit the colour-scale limit');
  });
});
