import { createTheme, ThemeProvider } from '@mui/material';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import LiveValueEditor from './LiveValueEditor';
import ValueEditor from './ValueEditor';
import { fiaApi } from '../lib/api';

vi.mock('@monaco-editor/react', () => ({ default: () => <div data-testid="mock-editor" /> }));
vi.mock('../lib/api', () => ({ fiaApi: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../lib/plottingServiceAPI', () => ({ fetchLiveDataInstruments: async () => ['LOQ'] }));
vi.mock('../lib/useAvailablePluginHeight', () => ({
  useAvailablePluginHeight: () => ({ rootRef: { current: null }, availableHeight: '800px' }),
}));
vi.mock('../components/jobs/InstrumentSelector', () => ({ default: () => null }));
vi.mock('../components/experimentViewer/LiveLogViewer', () => ({ LiveLogViewer: () => null }));

const filename = '/data/LOQ & scan #1.raw';

const CurrentLocation = (): React.ReactElement => {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname + location.search}</output>;
};

const renderEditor = async (live = false, mode: 'light' | 'dark' = 'light'): Promise<void> => {
  await act(async () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode } })}>
        <MemoryRouter initialEntries={[live ? '/live-data/LOQ/edit-script' : '/reduction-history/LOQ/value-editor-42']}>
          <CurrentLocation />
          <Route
            path={
              live ? '/live-data/:instrumentName/edit-script' : '/reduction-history/:instrumentName/value-editor-:jobId'
            }
          >
            {live ? <LiveValueEditor /> : <ValueEditor />}
          </Route>
        </MemoryRouter>
      </ThemeProvider>
    );
  });
};

const rerun = async (): Promise<void> => {
  const button = screen.getByRole('button', { name: 'Rerun with changes' });
  expect(button).toBeEnabled();
  await act(async () => fireEvent.click(button));
  await act(async () => vi.advanceTimersByTimeAsync(2000));
};

describe('editor notifications', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/jobs/runners') return { data: { runner: '6.9' } };
      if (url === '/job/42') {
        return { data: { script: { value: 'reduce()' }, run: { instrument_name: 'LOQ', filename } } };
      }
      if (url === '/live-data/LOQ/script') return { data: 'print("live")' };
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.mocked(fiaApi.post).mockResolvedValue({ data: 314 });
    vi.mocked(fiaApi.put).mockResolvedValue({ data: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test.each(['light', 'dark'] as const)(
    'keeps the rerun link available and opens the new reduction in %s mode',
    async (mode) => {
      await renderEditor(false, mode);
      await rerun();

      expect(fiaApi.post).toHaveBeenCalledWith('/job/rerun', {
        job_id: '42',
        runner_image: 'ghcr.io/fiaisis/mantid@runner',
        script: 'reduce()',
      });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Rerun started successfully for reduction 314.');
      const link = within(alert).getByRole('link', { name: 'View reduction' });
      const destination = `/reduction-history/LOQ?${new URLSearchParams({
        filters: JSON.stringify({ filename }),
        reductionId: '314',
      })}`;
      expect(link).toHaveAttribute('href', destination);

      await act(async () => vi.advanceTimersByTimeAsync(6000));
      fireEvent.click(document.body);
      expect(alert).toBeVisible();
      fireEvent.click(link);
      expect(screen.getByTestId('current-location').textContent).toBe(destination);
    }
  );

  test('dismisses a successful rerun notification with its close button', async () => {
    await renderEditor();
    await rerun();

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Close' }));
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('clears the previous rerun link when another rerun fails and hides the error after the timeout', async () => {
    const error = new Error('Rerun unavailable');
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderEditor();
    await rerun();
    expect(screen.getByRole('link', { name: 'View reduction' })).toBeInTheDocument();

    vi.mocked(fiaApi.post).mockRejectedValueOnce(error);
    await rerun();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Rerun could not be started for 42');
    expect(within(alert).queryByRole('link')).not.toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith('Failed to rerun job:', error);

    await act(async () => vi.advanceTimersByTimeAsync(5000));
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('links to the new reduction using the route instrument when run metadata is missing', async () => {
    vi.mocked(fiaApi.get).mockImplementation(async (url) =>
      url === '/jobs/runners' ? { data: { runner: '6.9' } } : { data: { script: { value: 'reduce()' } } }
    );
    await renderEditor();
    await rerun();

    expect(screen.getByRole('link', { name: 'View reduction' })).toHaveAttribute(
      'href',
      '/reduction-history/LOQ?reductionId=314'
    );
  });

  test.each([true, false])('shows a dismissible live script save notification when success is %s', async (success) => {
    const error = new Error('Save unavailable');
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    if (!success) vi.mocked(fiaApi.put).mockRejectedValueOnce(error);
    await renderEditor(true);

    const save = screen.getByRole('button', { name: 'Save script' });
    expect(save).toBeEnabled();
    await act(async () => fireEvent.click(save));

    expect(fiaApi.put).toHaveBeenCalledWith('/live-data/LOQ/script', { value: 'print("live")' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      success ? 'Script for LOQ updated successfully' : 'Failed to update script for LOQ'
    );
    if (!success) expect(logError).toHaveBeenCalledWith('Failed to update live data script:', error);

    fireEvent.click(within(alert).getByRole('button', { name: 'Close' }));
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
