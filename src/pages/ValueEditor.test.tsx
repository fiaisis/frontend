import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ValueEditor from './ValueEditor';
import { fiaApi } from '../lib/api';

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="Reduction script" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

vi.mock('../lib/api', () => ({ fiaApi: { get: vi.fn(), post: vi.fn() } }));

vi.mock('../components/navigation/NavArrows', () => ({ default: () => <nav aria-label="breadcrumb" /> }));

vi.mock('../lib/useAvailablePluginHeight', () => ({
  useAvailablePluginHeight: () => ({ rootRef: { current: null }, availableHeight: '800px' }),
}));

const renderEditor = (instrument: string): ReturnType<typeof createMemoryHistory> => {
  const history = createMemoryHistory({ initialEntries: [`/reduction-history/${instrument}/value-editor-42`] });
  render(
    <Router history={history}>
      <Route path="/reduction-history/:instrumentName/value-editor-:jobId">
        <ValueEditor />
      </Route>
    </Router>
  );
  return history;
};

const mantidEndpoint = '/jobs/runners';
const imagingEndpoint = '/jobs/runners/mantidimaging';
const mantidRepository = 'ghcr.io/fiaisis/mantid';
const imagingRepository = 'ghcr.io/fiaisis/mantidimaging';
const mantidVersions = { 'sha256:mantid-newer': '6.15.0', 'sha256:shared': '6.14.0' };
const imagingVersions = { 'sha256:imaging-newer': '3.2.0', 'sha256:shared': '3.1.0' };
const mantidLabels = ['Mantid 6.15.0', 'Mantid 6.14.0'];
const imagingLabels = ['Mantid Imaging 3.2.0', 'Mantid Imaging 3.1.0'];
const jobData = { script: { value: 'reduce()' } };

const runnerSelect = (): HTMLElement => screen.getByRole('combobox', { name: 'Runner version' });
const rerunButton = (): HTMLElement => screen.getByRole('button', { name: 'Rerun with changes' });

const mockJob = (runnerImage?: string | null): void => {
  vi.mocked(fiaApi.get).mockImplementation(async (url) => {
    if (url === '/job/42') return { data: { ...jobData, runner_image: runnerImage } };
    if (url === mantidEndpoint) return { data: mantidVersions };
    if (url === imagingEndpoint) return { data: imagingVersions };
    throw new Error(`Unexpected request: ${url}`);
  });
};

