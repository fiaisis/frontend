import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { JOB_TABLE_CHROME_CONTROL_HEIGHT, JOB_TABLE_CHROME_ROW_MIN_HEIGHT, JOB_TABLE_HEADER_HEIGHT } from './constants';
import JobTable from './JobTable';
import { fiaApi } from '../../lib/api';
import { Job, JobQueryFilters } from '../../lib/types';

vi.mock('../../lib/api', () => ({
  fiaApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('./Row', () => ({
  default: ({
    job,
    isSelected,
    toggleSelection,
  }: {
    job: Job;
    isSelected: boolean;
    toggleSelection: (jobId: number) => void;
  }) => (
    <tr>
      <td>
        <button type="button" onClick={() => toggleSelection(job.id)}>
          {isSelected ? `Deselect row ${job.id}` : `Select row ${job.id}`}
        </button>
        <span>{job.run.title}</span>
      </td>
    </tr>
  ),
}));

const jobs: Job[] = [
  {
    id: 101,
    start: '2026-01-01T10:00:00Z',
    end: '2026-01-01T10:05:00Z',
    state: 'SUCCESSFUL',
    status_message: '',
    runner_image: 'registry@mantid:6.9',
    type: 'JobType.REDUCTION',
    inputs: { wavelength: 4.5 },
    outputs: "['first.nxs', 'second.nxs']",
    stacktrace: '',
    script: { value: 'reduce()' },
    run: {
      experiment_number: 12345,
      filename: '/data/LOQ00012345.raw',
      run_start: '2026-01-01T09:00:00Z',
      run_end: '2026-01-01T09:30:00Z',
      title: 'First reduction',
      users: 'Ada',
      good_frames: 100,
      raw_frames: 110,
      instrument_name: 'LOQ',
    },
  },
  {
    id: 102,
    start: '2026-01-02T10:00:00Z',
    end: '2026-01-02T10:05:00Z',
    state: 'ERROR',
    status_message: 'Failed',
    runner_image: 'registry@mantid:6.8',
    type: 'JobType.REDUCTION',
    inputs: {},
    outputs: '',
    stacktrace: 'Traceback',
    script: { value: 'reduce()' },
    run: {
      experiment_number: 12346,
      filename: '/data/LOQ00012346.raw',
      run_start: '2026-01-02T09:00:00Z',
      run_end: '2026-01-02T09:30:00Z',
      title: 'Second reduction',
      users: 'Grace',
      good_frames: 90,
      raw_frames: 100,
      instrument_name: 'LOQ',
    },
  },
];

const defaultProps = {
  selectedInstrument: 'LOQ',
  currentPage: 0,
  handlePageChange: vi.fn(),
  asUser: false,
  setAsUser: vi.fn(),
  rowsPerPage: 25 as const,
  handleRowsPerPageChange: vi.fn(),
  filters: {} as JobQueryFilters,
  handleSort: vi.fn(),
  orderBy: 'start',
  orderDirection: 'desc' as const,
  filtersApplied: false,
  openFilters: vi.fn(),
  handleFiltersChange: vi.fn(),
  configControl: <button type="button">Edit config</button>,
};

const renderTable = (overrides: Partial<typeof defaultProps> = {}): ReturnType<typeof render> =>
  render(<JobTable {...defaultProps} {...overrides} />);

const waitForLoadedJobs = async (): Promise<void> => {
  await waitFor(() => {
    const jobListRequests = vi
      .mocked(fiaApi.get)
      .mock.calls.map(([url]) => String(url))
      .filter((url) => url.includes('/jobs?'));
    expect(jobListRequests.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('First reduction')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
};

describe('JobTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      const requestUrl = String(url);
      if (requestUrl === '/jobs/runners') {
        return { data: { 'mantid:6.9': 'Mantid 6.9' } };
      }
      if (requestUrl.includes('/count?')) {
        return { data: { count: 35 } };
      }
      return { data: jobs };
    });
    vi.mocked(fiaApi.post).mockResolvedValue({ status: 200, data: 'zip-content' });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('loads instrument jobs and wires the table controls', async () => {
    const user = userEvent.setup();
    const handleSort = vi.fn();
    const openFilters = vi.fn();

    renderTable({ handleSort, openFilters, filtersApplied: true });

    await waitForLoadedJobs();
    expect(screen.getByText('Second reduction')).toBeInTheDocument();
    expect(fiaApi.get).toHaveBeenCalledWith(expect.stringContaining('/instrument/LOQ/jobs?limit=25&offset=0'));
    expect(fiaApi.get).toHaveBeenCalledWith('/instrument/LOQ/jobs/count?filters={}');
    expect(fiaApi.get).toHaveBeenCalledWith('/jobs/runners');
    expect(screen.getByText('Showing 1-25 of 35 reductions')).toBeInTheDocument();
    expect(screen.getByTestId('reduction-history-pagination-footer')).toContainElement(
      screen.getByText('Showing 1-25 of 35 reductions')
    );
    expect(screen.getByTestId('reduction-history-table-toolbar')).not.toContainElement(
      screen.getByText('Showing 1-25 of 35 reductions')
    );
    expect(screen.getByTestId('reduction-history-table-toolbar')).toHaveStyle({ position: 'sticky', top: '0px' });
    const tablePaper = screen.getByTestId('reduction-history-table-paper');
    expect(tablePaper).toHaveClass('MuiPaper-elevation0');
    expect(tablePaper).not.toHaveClass('MuiPaper-rounded');
    expect(tablePaper).toHaveStyle({ borderRadius: '0px' });
    const tableHeader = screen.getByTestId('reduction-history-table-header');
    const tableScroll = screen.getByTestId('reduction-history-table-scroll');
    expect(tableScroll).toHaveStyle({ overflowY: 'scroll' });
    expect(tableHeader).toContainElement(screen.getByText('Filename').closest('thead'));
    expect(tableScroll).not.toContainElement(screen.getByText('Filename').closest('thead'));
    expect(tableHeader.compareDocumentPosition(tableScroll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Title').closest('th')).toHaveAttribute('data-border-continuation', 'header-gutter');
    expect(screen.getByTestId('reduction-history-table-header-gutter')).toBeInTheDocument();
    expect(screen.getByText('Filename').closest('thead')).toHaveStyle({ height: `${JOB_TABLE_HEADER_HEIGHT}px` });

    const toolbar = screen.getByTestId('reduction-history-table-toolbar');
    const footer = screen.getByTestId('reduction-history-pagination-footer');
    const filtersButton = within(toolbar).getByRole('button', { name: 'Filters' });
    const editConfigButton = within(toolbar).getByRole('button', { name: 'Edit config' });
    expect(toolbar).toHaveStyle({ minHeight: `${JOB_TABLE_CHROME_ROW_MIN_HEIGHT}px` });
    expect(footer).toHaveStyle({ minHeight: `${JOB_TABLE_CHROME_ROW_MIN_HEIGHT}px` });
    expect(filtersButton).toHaveStyle({ height: `${JOB_TABLE_CHROME_CONTROL_HEIGHT}px` });
    expect(filtersButton.compareDocumentPosition(editConfigButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toolbar).not.toContainElement(screen.getByTestId('rows-per-page-controls'));
    expect(footer).toContainElement(screen.getByTestId('rows-per-page-controls'));
    expect(footer).toContainElement(screen.getByTestId('reduction-history-page-selector'));
    expect(footer).toContainElement(screen.getByTestId('reduction-history-displayed-rows'));
    expect(within(footer).getByRole('navigation', { name: 'Reduction history pages' })).toBeInTheDocument();
    expect(within(footer).getByRole('button', { name: 'page 1' })).toHaveAttribute('aria-current', 'page');
    expect(within(footer).getByRole('button', { name: 'page 1' })).toHaveStyle({
      height: `${JOB_TABLE_CHROME_CONTROL_HEIGHT}px`,
    });
    expect(within(footer).getByRole('button', { name: '25 rows per page' })).toHaveStyle({
      height: `${JOB_TABLE_CHROME_CONTROL_HEIGHT}px`,
    });
    expect(within(footer).getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: 'View as user' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByText('Filename'));

    expect(openFilters).toHaveBeenCalledTimes(1);
    expect(handleSort).toHaveBeenCalledWith('filename');
  });

  test('changes page size and pages without producing an invalid offset', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();
    const handleRowsPerPageChange = vi.fn();

    renderTable({
      handlePageChange,
      handleRowsPerPageChange,
    });

    await waitForLoadedJobs();
    expect(fiaApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=25&offset=0'));

    expect(screen.queryByRole('button', { name: '10 rows per page' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '50 rows per page' }));
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));

    expect(handleRowsPerPageChange).toHaveBeenCalledWith(50, 0);
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  test('shows active filters in the toolbar and supports removing one or clearing all', async () => {
    const user = userEvent.setup();
    const handleFiltersChange = vi.fn();
    const handlePageChange = vi.fn();
    const setAsUser = vi.fn();

    renderTable({
      filters: {
        title: 'Polymer',
        job_state_in: ['SUCCESSFUL', 'ERROR'],
      },
      asUser: true,
      filtersApplied: true,
      handleFiltersChange,
      handlePageChange,
      setAsUser,
    });

    const filterChips = screen.getByTestId('active-filter-chips');
    const filtersButton = screen.getByRole('button', { name: 'Filters' });
    expect(within(filterChips).getByText('Title: Polymer')).toBeInTheDocument();
    expect(within(filterChips).getByText('State: SUCCESSFUL, ERROR')).toBeInTheDocument();
    expect(within(filterChips).getByText('View as user')).toBeInTheDocument();
    expect(within(filterChips).getByText('Title: Polymer').closest('.MuiChip-root')).toHaveStyle({ height: '28px' });
    expect(filterChips.compareDocumentPosition(filtersButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByLabelText('Remove filter Title: Polymer'));
    expect(handleFiltersChange).toHaveBeenCalledWith({ job_state_in: ['SUCCESSFUL', 'ERROR'] });

    await user.click(screen.getByLabelText('Remove filter View as user'));
    expect(setAsUser).toHaveBeenCalledWith(false);
    expect(handlePageChange).toHaveBeenCalledWith(0);

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(handleFiltersChange).toHaveBeenLastCalledWith({});
    expect(setAsUser).toHaveBeenLastCalledWith(false);
    expect(handlePageChange).toHaveBeenLastCalledWith(0);
  });

  test('selects rows and performs bulk resubmit and download actions', async () => {
    const user = userEvent.setup();

    renderTable();

    await waitForLoadedJobs();
    await user.click(screen.getByRole('button', { name: 'Select row 101' }));

    expect(screen.getByRole('button', { name: 'Resubmit (1)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download all (2)' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Download all (2)' }));
    await waitFor(() =>
      expect(fiaApi.post).toHaveBeenCalledWith(
        '/job/download-zip',
        { 101: ['first.nxs', 'second.nxs'] },
        expect.objectContaining({ responseType: 'blob' })
      )
    );

    await user.click(screen.getByRole('button', { name: 'Resubmit (1)' }));
    await waitFor(() => expect(fiaApi.post).toHaveBeenCalledWith('/job/101/resubmit'));
    expect(
      await screen.findByText('Resubmissions started successfully for all selected reductions')
    ).toBeInTheDocument();
  });

  test('selects and deselects every visible row', async () => {
    const user = userEvent.setup();

    renderTable();

    await waitForLoadedJobs();
    const selectAll = screen.getByRole('button', { name: 'Select all' });
    await user.click(selectAll);

    expect(screen.getByRole('button', { name: 'Deselect all' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deselect row 101' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deselect row 102' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deselect all' }));

    expect(screen.getByRole('button', { name: 'Select row 101' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select row 102' })).toBeInTheDocument();
  });

  test('shows the empty state after loading completes', async () => {
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      const requestUrl = String(url);
      if (requestUrl === '/jobs/runners') {
        return { data: {} };
      }
      if (requestUrl.includes('/count?')) {
        return { data: { count: 0 } };
      }
      return { data: [] };
    });

    const view = renderTable({ filtersApplied: true });

    expect(await screen.findByText('No reductions found', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('Try adjusting or clearing your filters.')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Reduction history rows' })).toHaveStyle({ height: '100%' });
    expect(screen.getByTestId('reduction-history-empty-state')).toHaveStyle({
      display: 'flex',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();

    view.rerender(<JobTable {...defaultProps} />);
    expect(screen.getByText('Reductions for LOQ will appear here once they are available.')).toBeInTheDocument();
  });
});
