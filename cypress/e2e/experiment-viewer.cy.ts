const searchForm = 'form[aria-label="Search reduction jobs"]';
const experimentInput = `${searchForm} input[type="number"]`;

describe('Experiment viewer search', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.intercept('GET', '**/jobs/count*', { body: { count: 0 } }).as('jobCount');
  });

  it('keeps the file-selection message while the next page loads', () => {
    cy.intercept('GET', '**/jobs/count*', { body: { count: 20 } }).as('jobCount');
    cy.intercept({ method: 'GET', pathname: '/api/jobs' }, (request) => {
      const id = Number(request.query.offset) + 1;
      request.reply({
        delay: id === 1 ? 0 : 1000,
        body: [
          {
            id,
            state: 'SUCCESSFUL',
            outputs: JSON.stringify([`result-${id}.nxs`]),
            run: {
              instrument_name: 'LOQ',
              experiment_number: 12345,
              filename: `LOQ${id}.nxs`,
              run_start: '2026-01-01T10:00:00Z',
              title: 'Test reduction',
            },
          },
        ],
      });
    }).as('jobs');
    cy.intercept('GET', '**/find_file/**', { body: '/data/result.nxs' });
    cy.visitFia('/fia/experiment-viewer?instrument=LOQ&experiment=12345');
    cy.wait('@jobs');
    cy.contains('button', 'LOQ1.nxs').should('be.visible');
    cy.contains('Select a file to view 1D data').should('be.visible');

    cy.get('button[aria-label="Go to page 2"]').click();
    cy.get('[role="progressbar"][aria-label="Loading jobs"]').should('be.visible');
    cy.contains('Search by instrument, experiment number, or run/file').should('not.exist');
    cy.contains('Choose filters, then press Search.').should('not.exist');
    cy.contains('Select a file to view 1D data').should('be.visible');
    cy.wait('@jobs');
    cy.contains('button', 'LOQ11.nxs').should('be.visible');
    cy.contains('Select a file to view 1D data').should('be.visible');

    cy.get('[aria-label="Clear experiment number"]').click();
    cy.contains('Search by instrument, experiment number, or run/file').should('be.visible');
    cy.contains('Choose filters, then press Search.').should('be.visible');
  });

  it('searches and clears below the tabs while keeping the selected instrument', () => {
    cy.visitFia('/fia/experiment-viewer?instrument=LOQ');
    cy.get('[aria-label="Page controls"]').find('form, input[type="number"]').should('not.exist');
    cy.contains('[aria-label="Page controls"] button', 'Browse instruments').should('be.visible');
    cy.get('aside[aria-label="Experiment viewer files"]').find(searchForm).should('be.visible');
    cy.get('@jobCount.all').should('have.length', 0);
    cy.get(searchForm).should(($form) => {
      const tabs = $form[0].ownerDocument.querySelector('[role="tablist"]')!;
      // The tab list sits inside the tabs' one-pixel bottom border.
      expect($form[0].getBoundingClientRect().top - tabs.getBoundingClientRect().bottom).to.be.within(0, 1);
    });
    cy.get(experimentInput).type('12345{enter}');
    cy.location('pathname').should('eq', '/fia/experiment-viewer');
    cy.location('search').should('eq', '?instrument=LOQ&experiment=12345');
    cy.wait('@jobCount').then(({ request }) => {
      const filters = JSON.parse(new URL(request.url).searchParams.get('filters')!);
      expect(filters.instrument_in).to.deep.equal(['LOQ']);
      expect(filters.experiment_number_in).to.deep.equal([12345]);
    });
    cy.get(experimentInput).should('have.value', '12345').and('have.focus');
    cy.screenshot('experiment-search-desktop', { capture: 'viewport' });
    cy.get('[aria-label="Clear experiment number"]').click();
    cy.location('pathname').should('eq', '/fia/experiment-viewer');
    cy.location('search').should('eq', '?instrument=LOQ');
    cy.get(experimentInput).should('have.value', '');
    cy.get('[aria-label="Clear experiment number"]').should('be.disabled');
    cy.get('@jobCount.all').should('have.length', 1);
  });

  for (const instrument of [undefined, 'LOQ']) {
    it(`loads all reductions only after a blank Search with instrument ${instrument ?? 'all'}`, () => {
      const basePath = `/fia/experiment-viewer${instrument ? `?instrument=${instrument}` : ''}`;
      cy.visitFia(basePath);
      cy.get(searchForm).should('be.visible');
      cy.get('@jobCount.all').should('have.length', 0);
      cy.contains(`${searchForm} button`, 'Search').click();
      cy.wait('@jobCount').then(({ request }) => {
        const filters = JSON.parse(new URL(request.url).searchParams.get('filters')!);
        expect(filters).to.deep.equal({
          job_state_in: ['SUCCESSFUL'],
          ...(instrument ? { instrument_in: [instrument] } : {}),
        });
      });
      cy.location('search').should('eq', `${instrument ? `?instrument=${instrument}&` : '?'}search=true`);
      cy.reload();
      cy.wait('@jobCount');
      cy.get('[aria-label="Clear experiment number"]').should('be.enabled').click();
      cy.location('search').should('eq', instrument ? `?instrument=${instrument}` : '');
      cy.get('[aria-label="Clear experiment number"]').should('be.disabled');
      cy.get('@jobCount.all').should('have.length', 2);
    });
  }

  it('keeps experiment-only searches usable on narrow screens and synchronizes parent navigation', () => {
    cy.viewport(375, 812);
    cy.visitFia('/fia/experiment-viewer');
    cy.get(experimentInput).type('54321');
    cy.contains(`${searchForm} button`, 'Search').click();
    cy.location('pathname').should('eq', '/fia/experiment-viewer');
    cy.location('search').should('eq', '?experiment=54321');
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
    cy.location('search').should('eq', '');
    cy.get(experimentInput).should('have.value', '');
  });

  it('encodes run/file searches and restores them on refresh and browser history', () => {
    const filename = 'LOQ & scan #1.nxs';
    const search = `?${new URLSearchParams({ instrument: 'LOQ', filename })}`;
    cy.visitFia('/fia/experiment-viewer?instrument=LOQ');
    cy.get(searchForm).find('[role="combobox"]').click();
    cy.contains('[role="option"]', 'Run/file').click();
    cy.get('input[aria-label="Run/file"]').type(`${filename}{enter}`);
    cy.location('pathname').should('eq', '/fia/experiment-viewer');
    cy.location('search').should('eq', search);
    cy.reload();
    cy.get('input[aria-label="Run/file"]').should('have.value', filename);
    cy.get('[aria-label="Clear run/file search"]').click();
    cy.location('search').should('eq', '?instrument=LOQ');
    cy.go('back');
    cy.location('search').should('eq', search);
    cy.get('input[aria-label="Run/file"]').should('have.value', filename);
    cy.go('forward');
    cy.location('search').should('eq', '?instrument=LOQ');
    cy.get('input[aria-label="Run/file"]').should('have.value', '');
  });
});
