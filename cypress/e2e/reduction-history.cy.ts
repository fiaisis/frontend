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
  });

  it('shows the IMAT image view breadcrumb selector without the current reduction-history option', () => {
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
      cy.get('#imat-view-selector-button').should('contain', 'Select to view images').click();
    });

    cy.contains('[role="menuitem"]', 'Reduction history').should('not.exist');
    cy.contains('[role="menuitem"]', 'Latest image').should('be.visible');
    cy.contains('[role="menuitem"]', 'Stack viewer').should('be.visible');
  });
});
