import { Table, TableBody } from '@mui/material';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import Row from './Row';
import { fiaApi } from '../../lib/api';
import { Job } from '../../lib/types';

const analyticsEvent = vi.hoisted(() => vi.fn());

vi.mock('react-ga4', () => ({
  default: {
    event: analyticsEvent,
  },
}));

vi.mock('../../lib/api', () => ({
  fiaApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 42,
  start: '2026-01-01T10:00:00Z',
  end: '2026-01-01T10:05:00Z',
  state: 'SUCCESSFUL',
  status_message: '',
  runner_image: 'registry@mantid:6.9',
  type: 'JobType.REDUCTION',
  inputs: {
    wavelength: 4.5,
    normalise: true,
    optionalValue: null,
  },
  outputs: "['result.nxs', 'report.txt']",
  stacktrace: '',
  script: { value: 'reduce()' },
  run: {
    experiment_number: 12345,
    filename: '/data/LOQ00012345.raw',
    run_start: '2026-01-01T09:00:00Z',
    run_end: '2026-01-01T09:30:00Z',
    title: 'Polymer sample',
    users: 'Ada, Grace',
    good_frames: 1000,
    raw_frames: 1100,
    instrument_name: 'LOQ',
  },
  ...overrides,
});

const defaultRowProps = {
  index: 0,
  isSelected: false,
  toggleSelection: vi.fn(),
  resubmitJob: vi.fn(async () => undefined),
  refreshJobs: vi.fn(),
  mantidVersions: { 'mantid:6.9': 'Mantid 6.9' },
};

const renderRow = (job: Job = makeJob(), overrides: Partial<typeof defaultRowProps> = {}): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <Table>
        <TableBody>
          <Row job={job} {...defaultRowProps} {...overrides} />
        </TableBody>
      </Table>
    </MemoryRouter>
  );

describe('Row', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fiaApi.get).mockResolvedValue({ status: 200, data: 'file-content' });
    vi.mocked(fiaApi.post).mockResolvedValue({ status: 200, data: 'zip-content' });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('renders the summary and lets the user select the reduction from its status cell', async () => {
    const user = userEvent.setup();
    const toggleSelection = vi.fn();

    renderRow(makeJob(), { toggleSelection });

    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('LOQ00012345')).toBeInTheDocument();
    expect(screen.getByText('Polymer sample')).toBeInTheDocument();
    expect(screen.getByLabelText('Reduction state: SUCCESSFUL')).toBeInTheDocument();

    const statusIcon = screen.getByLabelText('Reduction state: SUCCESSFUL');
    fireEvent.mouseEnter(statusIcon.parentElement as HTMLElement);
    await user.click(screen.getByRole('checkbox', { name: 'Select reduction 42' }));

    expect(toggleSelection).toHaveBeenCalledWith(42);
  });

  test('expands successful reductions and supports viewers and downloads', async () => {
    const user = userEvent.setup();

    renderRow();
    await user.click(screen.getByRole('button', { name: 'expand row' }));

    expect(screen.getByText('[SUCCESS] Reduction performed successfully')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Reduction inputs' })).toBeInTheDocument();
    const runDetails = screen.getByRole('table', { name: 'Run details' });
    expect(within(runDetails).getByText('Mantid 6.9')).toBeInTheDocument();
    expect(within(runDetails).getByText('LOQ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Value editor/ })).toHaveAttribute(
      'href',
      '/reduction-history/LOQ/value-editor-42'
    );
    expect(screen.getByRole('link', { name: /Experiment viewer/ })).toHaveAttribute(
      'href',
      '/experiment-viewer/LOQ/12345'
    );
    expect(screen.getByText('result.nxs')).toBeInTheDocument();
    expect(screen.getByText('report.txt')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);
    expect(window.open).toHaveBeenCalledWith('/fia/data-viewer/view/LOQ/12345/result.nxs', '_blank');
    expect(analyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ label: 'View button', value: 42 }));

    await user.click(screen.getAllByRole('button', { name: 'Download' })[0]);
    await waitFor(() =>
      expect(fiaApi.get).toHaveBeenCalledWith(
        '/job/42/filename/result.nxs',
        expect.objectContaining({ responseType: 'blob' })
      )
    );

    await user.click(screen.getByRole('button', { name: 'Download all' }));
    await waitFor(() =>
      expect(fiaApi.post).toHaveBeenCalledWith(
        '/job/download-zip',
        { 42: ['result.nxs', 'report.txt'] },
        expect.objectContaining({ responseType: 'blob' })
      )
    );
  });

  test('resubmits a reduction and refreshes the table after the completion delay', async () => {
    vi.useFakeTimers();
    const resubmitJob = vi.fn(async () => undefined);
    const refreshJobs = vi.fn();

    renderRow(makeJob(), { resubmitJob, refreshJobs });
    fireEvent.click(screen.getByRole('button', { name: 'expand row' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resubmit' }));
    });
    expect(resubmitJob).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(refreshJobs).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Resubmit started successfully for reduction 42')).toBeInTheDocument();
  });

  test('shows stacktrace output for failed reductions', async () => {
    const user = userEvent.setup();
    const failedJob = makeJob({
      state: 'ERROR',
      status_message: 'Algorithm failed',
      stacktrace: 'Traceback: invalid workspace',
      outputs: '',
    });

    renderRow(failedJob);
    await user.click(screen.getByRole('button', { name: 'expand row' }));

    expect(screen.getByText('[ERROR] Algorithm failed')).toBeInTheDocument();
    expect(screen.getByText('Stacktrace output')).toBeInTheDocument();
    expect(screen.getByText('Traceback: invalid workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download all' })).toBeDisabled();
  });

  test('offers the stack viewer instead of the experiment viewer for successful IMAT jobs', async () => {
    const user = userEvent.setup();
    const imatJob = makeJob({
      run: {
        ...makeJob().run,
        instrument_name: 'IMAT',
      },
    });

    renderRow(imatJob);
    await user.click(screen.getByRole('button', { name: 'expand row' }));

    expect(screen.getByRole('link', { name: /Stack viewer/ })).toHaveAttribute(
      'href',
      '/reduction-history/IMAT/stack-viewer?jobId=42&experiment=12345&instrument=IMAT'
    );
    expect(screen.queryByRole('link', { name: /Experiment viewer/ })).not.toBeInTheDocument();
  });
});
