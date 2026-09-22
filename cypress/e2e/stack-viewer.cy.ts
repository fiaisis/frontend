describe('Stack viewer search', () => {
  it('keeps the plot frame fixed when changing image size and restores sizes from the URL', () => {
    cy.viewport(1440, 900);
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
    cy.intercept('GET', '**/instrument/IMAT/jobs*', { body: [] });
    cy.intercept('GET', '**/find_file/**', { body: '/data' });
    cy.intercept('GET', '**/imat/list-images*', { body: ['frame-1.tif'] });
    cy.intercept('GET', '**/imat/image*', {
      body: Cypress.Buffer.from(new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer),
      headers: {
        'content-type': 'application/octet-stream',
        'x-image-width': '4',
        'x-image-height': '2',
        'x-original-width': '2048',
        'x-original-height': '1024',
      },
    }).as('stackImage');
    cy.visitFia('/fia/reduction-history/IMAT/stack-viewer?jobId=42');
    cy.wait('@stackImage');
    const plot = 'figure[aria-label="IMAT stack image"]';
    const selectors = [
      `${plot} svg[data-type="abscissa"]`,
      `${plot} svg[data-type="ordinate"]`,
      `${plot} > div:last-child`,
    ];
    const fitBounds: DOMRect[] = [];
    selectors.forEach((selector, index) => {
      cy.get(selector)
        .should('be.visible')
        .then(($element) => {
          fitBounds[index] = $element[0].getBoundingClientRect();
        });
    });
    const sizeLabels = { small: '25%', medium: '50%', large: '75%', full: '100%', fit: 'fit' };
    Object.entries(sizeLabels).forEach(([size, label]) => {
      // Auto-scrolling overflow-hidden ancestors would shift the viewport coordinates being compared.
      cy.get(`button[aria-label="${label}"]`).click({ scrollBehavior: false });
      cy.get(`button[aria-label="${label}"]`).should('have.attr', 'aria-pressed', 'true');
      selectors.forEach((selector, index) => {
        cy.get(selector).should(($element) => {
          const bounds = $element[0].getBoundingClientRect();
          for (const key of ['x', 'y', 'width', 'height'] as const) {
            expect(bounds[key], `${size} ${key}`).to.be.closeTo(fitBounds[index][key], 1);
          }
        });
      });
      cy.location('search').should(size === 'fit' ? 'not.contain' : 'contain', `viewerSize=${size}`);
    });
    cy.get('button[aria-label="75%"]').click({ scrollBehavior: false });
    cy.reload();
    cy.wait('@stackImage');
    cy.get('button[aria-label="75%"]').should('have.attr', 'aria-pressed', 'true');
    cy.get(plot).should('be.visible');
    cy.screenshot('imat-stack-large-page');
  });

  it('waits for Search, accepts a blank search for all stacks, and clears without reloading', () => {
    cy.viewport(1280, 720);
    cy.intercept('GET', '**/instrument/IMAT/jobs*', { body: [] }).as('stackJobs');
    cy.visitFia('/fia/reduction-history/IMAT/stack-viewer');
    cy.get('aside[aria-label="IMAT stack jobs"]').should('be.visible');
    cy.get('button[aria-label="fit"]').should('be.visible');
    cy.screenshot('imat-stack-empty-page');
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
    cy.contains('Image 0 of 0').should('not.exist');
    cy.location('search').should('not.match', /jobId=|experiment=|imageIndex=/);
    cy.get('@stackJobs.all').should('have.length', 0);
    cy.reload();
    cy.contains('Select a stack to view its images').should('be.visible');
    cy.get('canvas').should('not.exist');
    cy.get('@stackImage.all').should('have.length', 1);
  });
});
