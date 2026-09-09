import { Box } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { mount } from 'cypress/react';
import React from 'react';

import InstrumentSelector from '../../src/components/jobs/InstrumentSelector';
import { REDUCTION_SUPPORTED_INSTRUMENTS } from '../../src/lib/instrumentSupport';

const mountSelector = (mode: 'light' | 'dark', selectedInstrument = 'ALL'): void => {
  mount(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
        <InstrumentSelector
          selectedInstrument={selectedInstrument}
          handleInstrumentChange={cy.stub().as('selectInstrument')}
          variant="compact"
          compactLabel="Browse instruments"
          allInstrumentsLabel="Clear filters"
          support={{ page: 'reduction-history', instruments: REDUCTION_SUPPORTED_INSTRUMENTS }}
        />
      </Box>
    </ThemeProvider>
  );
};

describe('Browse instruments menu', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.viewport(1280, 720);
  });

  it('combines support filtering, search and favourites without selecting an instrument', () => {
    mountSelector('light', 'LOQ');
    cy.get('#instrument-selector-button').click();
    cy.contains('button', 'Clear filters').should('not.exist');
    cy.get('.MuiFormControlLabel-root').should(($toggle) => {
      const search = $toggle[0].ownerDocument
        .querySelector('input[aria-label="Search for instrument"]')!
        .closest('.MuiFormControl-root')!;
      const searchBounds = search.getBoundingClientRect();
      const toggleBounds = $toggle[0].getBoundingClientRect();
      expect(toggleBounds.left).to.be.greaterThan(searchBounds.right);
      expect(Math.abs(toggleBounds.top - searchBounds.top)).to.be.lessThan(1);
    });
    cy.contains('button', /^All/).should('not.exist');
    cy.contains('button', /^Favourites/).should('not.exist');
    cy.contains('button', 'Small-angle neutron scattering').should('not.exist');
    cy.get('input[type="checkbox"]').should('be.checked');
    cy.get('[role="menuitem"]').should('have.length', 11);
    cy.get('#instrument-type-menu .MuiPaper-root').should('have.css', 'border-radius', '0px');
    cy.get('[aria-label="Add LOQ to favourites"]').click();
    cy.get('[role="menuitem"]').first().should('contain', 'LOQ');
    cy.screenshot('browse-instruments-desktop', { capture: 'viewport' });
    cy.get('[aria-label="Remove LOQ from favourites"]').click();
    cy.get('[role="menuitem"]').first().should('contain', 'ENGINX');
    cy.get('input[aria-label="Search for instrument"]')
      .should('have.attr', 'placeholder', 'Search for instrument')
      .type('ALF');
    cy.contains('No instruments found').should('be.visible');
    cy.get('input[type="checkbox"]').uncheck();
    cy.get('[aria-label="Add ALF to favourites"]').click();
    cy.get('@selectInstrument').should('not.have.been.called');
    cy.get('[role="menuitem"]').should('have.length', 1).and('contain', 'ALF');
    cy.get('input[type="checkbox"]').check();
    cy.contains('No instruments found').should('be.visible');
    cy.get('input[aria-label="Search for instrument"]').clear();
    cy.get('[role="menuitem"]').should('have.length', 11);
    cy.contains('[role="menuitem"]', 'LOQ').click();
    cy.get('@selectInstrument').should('have.been.calledOnceWith', 'LOQ');
  });

  it('keeps the search, checkbox and scrollable list usable on small dark screens', () => {
    cy.viewport(375, 812);
    mountSelector('dark');
    cy.get('#instrument-selector-button').click();
    cy.get('.MuiFormControlLabel-root').should(($toggle) => {
      const search = $toggle[0].ownerDocument
        .querySelector('input[aria-label="Search for instrument"]')!
        .closest('.MuiFormControl-root')!;
      expect($toggle[0].getBoundingClientRect().top).to.be.greaterThan(search.getBoundingClientRect().bottom);
    });
    cy.get('input[type="checkbox"]').focus();
    cy.get('input[type="checkbox"]').should('have.focus');
    cy.get('input[type="checkbox"]').uncheck();
    cy.get('#instrument-type-menu .MuiPaper-root').should(($paper) => {
      const bounds = $paper[0].getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(375);
      expect(bounds.bottom).to.be.at.most(812);
    });
    cy.get('#instrument-type-menu .MuiPaper-root').should('have.css', 'background-color', 'rgb(31, 37, 43)');
    cy.get('[role="menu"]').scrollTo('bottom');
    cy.contains('Hide unsupported instruments').should('be.visible');
    cy.contains('[role="menuitem"]', 'ZOOM').should('be.visible');
    cy.screenshot('browse-instruments-mobile-dark', { capture: 'viewport' });
    cy.get('input[aria-label="Search for instrument"]').type('LOQ');
    cy.contains('[role="menuitem"]', 'LOQ').should('be.visible');
    cy.get('input[type="checkbox"]').check();
    cy.contains('[role="menuitem"]', 'LOQ').should('be.visible');
  });
});
