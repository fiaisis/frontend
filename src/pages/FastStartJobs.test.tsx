import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import FastStartJobs, { FAST_START_USER_VIEW_ENABLED } from './FastStartJobs';
import { fiaApi } from '../lib/api';
import { Job } from '../lib/types';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn((token: string) => {
    if (token === 'staff-token') {
      return { role: 'staff' };
    }
    return { role: 'user' };
  }),
}));

vi.mock('../lib/api', () => ({
  fiaApi: {
    get: vi.fn(),
  },
}));

const createFastStartJob = (overrides: Partial<Job> = {}): Job => ({
  id: 42,
  start: '2026-10-22T10:00:00Z',
  end: '2026-10-22T10:01:00Z',
  state: 'SUCCESSFUL',
  status_message: '',
  runner_image: 'ghcr.io/fiaisis/llsp:latest',
  type: 'JobType.FAST_START',
  inputs: {},
  outputs: JSON.stringify({ exit_code: 0, stdout: 'Hello from LLSP\n', stderr: '' }),
  stacktrace: '',
  script: { value: 'print("Hello from LLSP")' },
  run: null as unknown as Job['run'],
  ...overrides,
});

const renderFastStartJobs = (initialPath = '/fast-start-jobs', userViewEnabled?: boolean): void => {
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Route path="/fast-start-jobs">
          <FastStartJobs userViewEnabled={userViewEnabled} />
        </Route>
      </MemoryRouter>
    </LocalizationProvider>
  );
};

describe('FastStartJobs', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(fiaApi.get).mockImplementation((url: string) => {
      if (url.startsWith('/jobs/count')) {
        return Promise.resolve({ data: { count: 1 } });
      }
      if (url.startsWith('/jobs?')) {
        return Promise.resolve({ data: [createFastStartJob()] });
      }
      if (url.startsWith('/job/')) {
        return Promise.resolve({ data: createFastStartJob() });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test('defaults FAST_START_USER_VIEW_ENABLED to false', () => {
    expect(FAST_START_USER_VIEW_ENABLED).toBe(false);
  });

  test('renders fast start jobs table with Status, Job ID, Experiment number (N/A), Job start, and Job end columns', async () => {
    localStorage.setItem('scigateway:token', 'staff-token');
    localStorage.setItem('asUser', 'false');

    renderFastStartJobs('/fast-start-jobs');

    const headerTable = screen.getByRole('table', { name: 'Fast start jobs column headers' });
    expect(within(headerTable).getByText('Status')).toBeInTheDocument();
    expect(within(headerTable).getByText('Job ID')).toBeInTheDocument();
    expect(within(headerTable).getByText('Experiment number')).toBeInTheDocument();
    expect(within(headerTable).getByText('Job start')).toBeInTheDocument();
    expect(within(headerTable).getByText('Job end')).toBeInTheDocument();
    expect(within(headerTable).queryByText('Filename')).not.toBeInTheDocument();
    expect(within(headerTable).queryByText('Run start')).not.toBeInTheDocument();
    expect(within(headerTable).queryByText('Run end')).not.toBeInTheDocument();
    expect(within(headerTable).queryByText('Title')).not.toBeInTheDocument();

    const row = await screen.findByRole('row', { name: 'View job 42 details' });
    expect(within(row).getByLabelText('Job state: SUCCESSFUL')).toBeInTheDocument();
    expect(within(row).getByText('42')).toBeInTheDocument();
    expect(within(row).getByText('N/A')).toBeInTheDocument();
  });

  test('opens job details modal without title/subtitle and displays script, job details, and LLSP outputs', async () => {
    localStorage.setItem('scigateway:token', 'staff-token');
    localStorage.setItem('asUser', 'false');

    renderFastStartJobs('/fast-start-jobs');

    const row = await screen.findByRole('row', { name: 'View job 42 details' });
    fireEvent.click(row);

    const modal = await screen.findByTestId('fast-start-job-details-modal');
    expect(within(modal).getByText('[SUCCESS] Job completed successfully')).toBeInTheDocument();
    expect(within(modal).queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(within(modal).getByTestId('fast-start-job-script')).toHaveTextContent('print("Hello from LLSP")');

    const detailsTab = within(modal).queryByRole('tab', { name: 'Job details' });
    if (detailsTab) {
      fireEvent.click(detailsTab);
    }
    expect(within(modal).getByText('Fast start')).toBeInTheDocument();
    expect(within(modal).queryByText('Runner image:')).not.toBeInTheDocument();

    const outputsTab = within(modal).queryByRole('tab', { name: 'Job outputs' });
    if (outputsTab) {
      fireEvent.click(outputsTab);
    }
    expect(within(modal).getByText('Hello from LLSP')).toBeInTheDocument();

    const closeButton = within(modal).getByRole('button', { name: 'Close job details' });
    fireEvent.click(closeButton);
    expect(screen.queryByTestId('fast-start-job-details-modal')).not.toBeInTheDocument();
  });

  test('restricts fast start jobs when a non-staff user views the page or when staff enables "View as user"', async () => {
    localStorage.setItem('scigateway:token', 'user-token');

    renderFastStartJobs('/fast-start-jobs');

    expect(await screen.findByText('Fast start jobs are staff only')).toBeInTheDocument();
    expect(screen.getByText('Fast start jobs are currently only available to staff.')).toBeInTheDocument();

    cleanup();
    localStorage.setItem('scigateway:token', 'staff-token');
    localStorage.setItem('asUser', 'true');

    renderFastStartJobs('/fast-start-jobs');

    expect(await screen.findByText('Fast start jobs are unavailable in user view')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Fast start jobs are not yet associated with user accounts. Disable "View as user" to view them.'
      )
    ).toBeInTheDocument();
  });

  test('allows user view when userViewEnabled is true', async () => {
    localStorage.setItem('scigateway:token', 'user-token');

    renderFastStartJobs('/fast-start-jobs', true);

    expect(await screen.findByRole('row', { name: 'View job 42 details' })).toBeInTheDocument();
  });

  test('shows tailored filters dialog without Filename, Title, Instrument, Run start, or Run end', async () => {
    localStorage.setItem('scigateway:token', 'staff-token');
    localStorage.setItem('asUser', 'false');

    renderFastStartJobs('/fast-start-jobs');

    await screen.findByRole('row', { name: 'View job 42 details' });
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('View as user')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Job state')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Search')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Filename')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Title')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Run start after')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Run end after')).not.toBeInTheDocument();
  });
});
