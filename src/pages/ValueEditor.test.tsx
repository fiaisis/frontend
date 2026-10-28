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

describe('value editor runners', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Leave the rerun pending: these tests verify the request, not the delayed success notification.
    vi.mocked(fiaApi.post).mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test.each([
    ['IMAT', '/jobs/runners/mantidimaging', 'ghcr.io/fiaisis/mantidimaging', 'Mantid Imaging'],
    ['imat', '/jobs/runners/mantidimaging', 'ghcr.io/fiaisis/mantidimaging', 'Mantid Imaging'],
    ['LOQ', '/jobs/runners', 'ghcr.io/fiaisis/mantid', 'Mantid'],
  ])('uses the correct runner endpoint, names and image for %s', async (instrument, endpoint, repository, name) => {
    const user = userEvent.setup();
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') {
        return { data: { script: { value: 'reduce()' }, run: { instrument_name: instrument } } };
      }
      if (url === endpoint) return { data: { 'sha256:first': '3.1.1', 'sha256:second': '3.1.0' } };
      throw new Error(`Unexpected request: ${url}`);
    });

    renderEditor(instrument);

    const selectorLabel = name === 'Mantid Imaging' ? 'Mantid Imaging version' : 'Runner version';
    const selector = screen.getByRole('combobox', { name: selectorLabel });
    await waitFor(() => expect(selector).toHaveTextContent(`${name} 3.1.1`));
    expect(fiaApi.get).toHaveBeenCalledWith(endpoint);
    expect(fiaApi.get).not.toHaveBeenCalledWith(
      endpoint === '/jobs/runners' ? '/jobs/runners/mantidimaging' : '/jobs/runners'
    );

    await user.click(selector);
    await user.click(screen.getByRole('option', { name: `${name} 3.1.0` }));
    const editor = await screen.findByRole('textbox', { name: 'Reduction script' });
    await user.clear(editor);
    await user.type(editor, 'updated_reduction()');
    await user.click(screen.getByRole('button', { name: 'Rerun with changes' }));

    expect(fiaApi.post).toHaveBeenCalledWith('/job/rerun', {
      job_id: '42',
      runner_image: `${repository}@sha256:second`,
      script: 'updated_reduction()',
    });
  });

  test.each([[{}], [[]], [null]])(
    'disables reruns when Mantid Imaging returns no usable versions (%j)',
    async (data) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(fiaApi.get).mockImplementation(async (url) =>
        url === '/job/42' ? { data: { script: { value: 'reduce()' } } } : { data }
      );

      renderEditor('IMAT');

      await screen.findByRole('textbox', { name: 'Reduction script' });
      expect(screen.getByRole('combobox', { name: 'Mantid Imaging version' })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Rerun with changes' })).toBeDisabled();
      expect(fiaApi.post).not.toHaveBeenCalled();
    }
  );

  test('disables reruns when the Mantid Imaging request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') return { data: { script: { value: 'reduce()' } } };
      throw new Error('Runner lookup failed');
    });

    renderEditor('IMAT');

    await screen.findByRole('textbox', { name: 'Reduction script' });
    expect(screen.getByRole('combobox', { name: 'Mantid Imaging version' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Rerun with changes' })).toBeDisabled();
  });

  test('clears the previous runner selection when switching to IMAT', async () => {
    let finishImaging!: (response: { data: Record<string, string> }) => void;
    const imagingResponse = new Promise<{ data: Record<string, string> }>((resolve) => {
      finishImaging = resolve;
    });
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') return { data: { script: { value: 'reduce()' } } };
      if (url === '/jobs/runners') return { data: { 'sha256:mantid': '6.9.0' } };
      return imagingResponse;
    });
    const history = renderEditor('LOQ');
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Mantid 6.9.0'));

    act(() => history.push('/reduction-history/IMAT/value-editor-42'));

    expect(screen.getByRole('combobox', { name: 'Mantid Imaging version' })).not.toHaveTextContent('6.9.0');
    expect(screen.getByRole('button', { name: 'Rerun with changes' })).toBeDisabled();
    await act(async () => finishImaging({ data: { 'sha256:imaging': '3.0.0' } }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Mantid Imaging 3.0.0');
    expect(screen.getByRole('button', { name: 'Rerun with changes' })).toBeEnabled();
  });

  test('ignores an old Mantid response after switching to IMAT', async () => {
    let finishMantid!: (response: { data: Record<string, string> }) => void;
    const mantidResponse = new Promise<{ data: Record<string, string> }>((resolve) => {
      finishMantid = resolve;
    });
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/job/42') return { data: { script: { value: 'reduce()' } } };
      if (url === '/jobs/runners') return mantidResponse;
      return { data: { 'sha256:imaging': '3.0.0' } };
    });
    const history = renderEditor('LOQ');

    act(() => history.push('/reduction-history/IMAT/value-editor-42'));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Mantid Imaging 3.0.0'));
    await act(async () => finishMantid({ data: { 'sha256:mantid': '6.9.0' } }));

    expect(screen.getByRole('combobox')).toHaveTextContent('Mantid Imaging 3.0.0');
    expect(screen.getByRole('combobox')).not.toHaveTextContent('6.9.0');
  });
});
