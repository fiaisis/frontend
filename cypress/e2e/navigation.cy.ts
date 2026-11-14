describe('FIA plugin navigation', () => {
  it('redirects unknown routes back to the homepage', () => {
    cy.visitFia('/fia/not-a-real-route');

    cy.location('pathname').should('match', /\/fia\/?$/);
    cy.title().should('eq', 'Home page | FIA');
    cy.contains('Data reduction').should('be.visible');
  });

  it('navigates from homepage to instruments', () => {
    cy.visitFia('/fia');
    cy.title().should('eq', 'Home page | FIA');

    cy.get('a[href="/fia/isis-instruments"]').first().click();

    cy.location('pathname').should('eq', '/fia/isis-instruments');
    cy.title().should('eq', 'ISIS instruments | FIA');
    cy.get('[role="group"][aria-label="Page controls"]')
      .find('input[aria-label="Search for instrument, technique, or scientist"]')
      .should('be.visible')
      .and('have.attr', 'placeholder', 'Search for instrument, technique, or scientist');
    cy.get('#instrument-search-button').should('not.exist');

    cy.reload();
    cy.title().should('eq', 'ISIS instruments | FIA');
    cy.go('back');
    cy.title().should('eq', 'Home page | FIA');
    cy.go('forward');
    cy.title().should('eq', 'ISIS instruments | FIA');
  });

  for (const segment of ['LOQ', 'small-angle-neutron-scattering']) {
    it(`redirects the old ${segment} instruments route to the single page`, () => {
      cy.visitFia(`/fia/isis-instruments/${segment}`);
      cy.location('pathname').should('eq', '/fia/isis-instruments');
      cy.title().should('eq', 'ISIS instruments | FIA');
      cy.get('#instrument-search').should('be.visible').and('have.value', '');
    });
  }
});
