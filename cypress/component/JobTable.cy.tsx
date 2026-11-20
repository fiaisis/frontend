import { Box } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { mount } from 'cypress/react';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { JobRowsPerPage } from '../../src/components/jobs/constants';
import JobTable from '../../src/components/jobs/JobTable';
import { Job } from '../../src/lib/types';

const tableContainerSelector = '[data-testid="reduction-history-table-container"]';
const tableScrollSelector = '[data-testid="reduction-history-table-scroll"]';

const job: Job = {
  id: 101,
  start: '2026-01-01T10:00:00Z',
  end: '2026-01-01T10:15:00Z',
  state: 'SUCCESSFUL',
  status_message: '',
  runner_image: 'registry@mantid:6.9',
  type: 'JobType.REDUCTION',
  inputs: {},
  outputs: '',
  stacktrace: '',
  script: { value: 'reduce()' },
  run: {
    experiment_number: 12345,
    filename: '/archive/LOQ00012345.nxs',
    run_start: '2026-01-01T09:00:00Z',
    run_end: '2026-01-01T09:30:00Z',
    title: 'Alignment test reduction',
    users: 'Ada',
    good_frames: 100,
    raw_frames: 110,
    instrument_name: 'LOQ',
  },
};

const PaginatedJobTable = ({ initialRows }: { initialRows: JobRowsPerPage }): React.ReactElement => {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(initialRows);
  const onAction = (): void => {};

  return (
    <MemoryRouter>
      <Box sx={{ height: 'calc(100vh - 16px)' }}>
        <JobTable
          selectedInstrument="ALL"
          currentPage={page}
          handlePageChange={setPage}
          asUser={false}
          setAsUser={onAction}
          rowsPerPage={rows}
          handleRowsPerPageChange={(newRows, newPage) => {
            setRows(newRows);
            setPage(newPage);
          }}
          filters={{}}
          handleSort={onAction}
          orderBy="start"
          orderDirection="desc"
          filtersApplied={false}
          openFilters={onAction}
          handleFiltersChange={onAction}
          selectedReductionId={null}
          openReductionDetails={onAction}
          closeReductionDetails={onAction}
        />
      </Box>
    </MemoryRouter>
  );
};

const expectColumnAlignment = (expectedGutter?: number): void => {
  cy.get(tableContainerSelector).should(($container) => {
    const headerTable = $container.find('table[aria-label="Reduction history column headers"]')[0];
    const bodyTable = $container.find('table[aria-label="Reduction history rows"]')[0];
    const headerCells = headerTable.querySelectorAll('th');
    const bodyCells = bodyTable.querySelectorAll('tbody tr:first-child td');

    expect(headerTable.getBoundingClientRect().width).to.be.closeTo(bodyTable.getBoundingClientRect().width, 0.1);
    expect(headerCells.length).to.equal(7);
    expect(bodyCells.length).to.equal(headerCells.length);
    headerCells.forEach((cell, index) => {
      expect(cell.getBoundingClientRect().right, `column ${index + 1} divider`).to.be.closeTo(
        bodyCells[index].getBoundingClientRect().right,
        0.1
      );
    });

    if (expectedGutter !== undefined) {
      const scrollContainer = $container.find(tableScrollSelector)[0];
      expect(scrollContainer.getBoundingClientRect().width - bodyTable.getBoundingClientRect().width).to.be.closeTo(
        expectedGutter,
        0.1
      );
    }
  });
};

