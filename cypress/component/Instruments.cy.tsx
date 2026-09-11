import { createTheme, ThemeProvider } from '@mui/material/styles';
import { mount } from 'cypress/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { instruments } from '../../src/lib/instrumentData';
import Instruments from '../../src/pages/Instruments';

describe('<Instruments />', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.clearLocalStorage();
    mount(
      <MemoryRouter initialEntries={['/isis-instruments']}>
        <Instruments />
      </MemoryRouter>
    );
  });

  it('renders instrument cards at an equal height', () => {
    cy.get('[data-testid="instrument-card"]').should(($cards) => {
      const heights = $cards.toArray().map((card) => Math.round(card.getBoundingClientRect().height));
      const uniqueHeights = new Set(heights);

      expect(uniqueHeights.size).to.equal(1);
    });
  });

  it('aligns the controls beside breadcrumbs and keeps the header fixed when cards scroll', () => {
    cy.get('[role="group"][aria-label="Page controls"]').should(($controls) => {
      const controls = $controls[0];
      const breadcrumb = controls.ownerDocument.querySelector('[aria-label="breadcrumb"]')!;
      const controlBounds = controls.getBoundingClientRect();
      const breadcrumbBounds = breadcrumb.getBoundingClientRect();
      expect(Math.abs(controlBounds.top - breadcrumbBounds.top)).to.be.lessThan(2);
      expect(controlBounds.left).to.be.greaterThan(breadcrumbBounds.right);
      expect(breadcrumb.contains(controls)).to.equal(false);
    });
    cy.screenshot('instruments-header-desktop', { capture: 'viewport' });
    cy.get('[aria-label="breadcrumb"]').then(($breadcrumb) => {
      const headerTop = $breadcrumb[0].getBoundingClientRect().top;
      cy.get('[aria-label="Instrument cards"]').scrollTo('bottom');
      cy.get('[aria-label="breadcrumb"]').should(($after) => {
        expect($after[0].getBoundingClientRect().top).to.equal(headerTop);
      });
    });
  });

  it('wraps the search below breadcrumbs on a narrow screen and filters cards directly', () => {
    cy.viewport(375, 812);
    cy.get('[role="group"][aria-label="Page controls"]').should(($controls) => {
      const controls = $controls[0];
      const breadcrumb = controls.ownerDocument.querySelector('[aria-label="breadcrumb"]')!;
      expect(controls.getBoundingClientRect().top).to.be.greaterThan(breadcrumb.getBoundingClientRect().bottom);
      expect(controls.getBoundingClientRect().right).to.be.at.most(375);
    });
    cy.screenshot('instruments-header-mobile', { capture: 'viewport' });
    cy.get('#instrument-search').focus();
    cy.get('#instrument-search').should('have.focus').type('LOQ');
    // ZOOM also matches because its description mentions LOQ.
    cy.get('[data-testid="instrument-card"]').should('have.length', 2);
    cy.contains('[data-testid="instrument-card"] h2', 'LOQ').should('be.visible');
    cy.get('#instrument-search-button, #instrument-search-menu').should('not.exist');
  });

  it('keeps the direct search usable in the dark theme with long search terms', () => {
    cy.viewport(375, 812);
    mount(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <MemoryRouter initialEntries={['/isis-instruments']}>
          <Instruments />
        </MemoryRouter>
      </ThemeProvider>
    );
    cy.get('#instrument-search').type('small-angle neutron scattering');
    cy.get('[aria-current="page"]').should('contain', 'ISIS instruments').and('be.visible');
    cy.contains('[data-testid="instrument-card"] h2', 'LOQ').should('exist');
    cy.get('#instrument-search').should('have.css', 'color', 'rgb(245, 247, 250)').and('be.visible');
    cy.screenshot('instruments-header-dark-search', { capture: 'viewport' });
  });

  it('searches instruments, techniques and scientists and retains card favourites', () => {
    for (const { query, instrument } of [
      { query: 'LOQ', instrument: 'LOQ' },
      { query: 'Neutron diffraction', instrument: 'ALF' },
      { query: 'Helen Walker', instrument: 'ALF' },
    ]) {
      cy.get('#instrument-search').clear();
      cy.get('#instrument-search').type(query);
      cy.contains('[data-testid="instrument-card"] h2', instrument).should('exist');
    }
    cy.get('#instrument-search').clear();
    cy.get('#instrument-search').type('no-matching-instrument');
    cy.contains('No instruments found').should('be.visible');
    cy.contains('button', 'Clear search').click();
    cy.get('[data-testid="instrument-card"]').should('have.length', instruments.length);
    cy.get('#instrument-search').type('LOQ');
    cy.get('[aria-label="Add LOQ to favourites"]').click();
    cy.get('[aria-label="Clear instrument search"]').click();
    cy.get('[data-testid="instrument-card"]').first().find('h2').should('have.text', 'LOQ');
    cy.get('[aria-label="Remove LOQ from favourites"]').should('exist');
  });
});
