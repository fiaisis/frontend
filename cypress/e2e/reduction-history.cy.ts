import { JOB_ROWS_PER_PAGE_OPTIONS, JOB_TABLE_MIN_WIDTH } from '../../src/components/jobs/constants';

const baseJob = {
  start: '2025-01-01T10:00:00Z',
  end: '2025-01-01T10:15:00Z',
  state: 'SUCCESSFUL',
  status_message: '',
  runner_image: 'ghcr.io/fiaisis/runner@sha256:abc123',
  type: 'JobType.REDUCTION',
  inputs: {
    detector_mode: 'high',
  },
  outputs: "['LOQ00012345.nxs']",
  stacktrace: '',
  script: {
    value: 'print("rerun")',
  },
};

const allJobsResponse = [
  {
    ...baseJob,
    id: 101,
    run: {
      experiment_number: 12345,
      filename: '/archive/LOQ00012345.nxs',
      run_start: '2025-01-01T09:00:00Z',
      run_end: '2025-01-01T09:30:00Z',
      title: 'All instruments reduction',
      users: 'Dr. Doe',
      good_frames: 125000,
      raw_frames: 130000,
      instrument_name: 'LOQ',
    },
  },
];

const loqJobsResponse = [
  {
    ...baseJob,
    id: 202,
    run: {
      experiment_number: 67890,
      filename: '/archive/LOQ00067890.nxs',
      run_start: '2025-01-02T09:00:00Z',
      run_end: '2025-01-02T09:30:00Z',
      title: 'LOQ scoped reduction',
      users: 'Dr. Smith',
      good_frames: 98000,
      raw_frames: 101000,
      instrument_name: 'LOQ',
    },
  },
];

