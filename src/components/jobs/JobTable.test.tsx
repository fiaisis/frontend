import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  JOB_TABLE_CHROME_CONTROL_HEIGHT,
  JOB_TABLE_CHROME_ROW_MIN_HEIGHT,
  JOB_TABLE_FOOTER_CONTROL_WIDTH,
  JOB_TABLE_HEADER_HEIGHT,
  JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
} from './constants';
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
    onOpenDetails,
  }: {
    job: Job;
    isSelected: boolean;
    toggleSelection: (jobId: number) => void;
    onOpenDetails: (job: Job) => void;
  }) => (
    <tr>
      <td>
        <button type="button" onClick={() => toggleSelection(job.id)}>
          {isSelected ? `Deselect row ${job.id}` : `Select row ${job.id}`}
        </button>
        <button type="button" onClick={() => onOpenDetails(job)}>
          {`Open row ${job.id}`}
        </button>
        <span>{job.run.title}</span>
      </td>
    </tr>
  ),
  ReductionDetailsModal: ({
    open,
    jobId,
    job,
    loading,
    error,
    onRetry,
    onClose,
  }: {
    open: boolean;
    jobId: number | null;
    job: Job | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Reduction details">
        <span>{job ? `Detail job ${job.id}` : loading ? `Loading job ${jobId}` : error}</span>
        {error && (
          <button type="button" onClick={onRetry}>
            Retry details
          </button>
        )}
        <button type="button" onClick={onClose}>
          Close details
        </button>
      </div>
    ) : null,
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
  selectedReductionId: null as number | null,
  openReductionDetails: vi.fn(),
  closeReductionDetails: vi.fn(),
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
    const openReductionDetails = vi.fn();

    renderTable({
      handleSort,
      openFilters,
      openReductionDetails,
      filtersApplied: true,
      configControl: (
        <button type="button" disabled>
          Edit config
        </button>
      ),
    });

    const initiallyDisabledSelectAll = screen.getByRole('button', { name: 'Select all' });
    expect(initiallyDisabledSelectAll).toBeDisabled();
    expect(initiallyDisabledSelectAll).toHaveStyle({
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
    });

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
    const headerColumnWidths = Array.from(tableHeader.querySelectorAll('col')).map((column) => column.style.width);
    const bodyColumnWidths = Array.from(tableScroll.querySelectorAll('col')).map((column) => column.style.width);
    expect(headerColumnWidths).toEqual(['14%', '12%', '12%', '12%', '12%', '12%', '22%', '4%']);
    expect(bodyColumnWidths).toEqual(headerColumnWidths);
    expect(screen.getByText('Title').closest('th')).toHaveAttribute('data-border-continuation', 'header-gutter');
    expect(screen.getByTestId('reduction-history-table-header-gutter')).toBeInTheDocument();
    expect(screen.getByText('Filename').closest('thead')).toHaveStyle({ height: `${JOB_TABLE_HEADER_HEIGHT}px` });

    const toolbar = screen.getByTestId('reduction-history-table-toolbar');
    const footer = screen.getByTestId('reduction-history-pagination-footer');
    const filtersButton = within(toolbar).getByRole('button', { name: 'Filters' });
    const editConfigButton = within(toolbar).getByRole('button', { name: 'Edit config' });
    const selectAllButton = within(toolbar).getByRole('button', { name: 'Select all' });
    const selectionActions = screen.getByTestId('reduction-history-selection-actions');
    const toolbarActions = screen.getByTestId('reduction-history-toolbar-actions');
    expect(toolbar).toHaveStyle({
      minHeight: `${JOB_TABLE_CHROME_ROW_MIN_HEIGHT}px`,
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
    });
    expect(footer).toHaveStyle({ minHeight: `${JOB_TABLE_CHROME_ROW_MIN_HEIGHT}px` });
    expect(selectAllButton).toHaveStyle({ height: `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px` });
    expect(selectAllButton).toHaveStyle({
      borderRadius: '0',
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
    });
    expect(selectAllButton).toHaveClass('MuiButton-outlined');
    expect(selectAllButton).not.toHaveClass('MuiButton-contained');
    expect(selectionActions).toHaveStyle({
      gap: '0px',
      borderRight: '1px solid #c7ced6',
    });
    expect(filtersButton).toHaveStyle({ height: `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px` });
    expect(filtersButton).toHaveStyle({
      borderRadius: '0',
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
    });
    expect(screen.getByTestId('reduction-history-config-control')).toHaveStyle({
      height: `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px`,
    });
    expect(toolbarActions).toHaveStyle({
      gap: '0px',
      borderLeft: '1px solid #c7ced6',
    });
    expect(editConfigButton).toBeDisabled();
    expect(editConfigButton).toHaveStyle({
      height: '100%',
      borderRadius: '0',
      borderLeft: '1px solid #c7ced6',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
      borderRightWidth: '0px',
    });
    expect(filtersButton.compareDocumentPosition(editConfigButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toolbar).not.toContainElement(screen.getByTestId('rows-per-page-controls'));
    expect(footer).toContainElement(screen.getByTestId('rows-per-page-controls'));
    expect(footer).toContainElement(screen.getByTestId('reduction-history-page-selector'));
    expect(footer).toContainElement(screen.getByTestId('reduction-history-displayed-rows'));
    expect(within(footer).getByRole('navigation', { name: 'Reduction history pages' })).toBeInTheDocument();
    expect(within(footer).getByRole('button', { name: 'page 1' })).toHaveAttribute('aria-current', 'page');
    expect(within(footer).getByRole('button', { name: 'page 1' })).toHaveStyle({
      width: `${JOB_TABLE_FOOTER_CONTROL_WIDTH}px`,
      height: `${JOB_TABLE_CHROME_CONTROL_HEIGHT}px`,
    });
    expect(within(footer).getByRole('button', { name: 'page 1' })).toHaveStyle({
      borderRadius: '0px',
    });
    expect(within(footer).getByRole('button', { name: 'page 1' })).toHaveStyle({
      backgroundColor: 'rgba(21, 101, 192, 0.1)',
    });
    expect(within(footer).getByRole('button', { name: '25 rows per page' })).toHaveStyle({
      width: `${JOB_TABLE_FOOTER_CONTROL_WIDTH}px`,
      height: `${JOB_TABLE_CHROME_CONTROL_HEIGHT}px`,
    });
    expect(within(footer).getByRole('button', { name: '25 rows per page' })).toHaveStyle({
      borderRadius: '0px',
    });
    expect(within(footer).getByRole('button', { name: '25 rows per page' })).toHaveStyle({
      backgroundColor: 'rgba(21, 101, 192, 0.1)',
    });
    expect(within(footer).getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: 'View as user' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByText('Filename'));
    await user.click(screen.getByRole('button', { name: 'Open row 101' }));

    expect(openFilters).toHaveBeenCalledTimes(1);
    expect(handleSort).toHaveBeenCalledWith('filename');
    expect(openReductionDetails).toHaveBeenCalledWith(101);
  });

  test('reuses table data for details and loads directly linked reductions outside the current page', async () => {
    const directJob = { ...jobs[0], id: 999, run: { ...jobs[0].run, title: 'Direct reduction' } };

    const firstView = renderTable({ selectedReductionId: 101 });
    await waitForLoadedJobs();
    expect(screen.getByText('Detail job 101')).toBeInTheDocument();
    expect(vi.mocked(fiaApi.get).mock.calls.some(([url]) => String(url) === '/job/101')).toBe(false);
    firstView.unmount();

    vi.clearAllMocks();
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      const requestUrl = String(url);
      if (requestUrl === '/jobs/runners') return { data: {} };
      if (requestUrl === '/job/999') return { data: directJob };
      if (requestUrl.includes('/count?')) return { data: { count: 35 } };
      return { data: jobs };
    });

    renderTable({ selectedReductionId: 999 });

    await waitFor(() => expect(screen.getByText('Detail job 999')).toBeInTheDocument());
    expect(fiaApi.get).toHaveBeenCalledWith('/job/999', expect.objectContaining({ signal: expect.anything() }));
  });

  test('shows a contained direct-link error and retries the detail request', async () => {
    const user = userEvent.setup();
    const directJob = { ...jobs[0], id: 999, run: { ...jobs[0].run, title: 'Retried reduction' } };
    let detailAttempts = 0;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      const requestUrl = String(url);
      if (requestUrl === '/jobs/runners') return { data: {} };
      if (requestUrl.includes('/count?')) return { data: { count: 35 } };
      if (requestUrl === '/job/999') {
        detailAttempts += 1;
        if (detailAttempts === 1) throw new Error('Temporary detail failure');
        return { data: directJob };
      }
      return { data: jobs };
    });

    renderTable({ selectedReductionId: 999 });

    expect(
      await screen.findByText('The reduction details could not be loaded.', {}, { timeout: 3000 })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry details' }));

    expect(await screen.findByText('Detail job 999')).toBeInTheDocument();
    expect(detailAttempts).toBe(2);
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
    const filtersButton = screen.getByRole('button', { name: 'Filters (3 applied)' });
    expect(within(filterChips).getByText('Title: Polymer')).toBeInTheDocument();
    expect(within(filterChips).getByText('State: SUCCESSFUL, ERROR')).toBeInTheDocument();
    expect(within(filterChips).getByText('View as user')).toBeInTheDocument();
    expect(filterChips).toHaveStyle({ alignItems: 'center' });
    expect(within(filterChips).getByText('Title: Polymer').closest('.MuiChip-root')).toHaveStyle({
      height: '28px',
      borderRadius: '0',
    });
    expect(within(filtersButton).getByText('3')).toBeInTheDocument();
    expect(filtersButton).toHaveClass('MuiButton-outlined');
    expect(filtersButton).not.toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toHaveStyle({
      height: `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px`,
      borderRadius: '0',
      borderWidth: '0px',
    });
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
    expect(screen.getByRole('button', { name: 'Resubmit (1)' })).toHaveStyle({
      height: `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px`,
      borderRadius: '0',
      borderLeft: '1px solid #c7ced6',
      borderRightWidth: '0px',
    });
    expect(screen.getByRole('button', { name: 'Download all (2)' })).toHaveStyle({
      height: `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px`,
      borderRadius: '0',
      borderLeft: '1px solid #c7ced6',
      borderRightWidth: '0px',
    });
    expect(screen.getByRole('button', { name: 'Resubmit (1)' })).toHaveClass('MuiButton-outlined');
    expect(screen.getByRole('button', { name: 'Download all (2)' })).toHaveClass('MuiButton-outlined');

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