describe('value editor runners', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Leave the rerun pending while asserting the submitted request.
    vi.mocked(fiaApi.post).mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test.each([
    {
      instrument: 'IMAT',
      originalImage: `${mantidRepository}@sha256:shared`,
      originalLabel: mantidLabels[1],
      expectedOptions: [...mantidLabels, ...imagingLabels],
      chosenLabel: imagingLabels[1],
      chosenImage: `${imagingRepository}@sha256:shared`,
    },
    {
      instrument: 'imat',
      originalImage: `${imagingRepository}:3.1.0@sha256:shared`,
      originalLabel: imagingLabels[1],
      expectedOptions: [...imagingLabels, ...mantidLabels],
      chosenLabel: mantidLabels[1],
      chosenImage: `${mantidRepository}@sha256:shared`,
    },
  ])(
    'selects $originalLabel for $instrument and reruns with the chosen family',
    async ({ instrument, originalImage, originalLabel, expectedOptions, chosenLabel, chosenImage }) => {
      const user = userEvent.setup();
      mockJob(originalImage);
      renderEditor(instrument);

      await waitFor(() => expect(runnerSelect()).toHaveTextContent(originalLabel));
      await user.click(runnerSelect());
      const chosenOption = await screen.findByRole('option', { name: chosenLabel });
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(expectedOptions);
      await user.click(chosenOption);

      const editor = screen.getByRole('textbox', { name: 'Reduction script' });
      await user.clear(editor);
      await user.type(editor, 'updated_reduction()');
      await user.click(rerunButton());

      expect(fiaApi.post).toHaveBeenCalledWith('/job/rerun', {
        job_id: '42',
        runner_image: chosenImage,
        script: 'updated_reduction()',
      });
    }
  );

  test('offers Mantid versions for other instruments and defaults to the first listed version', async () => {
    const user = userEvent.setup();
    mockJob(`${mantidRepository}@sha256:shared`);
    renderEditor('LOQ');

    await waitFor(() => expect(runnerSelect()).toHaveTextContent(mantidLabels[0]));
    await user.click(runnerSelect());
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(mantidLabels);
    expect(vi.mocked(fiaApi.get).mock.calls.map(([url]) => url)).not.toContain(imagingEndpoint);
  });

  test.each([
    [mantidLabels[0], `${mantidRepository}@sha256:unlisted`],
    [mantidLabels[0], `${mantidRepository}:6.14.0`],
    [imagingLabels[0], `${imagingRepository}@sha256:unlisted`],
    [imagingLabels[0], 'ghcr.io/fiaisis/mantid-custom@sha256:shared'],
    [imagingLabels[0], null],
    [imagingLabels[0], undefined],
  ])('defaults to %s for original image %s', async (expectedVersion, runnerImage) => {
    mockJob(runnerImage);
    renderEditor('IMAT');

    await waitFor(() => expect(runnerSelect()).toHaveTextContent(expectedVersion));
    expect(rerunButton()).toBeEnabled();
  });

  test.each([
    ['empty', {}],
    ['malformed', []],
    ['unavailable', new Error('Runner lookup failed')],
  ])('requires an explicit selection when the preferred catalog is %s', async (_status, catalog) => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') return { data: { ...jobData, runner_image: `${imagingRepository}@sha256:shared` } };
      if (url === mantidEndpoint) return { data: mantidVersions };
      if (catalog instanceof Error) throw catalog;
      return { data: catalog };
    });
    renderEditor('IMAT');

    await waitFor(() => expect(runnerSelect()).toHaveTextContent('Choose a runner version'));
    expect(rerunButton()).toBeDisabled();
    await user.click(runnerSelect());
    await user.click(screen.getByRole('option', { name: mantidLabels[0] }));
    expect(rerunButton()).toBeEnabled();
  });

  test('disables reruns when neither catalog returns usable versions', async () => {
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') return { data: jobData };
      if (url === mantidEndpoint) return { data: { 'invalid-digest': '6.15.0' } };
      return { data: { 'sha256:shared': null } };
    });
    renderEditor('IMAT');

    await screen.findByRole('textbox', { name: 'Reduction script' });
    expect(runnerSelect()).toHaveAttribute('aria-disabled', 'true');
    expect(rerunButton()).toBeDisabled();
  });

  test('disables reruns when the job cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') throw new Error('Job lookup failed');
      return { data: url === mantidEndpoint ? mantidVersions : imagingVersions };
    });
    renderEditor('IMAT');

    await screen.findByRole('textbox', { name: 'Reduction script' });
    expect(runnerSelect()).toHaveAttribute('aria-disabled', 'true');
    expect(rerunButton()).toBeDisabled();
  });

  test('keeps the explicit selection when the preferred catalog arrives later', async () => {
    let finishMantid!: (response: { data: typeof mantidVersions }) => void;
    const mantidResponse = new Promise<{ data: typeof mantidVersions }>((resolve) => {
      finishMantid = resolve;
    });
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') return { data: { ...jobData, runner_image: `${mantidRepository}@sha256:shared` } };
      if (url === mantidEndpoint) return mantidResponse;
      return { data: imagingVersions };
    });
    const user = userEvent.setup();
    renderEditor('IMAT');

    await waitFor(() => expect(runnerSelect()).toHaveTextContent('Choose a runner version'));
    await user.click(runnerSelect());
    await user.click(screen.getByRole('option', { name: imagingLabels[1] }));
    await act(async () => finishMantid({ data: mantidVersions }));

    expect(runnerSelect()).toHaveTextContent(imagingLabels[1]);
    expect(rerunButton()).toBeEnabled();
  });

  test('resets the script and runner on job navigation and ignores the previous catalog response', async () => {
    const nextJob = {
      data: { script: { value: 'next_reduction()' }, runner_image: `${mantidRepository}@sha256:shared` },
    };
    let finishNextJob!: (response: typeof nextJob) => void;
    const nextJobResponse = new Promise<typeof nextJob>((resolve) => {
      finishNextJob = resolve;
    });
    let finishPreviousMantid!: (response: { data: Record<string, string> }) => void;
    const previousMantidResponse = new Promise<{ data: Record<string, string> }>((resolve) => {
      finishPreviousMantid = resolve;
    });
    let isFirstMantidRequest = true;
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') return { data: { ...jobData, runner_image: `${imagingRepository}@sha256:shared` } };
      if (url === '/job/43') return nextJobResponse;
      if (url === mantidEndpoint) {
        const response = isFirstMantidRequest ? previousMantidResponse : { data: mantidVersions };
        isFirstMantidRequest = false;
        return response;
      }
      return { data: imagingVersions };
    });
    const user = userEvent.setup();
    const history = renderEditor('IMAT');

    await waitFor(() => expect(runnerSelect()).toHaveTextContent(imagingLabels[1]));
    await user.click(runnerSelect());
    await user.click(screen.getByRole('option', { name: imagingLabels[0] }));
    await user.type(screen.getByRole('textbox', { name: 'Reduction script' }), ' # edit');

    act(() => history.push('/reduction-history/IMAT/value-editor-43'));
    expect(runnerSelect()).toHaveAttribute('aria-disabled', 'true');
    expect(rerunButton()).toBeDisabled();
    await act(async () => finishNextJob(nextJob));
    await act(async () => finishPreviousMantid({ data: { 'sha256:shared': '6.1.0' } }));

    expect(runnerSelect()).toHaveTextContent(mantidLabels[1]);
    expect(screen.getByRole('textbox', { name: 'Reduction script' })).toHaveValue('next_reduction()');
    await user.click(rerunButton());
    expect(fiaApi.post).toHaveBeenCalledWith('/job/rerun', {
      job_id: '43',
      runner_image: `${mantidRepository}@sha256:shared`,
      script: 'next_reduction()',
    });
  });
});
