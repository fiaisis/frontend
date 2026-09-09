const searchForm = 'form[aria-label="Search experiment number"]';
const experimentInput = `${searchForm} input[type="number"]`;

describe('Experiment viewer search', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.intercept('GET', '**/jobs/count*', { body: { count: 0 } }).as('jobCount');
  });

  it('searches and clears below the tabs while keeping the selected instrument', () => {
    cy.visitFia('/fia/experiment-viewer/LOQ');
    cy.wait('@jobCount');
    cy.get('[aria-label="Page controls"]').find('form, input[type="number"]').should('not.exist');
    cy.contains('[aria-label="Page controls"] button', 'Browse instruments').should('be.visible');
    cy.get('aside[aria-label="Experiment viewer files"]').find(searchForm).should('be.visible');
    cy.get(searchForm).should(($form) => {
      const tabs = $form[0].ownerDocument.querySelector('[role="tablist"]')!;
      // The tab list sits inside the tabs' one-pixel bottom border.
      expect($form[0].getBoundingClientRect().top - tabs.getBoundingClientRect().bottom).to.be.within(0, 1);
    });
    cy.get(experimentInput).type('12345{enter}');
    cy.location('pathname').should('eq', '/fia/experiment-viewer/LOQ/12345');
    cy.wait('@jobCount').then(({ request }) => {
      const filters = JSON.parse(new URL(request.url).searchParams.get('filters')!);
      expect(filters.instrument_in).to.deep.equal(['LOQ']);
      expect(filters.experiment_number_in).to.deep.equal([12345]);
    });
    cy.get(experimentInput).should('have.value', '12345').and('have.focus');
    cy.screenshot('experiment-search-desktop', { capture: 'viewport' });
    cy.get('[aria-label="Clear experiment number"]').click();
    cy.location('pathname').should('eq', '/fia/experiment-viewer/LOQ');
    cy.get(experimentInput).should('have.value', '');
    cy.get('[aria-label="Clear experiment number"]').should('be.disabled');
  });

  it('keeps experiment-only searches usable on narrow screens and synchronizes parent navigation', () => {
    cy.viewport(375, 812);
    cy.visitFia('/fia/experiment-viewer');
    cy.get(experimentInput).type('54321');
    cy.contains(`${searchForm} button`, 'Search').click();
    cy.location('pathname').should('eq', '/fia/experiment-viewer/experiment/54321');
    cy.get(searchForm).should(($form) => {
      const bounds = $form[0].getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(375);
    });
    cy.get(experimentInput).should('be.visible').and('have.value', '54321');
    cy.get('[aria-label="Clear experiment number"]').should('be.visible');
    cy.screenshot('experiment-search-mobile', { capture: 'viewport' });
    cy.contains('[aria-label="breadcrumb"] a', 'Experiment viewer').click();
    cy.location('pathname').should('eq', '/fia/experiment-viewer');
    cy.get(experimentInput).should('have.value', '');
  });
});