describe('Reduction history column alignment', () => {
  (['light', 'dark'] as const).forEach((mode) => {
    it(`aligns dividers across viewport and scrollbar width changes in ${mode} mode`, () => {
      cy.viewport(1280, 720);
      cy.intercept('GET', '**/api/jobs/runners', { body: {} });
      cy.intercept('GET', '**/api/jobs/count?*', { body: { count: 25 } });
      cy.intercept('GET', '**/api/jobs?*', {
        body: Array.from({ length: 25 }, (_, index) => ({ ...job, id: 1000 + index })),
      }).as('getJobs');

      const onAction = cy.stub();
      mount(
        <ThemeProvider theme={createTheme({ palette: { mode } })}>
          <MemoryRouter>
            <Box sx={{ height: 'calc(100vh - 16px)' }}>
              <JobTable
                selectedInstrument="ALL"
                currentPage={0}
                handlePageChange={onAction}
                asUser={false}
                setAsUser={onAction}
                rowsPerPage={25}
                handleRowsPerPageChange={onAction}
                filters={{}}
                handleSort={onAction}
                orderBy="start"
                orderDirection="desc"
                filtersApplied={false}
                openFilters={onAction}
                handleFiltersChange={onAction}
                selectedReductionId={null}
                openReductionDetails={onAction}
                closeReductionDetails={onAction}
              />
            </Box>
          </MemoryRouter>
        </ThemeProvider>
      );

      cy.wait('@getJobs');
      cy.contains(job.run.title).should('be.visible');
      cy.get(tableScrollSelector).should(($container) => {
        expect($container[0].scrollHeight).to.be.greaterThan($container[0].clientHeight);
      });
      expectColumnAlignment();

      // Force a width different from the preferred 12px, independently of OS defaults.
      cy.document().then((document) => {
        const style = document.createElement('style');
        style.textContent = `
          ${tableScrollSelector} { scrollbar-color: auto !important; }
          ${tableScrollSelector}::-webkit-scrollbar { width: 23px !important; }
        `;
        document.head.appendChild(style);
      });
      expectColumnAlignment(Cypress.isBrowser({ family: 'chromium' }) ? 23 : undefined);

      cy.viewport(700, 900);
      cy.get(tableContainerSelector).scrollTo('right');
      cy.get(tableScrollSelector).scrollTo('bottom');
      expectColumnAlignment();

      // Exercise the zero-width gutter used by overlay or hidden scrollbars.
      cy.get(tableScrollSelector).then(($container) => {
        $container[0].style.setProperty('scrollbar-width', 'none');
      });
      expectColumnAlignment(0);

      cy.viewport(1437, 900);
      expectColumnAlignment();
    });
  });
});

describe('Reduction history pagination scroll', () => {
  const scenarios: { label: string; button: string; rows: JobRowsPerPage; first: number; last: number }[] = [
    { label: 'next page', button: 'Go to next page', rows: 25, first: 51, last: 75 },
    { label: 'previous page', button: 'Go to previous page', rows: 25, first: 1, last: 25 },
    { label: 'numbered page', button: 'Go to page 4', rows: 25, first: 76, last: 100 },
    { label: 'increasing rows per page', button: '50 rows per page', rows: 25, first: 1, last: 50 },
    { label: 'decreasing rows per page', button: '25 rows per page', rows: 50, first: 51, last: 75 },
  ];

  scenarios.forEach(({ label, button, rows, first, last }) => {
    it(`resets to the top after ${label}`, () => {
      cy.viewport(1280, 720);
      cy.intercept('GET', '**/api/jobs/runners', { body: {} });
      cy.intercept('GET', '**/api/jobs/count?*', { body: { count: 200 } });
      cy.intercept('GET', '**/api/jobs?*', (request) => {
        const params = new URL(request.url).searchParams;
        const offset = Number(params.get('offset'));
        const limit = Number(params.get('limit'));
        request.reply({
          body: Array.from({ length: limit }, (_, index) => ({
            ...job,
            id: offset + index + 1,
            run: { ...job.run, title: `Reduction ${offset + index + 1}` },
          })),
        });
      }).as('getJobs');

      mount(<PaginatedJobTable initialRows={rows} />);
      cy.wait('@getJobs');
      cy.get(tableScrollSelector)
        .find('tbody tr')
        .first()
        .should('contain.text', `Reduction ${rows + 1}`);
      cy.get(tableScrollSelector).scrollTo(0, 300);
      cy.get(tableScrollSelector).should('have.prop', 'scrollTop', 300);

      cy.get(`button[aria-label="${button}"]`).click();

      cy.get('[data-testid="reduction-history-displayed-rows"]').should(
        'have.text',
        `Showing ${first}-${last} of 200 reductions`
      );
      cy.get(tableScrollSelector).find('tbody tr').first().should('contain.text', `Reduction ${first}`);
      cy.get(tableScrollSelector).should('have.prop', 'scrollTop', 0);
    });
  });
});
