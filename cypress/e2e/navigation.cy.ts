describe('FIA plugin navigation', () => {
  it('redirects unknown routes back to the homepage', () => {
    cy.visitFia('/fia/not-a-real-route');

    cy.location('pathname').should('match', /\/fia\/?$/);
    cy.contains('Data reduction').should('be.visible');
  });

  it('navigates from homepage to instruments', () => {
    cy.visitFia('/fia');

    cy.get('a[href="/fia/isis-instruments"]').first().click();

    cy.location('pathname').should('eq', '/fia/isis-instruments');
    cy.get('[aria-label="breadcrumb"]')
      .find('[aria-label^="Instrument search:"]')
      .should('be.visible')
      .and('contain', 'Browse instruments');
  });
});
