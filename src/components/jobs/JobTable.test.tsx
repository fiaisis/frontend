import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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
  showAsUserControl: true,
  rowsPerPage: 10 as const,
  handleRowsPerPageChange: vi.fn(),
  filters: {} as JobQueryFilters,
  handleSort: vi.fn(),
  orderBy: 'start',
  orderDirection: 'desc' as const,
  filtersApplied: false,
  openFilters: vi.fn(),
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
    const setAsUser = vi.fn();

    renderTable({ handleSort, openFilters, setAsUser, filtersApplied: true });

    await waitForLoadedJobs();
    expect(screen.getByText('Second reduction')).toBeInTheDocument();
    expect(fiaApi.get).toHaveBeenCalledWith(expect.stringContaining('/instrument/LOQ/jobs?limit=10&offset=0'));
    expect(fiaApi.get).toHaveBeenCalledWith('/instrument/LOQ/jobs/count?filters={}');
    expect(fiaApi.get).toHaveBeenCalledWith('/jobs/runners');
    expect(screen.getByText('Showing 1-10 of 35 reductions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('button', { name: 'View as user' }));
    await user.click(screen.getByText('Filename'));

    expect(openFilters).toHaveBeenCalledTimes(1);
    expect(setAsUser).toHaveBeenCalledWith(true);
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
    expect(fiaApi.get).toHaveBeenCalledWith(expect.stringContaining('limit=10&offset=0'));

    await user.click(screen.getByRole('button', { name: '25 rows per page' }));
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    expect(handleRowsPerPageChange).toHaveBeenCalledWith(25, 0);
    expect(handlePageChange).toHaveBeenCalledWith(1);
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

    renderTable();

    expect(await screen.findByText('No reductions found', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();
  });
});
