import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ImatStackJobTree from './ImatStackJobTree';
import { fiaApi } from '../../lib/api';

import type { Job } from '../../lib/types';

vi.mock('../../lib/api', () => ({
  fiaApi: {
    get: vi.fn(),
  },
}));

const makeJob = (id: number, experimentNumber: number, runStart: string, filename = `IMAT${id}.raw`): Job => ({
  id,
  start: runStart,
  end: runStart,
  state: 'SUCCESSFUL',
  status_message: '',
  runner_image: 'imat:latest',
  type: 'JobType.REDUCTION',
  inputs: {},
  outputs: `/output/run-${id}`,
  stacktrace: '',
  script: { value: 'reduce()' },
  run: {
    experiment_number: experimentNumber,
    filename: `/archive/${filename}`,
    run_start: runStart,
    run_end: runStart,
    title: `Sample ${id}`,
    users: 'User',
    good_frames: 10,
    raw_frames: 10,
    instrument_name: 'IMAT',
  },
});

const renderTree = (
  overrides: Partial<React.ComponentProps<typeof ImatStackJobTree>> = {}
): ReturnType<typeof render> =>
  render(
    <ImatStackJobTree selectedJobId={null} selectedJob={null} onSelectJob={vi.fn()} onClear={vi.fn()} {...overrides} />
  );

