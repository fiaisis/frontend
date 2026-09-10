describe('Stack viewer search', () => {
  it('waits for Search, accepts a blank search for all stacks, and clears without reloading', () => {
    cy.viewport(1280, 720);
    cy.intercept('GET', '**/instrument/IMAT/jobs*', { body: [] }).as('stackJobs');
    cy.visitFia('/fia/reduction-history/IMAT/stack-viewer');
    cy.get('aside[aria-label="IMAT stack jobs"]').should('be.visible');
    cy.get('@stackJobs.all').should('have.length', 0);
    cy.contains('No successful IMAT stacks found.').should('not.exist');
    cy.get('aside[aria-label="IMAT stack jobs"]').contains('button', 'Search').click();
    cy.wait('@stackJobs').then(({ request }) => {
      const filters = JSON.parse(new URL(request.url).searchParams.get('filters')!);
      expect(filters).to.deep.equal({ job_state_in: ['SUCCESSFUL'] });
    });
    cy.contains('No successful IMAT stacks found.').should('be.visible');
    cy.get('aside[aria-label="IMAT stack jobs"]').contains('button', 'Clear').click();
    cy.contains('No successful IMAT stacks found.').should('not.exist');
    cy.get('@stackJobs.all').should('have.length', 1);
    cy.get('aside[aria-label="IMAT stack jobs"]').contains('button', 'Search').click();
    cy.wait('@stackJobs');
    cy.get('@stackJobs.all').should('have.length', 2);
  });

  it('clears a displayed image opened from a reduction link and keeps it cleared on refresh', () => {
    cy.viewport(1280, 720);
    cy.intercept('GET', '**/job/42', {
      body: {
        id: 42,
        state: 'SUCCESSFUL',
        outputs: '/data/run-42',
        run: {
          instrument_name: 'IMAT',
          experiment_number: 12345,
          filename: 'IMAT42.raw',
          run_start: '2026-01-01T10:00:00Z',
          title: 'Test stack',
        },
      },
    });
    cy.intercept('GET', '**/instrument/IMAT/jobs*', { body: [] }).as('stackJobs');
    cy.intercept('GET', '**/find_file/**', { body: '/data' });
    cy.intercept('GET', '**/imat/list-images*', { body: ['frame-1.tif'] });
    cy.intercept('GET', '**/imat/image*', {
      body: Cypress.Buffer.from(new Uint16Array([1, 2, 3, 4]).buffer),
      headers: {
        'content-type': 'application/octet-stream',
        'x-image-width': '2',
        'x-image-height': '2',
        'x-original-width': '2',
        'x-original-height': '2',
      },
    }).as('stackImage');
    cy.visitFia('/fia/reduction-history/IMAT/stack-viewer?jobId=42');
    cy.wait('@stackImage');
    cy.get('canvas').should('exist');
    cy.contains('Image 1 of 1').should('be.visible');
    cy.get('aside[aria-label="IMAT stack jobs"]').contains('button', 'Clear').should('be.enabled').click();
    cy.get('canvas').should('not.exist');
    cy.contains('Select a stack to view its images').should('be.visible');
    cy.contains('Image 0 of 0').should('be.visible');
    cy.location('search').should('not.match', /jobId=|experiment=|imageIndex=/);
    cy.get('@stackJobs.all').should('have.length', 0);
    cy.reload();
    cy.contains('Select a stack to view its images').should('be.visible');
    cy.get('canvas').should('not.exist');
    cy.get('@stackImage.all').should('have.length', 1);
  });
});