describe('Reduction history page', () => {
  beforeEach(() => {
    cy.intercept('GET', /\/api\/jobs\/runners$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: { 'sha256:abc123': 'Mantid 6.9.0' },
      });
    }).as('getRunners');
  });

  it('loads with mocked auth-aware API responses and supports instrument scoping', () => {
    cy.intercept('GET', /\/api\/jobs\/count\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: { count: allJobsResponse.length },
      });
    }).as('getAllCount');

    cy.intercept('GET', /\/api\/jobs\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: allJobsResponse,
      });
    }).as('getAllJobs');

    cy.intercept('GET', /\/api\/instrument\/LOQ\/jobs\/count\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: { count: loqJobsResponse.length },
      });
    }).as('getLoqCount');

    cy.intercept('GET', /\/api\/instrument\/LOQ\/jobs\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: loqJobsResponse,
      });
    }).as('getLoqJobs');

    cy.visitFia('/fia/reduction-history');

    cy.wait('@getRunners');
    cy.wait('@getAllCount');
    cy.wait('@getAllJobs');

    cy.contains('h1', 'Reduction history').should('be.visible');
    cy.contains('All instruments reduction').should('be.visible');

    cy.get('[aria-label="breadcrumb"]').within(() => {
      cy.get('#instrument-selector-button').should('contain', 'Select an instrument').click();
    });
    cy.contains('[role="menuitem"]', 'View all reductions').should('not.exist');
    cy.contains('button', 'Small-angle neutron scattering').click();
    cy.contains('[role="menuitem"]', 'LOQ').click();

    cy.wait('@getLoqCount');
    cy.wait('@getLoqJobs');

    cy.location('pathname').should('eq', '/fia/reduction-history/LOQ');
    cy.get('[aria-label="breadcrumb"]').within(() => {
      cy.get('#instrument-selector-button').should('contain', 'LOQ');
    });
    cy.contains('h1', 'LOQ reduction history').should('be.visible');
    cy.contains('LOQ scoped reduction').should('be.visible');

    cy.contains('LOQ scoped reduction').click();
    cy.contains('button', 'Experiment viewer').within(() => {
      cy.get('[data-testid="VisibilityIcon"]').should('exist');
      cy.get('[data-testid="OpenInNewIcon"]').should('not.exist');
    });
  });

  it('wraps table controls while keeping column headers horizontally scrollable on narrow screens', () => {
    cy.viewport(700, 900);

    cy.intercept('GET', /\/api\/jobs\/count\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: { count: 74082 },
      });
    }).as('getAllCount');

    cy.intercept('GET', /\/api\/jobs\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: allJobsResponse,
      });
    }).as('getAllJobs');

    cy.visitFia('/fia/reduction-history');

    cy.wait('@getRunners');
    cy.wait('@getAllCount');
    cy.wait('@getAllJobs');

    cy.contains('All instruments reduction').should('be.visible');

    cy.get('[data-testid="rows-per-page-controls"]').within(() => {
      cy.contains('button', '10').click();
    });

    cy.wait('@getAllCount');
    cy.wait('@getAllJobs');

    cy.contains('Showing 1-10 of 74082 reductions').should('be.visible');

    cy.get('[data-testid="reduction-history-table-container"]').should(($container) => {
      const container = $container[0];

      expect(container.scrollWidth).to.be.greaterThan(container.clientWidth);
    });

    cy.get('[data-testid="reduction-history-table-toolbar"]').should(($toolbar) => {
      const toolbar = $toolbar[0];

      expect(toolbar.getBoundingClientRect().width).to.be.at.least(JOB_TABLE_MIN_WIDTH);
      expect(getComputedStyle(toolbar).flexWrap).to.equal('wrap');
    });

    cy.get('[data-testid="reduction-history-table-toolbar"]')
      .children()
      .should(($groups) => {
        expect($groups).to.have.length(2);

        const [selectionControls, tableControls] = $groups.toArray();

        expect(getComputedStyle(selectionControls).flexWrap).to.equal('nowrap');
        expect(getComputedStyle(tableControls).flexWrap).to.equal('wrap');
      });

    cy.get('[data-testid="reduction-history-table-toolbar"] .MuiTablePagination-toolbar').should(($pagination) => {
      expect(getComputedStyle($pagination[0]).flexWrap).to.equal('wrap');
    });

    cy.get('.tour-job-table-adv-filters').should(($toolbarControls) => {
      expect(getComputedStyle($toolbarControls[0]).flexWrap).to.equal('wrap');
      expect(getComputedStyle($toolbarControls[0]).columnGap).to.equal('32px');
    });

    cy.get('[data-testid="rows-per-page-controls"]').within(() => {
      cy.contains('Rows per page').should('be.visible');
      cy.get('button').should('have.length', JOB_ROWS_PER_PAGE_OPTIONS.length);
      JOB_ROWS_PER_PAGE_OPTIONS.forEach((option) => {
        cy.contains('button', option.toString()).should('be.visible');
      });
      cy.get('button[aria-pressed="true"]').should('have.length', 1).and('have.text', '10');
      cy.get('[role="combobox"]').should('not.exist');
    });

    cy.get('[data-testid="reduction-history-table-container"] table').should(($table) => {
      expect($table[0].getBoundingClientRect().width).to.be.at.least(JOB_TABLE_MIN_WIDTH);
    });

    cy.contains('th', 'Experiment number').should(($header) => {
      expect(getComputedStyle($header[0]).whiteSpace).to.equal('nowrap');
    });
  });

  it('shows the IMAT image view breadcrumb selector with image view options', () => {
    cy.intercept('GET', /\/api\/instrument\/IMAT\/jobs\/count\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: { count: 0 },
      });
    }).as('getImatCount');

    cy.intercept('GET', /\/api\/instrument\/IMAT\/jobs\?.*$/, (req) => {
      expect(req.headers.authorization).to.match(/^Bearer(?: .+)?$/);
      req.reply({
        statusCode: 200,
        body: [],
      });
    }).as('getImatJobs');

    cy.visitFia('/fia/reduction-history/IMAT');

    cy.wait('@getRunners');
    cy.wait('@getImatCount');
    cy.wait('@getImatJobs');

    cy.get('[aria-label="breadcrumb"]').within(() => {
      cy.get('#imat-view-selector-button').should('contain', 'Reduction history').click();
    });

    cy.contains('[role="menuitem"]', 'Reduction history').should('be.visible');
    cy.contains('[role="menuitem"]', 'Latest image').should('be.visible');
    cy.contains('[role="menuitem"]', 'Stack viewer').should('be.visible');
  });
});
