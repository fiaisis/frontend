describe('FIA plugin navigation', () => {
  it('redirects unknown routes back to the homepage', () => {
    cy.visitFia('/fia/not-a-real-route');

    cy.location('pathname').should('match', /\/fia\/?$/);
    cy.contains('Data reduction').should('be.visible');
  });

  it('navigates from homepage to instruments', () => {
    cy.visitFia('/fia');

    cy.get('a[href="/fia/instruments"]').first().click();

    cy.location('pathname').should('eq', '/fia/instruments');
    cy.contains('h1', 'ISIS instruments').should('be.visible');
  });
});
