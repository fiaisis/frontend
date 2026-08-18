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
    <ImatStackJobTree autoSelect={false} selectedJobId={null} selectedJob={null} onSelectJob={vi.fn()} {...overrides} />
  );

describe('ImatStackJobTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test('groups jobs by experiment, sorts newest first, and highlights the selected stack', async () => {
    const olderJob = makeJob(10, 1234, '2026-01-01T10:00:00Z');
    const selectedJob = makeJob(11, 1234, '2026-01-02T10:00:00Z');
    const otherExperiment = makeJob(12, 9999, '2025-12-01T10:00:00Z');
    vi.mocked(fiaApi.get).mockResolvedValue({ data: [olderJob, selectedJob, otherExperiment] });

    renderTree({ selectedJobId: selectedJob.id, selectedJob });

    const selectedStack = await screen.findByRole('button', { name: /IMAT11/i });
    expect(selectedStack).toHaveAttribute('aria-current', 'true');
    expect(screen.getAllByRole('button', { name: /Experiment/i })[0]).toHaveTextContent('Experiment 1234');

    const experimentGroup = screen.getByRole('button', { name: /Experiment 1234/i });
    const jobButtons = within(document.getElementById('imat-experiment-1234')!).getAllByRole('button');
    expect(experimentGroup).toHaveAttribute('aria-expanded', 'true');
    expect(jobButtons[0]).toHaveTextContent('IMAT11');
    expect(jobButtons[1]).toHaveTextContent('IMAT10');
  });

  test('automatically selects the newest stack only when no URL selection exists', async () => {
    const onSelectJob = vi.fn();
    const newestJob = makeJob(22, 2000, '2026-02-02T10:00:00Z');
    vi.mocked(fiaApi.get).mockResolvedValue({ data: [newestJob, makeJob(21, 2000, '2026-02-01T10:00:00Z')] });

    renderTree({ autoSelect: true, onSelectJob });

    await waitFor(() => expect(onSelectJob).toHaveBeenCalledWith(newestJob, true));
  });

  test('queries full history by exact experiment number and filename', async () => {
    const user = userEvent.setup();
    vi.mocked(fiaApi.get).mockResolvedValue({ data: [] });
    renderTree();
    await screen.findByText('No successful IMAT stacks found.');

    await user.type(screen.getByLabelText('Stack search value'), '12345');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const lastOptions = vi.mocked(fiaApi.get).mock.calls.at(-1)?.[1];
      expect(lastOptions?.params.filters).toBe(
        JSON.stringify({ job_state_in: ['SUCCESSFUL'], experiment_number_in: [12345] })
      );
    });

    await user.click(screen.getByRole('combobox', { name: 'Search by' }));
    await user.click(screen.getByRole('option', { name: 'Run/file' }));
    await user.clear(screen.getByLabelText('Stack search value'));
    await user.type(screen.getByLabelText('Stack search value'), 'IMAT00042');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const lastOptions = vi.mocked(fiaApi.get).mock.calls.at(-1)?.[1];
      expect(lastOptions?.params.filters).toBe(JSON.stringify({ job_state_in: ['SUCCESSFUL'], filename: 'IMAT00042' }));
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
    await user.click(await screen.findByRole('button', { name: 'Load more' }));

    await waitFor(() => {
      expect(vi.mocked(fiaApi.get).mock.calls[1][1]?.params.offset).toBe(25);
      expect(screen.getByRole('button', { name: /Experiment 4000/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Experiment 3000/i }));
    expect(screen.getAllByRole('button', { name: /IMAT100/i })).toHaveLength(1);
  });

  test('shows a retry action when loading fails', async () => {
    const user = userEvent.setup();
    vi.mocked(fiaApi.get).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });

    renderTree();
    expect(await screen.findByText('Unable to load IMAT stacks.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No successful IMAT stacks found.')).toBeInTheDocument();
    expect(fiaApi.get).toHaveBeenCalledTimes(2);
  });
});