describe('ImatStackJobTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('groups jobs by experiment, sorts newest first, and highlights the selected stack', async () => {
    const user = userEvent.setup();
    const olderJob = makeJob(10, 1234, '2026-01-01T10:00:00Z');
    const selectedJob = makeJob(11, 1234, '2026-01-02T10:00:00Z');
    const otherExperiment = makeJob(12, 9999, '2025-12-01T10:00:00Z');
    vi.mocked(fiaApi.get).mockResolvedValue({ data: [olderJob, selectedJob, otherExperiment] });

    renderTree({ selectedJobId: selectedJob.id, selectedJob });

    expect(fiaApi.get).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /IMAT11/i })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('button', { name: /Experiment 9999/ });

    const selectedStack = await screen.findByRole('button', { name: /IMAT11/i });
    expect(selectedStack).toHaveAttribute('aria-current', 'true');
    expect(screen.getAllByRole('button', { name: /Experiment/i })[0]).toHaveTextContent('Experiment 1234');

    const experimentGroup = screen.getByRole('button', { name: /Experiment 1234/i });
    const jobButtons = within(document.getElementById('imat-experiment-1234')!).getAllByRole('button');
    expect(experimentGroup).toHaveAttribute('aria-expanded', 'true');
    expect(jobButtons[0]).toHaveTextContent('IMAT11');
    expect(jobButtons[1]).toHaveTextContent('IMAT10');
  });

  test('waits for an explicit selection after loading the newest stacks', async () => {
    const user = userEvent.setup();
    const onSelectJob = vi.fn();
    const newestJob = makeJob(22, 2000, '2026-02-02T10:00:00Z');
    vi.mocked(fiaApi.get).mockResolvedValue({ data: [newestJob, makeJob(21, 2000, '2026-02-01T10:00:00Z')] });

    renderTree({ onSelectJob });
    expect(fiaApi.get).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Experiment 2000/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search' }));

    const experiment = await screen.findByRole('button', { name: /Experiment 2000/ });
    expect(experiment).toHaveAttribute('aria-expanded', 'false');
    expect(onSelectJob).not.toHaveBeenCalled();
    await user.click(experiment);
    await user.click(screen.getByRole('button', { name: /IMAT22/ }));
    expect(onSelectJob).toHaveBeenCalledExactlyOnceWith(newestJob);
  });

  test.each([null, makeJob(1, 1234, '2026-01-01T10:00:00Z')])(
    'allows clearing a linked stack before running a search, including while it is loading',
    async (selectedJob) => {
      const user = userEvent.setup();
      const onClear = vi.fn();
      renderTree({ selectedJobId: 1, selectedJob, onClear });
      expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(fiaApi.get).not.toHaveBeenCalled();
    }
  );

  test('queries full history by exact experiment number and filename', async () => {
    const user = userEvent.setup();
    vi.mocked(fiaApi.get).mockResolvedValue({ data: [] });
    renderTree();
    expect(fiaApi.get).not.toHaveBeenCalled();

    await user.type(screen.getByRole('spinbutton', { name: 'Stack search value' }), '12345');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const lastOptions = vi.mocked(fiaApi.get).mock.calls.at(-1)?.[1];
      expect(lastOptions?.params).toMatchObject({
        filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'], experiment_number_in: [12345] }),
      });
    });

    await user.click(screen.getByRole('combobox', { name: 'Search by' }));
    await user.click(screen.getByRole('option', { name: 'Run/file' }));
    expect(screen.getByRole('textbox', { name: 'Stack search value' })).toHaveValue('');
    await user.type(screen.getByRole('textbox', { name: 'Stack search value' }), 'IMAT00042');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const lastOptions = vi.mocked(fiaApi.get).mock.calls.at(-1)?.[1];
      expect(lastOptions?.params).toMatchObject({
        filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'], filename: 'IMAT00042' }),
      });
    });
  });

  test('loads another page and removes duplicate jobs', async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 26 }, (_, index) =>
      makeJob(100 - index, 3000, `2026-01-${String(26 - index).padStart(2, '0')}T10:00:00Z`)
    );
    const nextJob = makeJob(200, 4000, '2025-01-01T10:00:00Z');
    vi.mocked(fiaApi.get)
      .mockResolvedValueOnce({ data: firstPage })
      .mockResolvedValueOnce({ data: [firstPage[0], nextJob] });

    renderTree();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: 'Load more' }));

    await waitFor(() => {
      expect(vi.mocked(fiaApi.get).mock.calls[1][1]?.params).toMatchObject({ offset: 25 });
      expect(screen.getByRole('button', { name: /Experiment 4000/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Experiment 3000/i }));
    expect(screen.getAllByRole('button', { name: /IMAT100/i })).toHaveLength(1);
  });

  test('shows a retry action when loading fails', async () => {
    const user = userEvent.setup();
    vi.mocked(fiaApi.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });

    renderTree();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Unable to load IMAT stacks.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No successful IMAT stacks found.')).toBeInTheDocument();
    expect(fiaApi.get).toHaveBeenCalledTimes(2);
  });

  test.each(['Experiment number', 'Run/file'])(
    'loads all stacks for a blank %s search, supports repeating it, and clears without fetching',
    async (searchType) => {
      const user = userEvent.setup();
      vi.mocked(fiaApi.get).mockResolvedValue({ data: [makeJob(1, 1234, '2026-01-01T10:00:00Z')] });
      renderTree();
      expect(fiaApi.get).not.toHaveBeenCalled();
      expect(screen.queryByText('No successful IMAT stacks found.')).not.toBeInTheDocument();
      await user.click(screen.getByRole('combobox', { name: 'Search by' }));
      await user.click(screen.getByRole('option', { name: searchType }));
      await user.type(screen.getByLabelText('Stack search value'), '   {Enter}');
      await screen.findByRole('button', { name: /Experiment 1234/ });
      expect(fiaApi.get).toHaveBeenCalledWith('/instrument/IMAT/jobs', {
        signal: expect.any(AbortSignal),
        params: {
          limit: 26,
          offset: 0,
          order_by: 'run_start',
          order_direction: 'desc',
          include_run: true,
          filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'] }),
        },
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Search' }));
      await screen.findByRole('button', { name: /Experiment 1234/ });
      expect(fiaApi.get).toHaveBeenCalledTimes(2);
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      expect(screen.queryByRole('button', { name: /Experiment 1234/ })).not.toBeInTheDocument();
      expect(screen.getByLabelText('Stack search value')).toHaveValue(searchType === 'Experiment number' ? null : '');
      expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
      expect(fiaApi.get).toHaveBeenCalledTimes(2);
    }
  );
});
