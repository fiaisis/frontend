import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import LiveData from './LiveData';
import { instruments } from '../lib/instrumentData';
import { fetchLiveDataFiles, fetchLiveDataInstruments } from '../lib/plottingServiceAPI';
import { useLiveDataSSE } from '../lib/useLiveDataSSE';

vi.mock('../lib/plottingServiceAPI', () => ({
  fetchLiveDataFiles: vi.fn(),
  fetchLiveDataInstruments: vi.fn(),
}));

vi.mock('../lib/useLiveDataSSE', () => ({
  useLiveDataSSE: vi.fn((instrument: string | null) => ({
    isConnected: false,
    directory: instrument ? `/live/${instrument}` : null,
    changedFile: null,
    error: null,
  })),
}));

vi.mock('../lib/useAvailablePluginHeight', () => ({
  useAvailablePluginHeight: () => ({ rootRef: { current: null }, availableHeight: '800px' }),
}));

vi.mock('../components/experimentViewer/Viewer2D', () => ({
  default: ({ filepath, emptyTitle }: { filepath: string | null; emptyTitle?: string }) => (
    <div data-testid="live-viewer">{filepath ?? emptyTitle ?? 'Select a file'}</div>
  ),
}));

const renderLiveData = (path = '/live-data'): ReturnType<typeof createMemoryHistory> => {
  const history = createMemoryHistory({ initialEntries: [path] });
  render(
    <Router history={history}>
      <Route path="/live-data/:instrumentName?">
        <LiveData />
      </Route>
    </Router>
  );
  return history;
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(fetchLiveDataInstruments).mockResolvedValue(['MARI', 'MERLIN']);
  vi.mocked(fetchLiveDataFiles).mockResolvedValue([]);
});

afterEach(cleanup);

test('opens a generic live data page without selecting an instrument or fetching its files', () => {
  const history = renderLiveData();
  expect(history.location.pathname).toBe('/live-data');
  expect(screen.getByRole('button', { name: 'Instrument: Browse instruments' })).toBeEnabled();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByText('Select an instrument', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByTestId('live-viewer')).toHaveTextContent('Select an instrument to view live data');
  expect(fetchLiveDataInstruments).toHaveBeenCalledTimes(1);
  expect(fetchLiveDataFiles).not.toHaveBeenCalled();
  expect(useLiveDataSSE).toHaveBeenLastCalledWith(null, true);
});

test('browses the full instrument catalogue, selects an instrument and clears back to the generic page', async () => {
  const user = userEvent.setup();
  vi.mocked(fetchLiveDataFiles).mockResolvedValue(['loq.nxs']);
  const history = renderLiveData();

  await user.click(screen.getByRole('button', { name: 'Instrument: Browse instruments' }));
  expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  await user.click(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' }));
  expect(screen.getAllByRole('menuitem')).toHaveLength(instruments.length);
  await user.type(screen.getByPlaceholderText('Search for instrument'), 'LOQ');
  await user.click(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ }));

  await waitFor(() => expect(history.location.pathname).toBe('/live-data/LOQ'));
  expect(fetchLiveDataFiles).toHaveBeenCalledWith('LOQ');
  await waitFor(() => expect(screen.getByTestId('live-viewer')).toHaveTextContent('/live/LOQ/loq.nxs'));
  expect(within(screen.getByLabelText('breadcrumb')).getByText('LOQ')).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: 'Instrument: Browse instruments' })).toHaveTextContent(
    'Browse instruments'
  );

  await user.click(within(screen.getByLabelText('breadcrumb')).getByRole('link', { name: 'Live data viewer' }));
  expect(history.location.pathname).toBe('/live-data');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Live data files' })).not.toBeInTheDocument();
  expect(screen.getByTestId('live-viewer')).toHaveTextContent('Select an instrument to view live data');
  expect(useLiveDataSSE).toHaveBeenLastCalledWith(null, true);
});

test('preserves instrument deep links and canonicalises their casing', async () => {
  const history = renderLiveData('/live-data/mari');
  await waitFor(() => expect(history.location.pathname).toBe('/live-data/MARI'));
  expect(fetchLiveDataFiles).toHaveBeenCalledWith('MARI');
  expect(useLiveDataSSE).toHaveBeenLastCalledWith('MARI', true);
  expect(screen.getByRole('button', { name: 'Instrument: Browse instruments' })).toHaveTextContent(
    'Browse instruments'
  );
});

test('keeps the selected file when choosing the current instrument again', async () => {
  const user = userEvent.setup();
  vi.mocked(fetchLiveDataFiles).mockResolvedValue(['loq.nxs']);
  renderLiveData('/live-data/LOQ');
  await waitFor(() => expect(screen.getByTestId('live-viewer')).toHaveTextContent('/live/LOQ/loq.nxs'));

  await user.click(screen.getByRole('button', { name: 'Instrument: Browse instruments' }));
  await user.click(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' }));
  await user.type(screen.getByPlaceholderText('Search for instrument'), 'LOQ');
  await user.click(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ }));

  expect(screen.getByTestId('live-viewer')).toHaveTextContent('/live/LOQ/loq.nxs');
  expect(fetchLiveDataFiles).toHaveBeenCalledTimes(1);
});

test('uses live support from the API, including an empty supported list', async () => {
  const user = userEvent.setup();
  vi.mocked(fetchLiveDataInstruments).mockResolvedValue(['loq']);
  const history = renderLiveData();
  await user.click(screen.getByRole('button', { name: 'Instrument: Browse instruments' }));
  expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  expect(screen.getByRole('menuitem', { name: /LOQ\s/ })).toBeInTheDocument();
  expect(history.location.pathname).toBe('/live-data');
  cleanup();
  vi.mocked(fetchLiveDataInstruments).mockResolvedValue([]);
  renderLiveData();
  await user.click(screen.getByRole('button', { name: 'Instrument: Browse instruments' }));
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  expect(screen.getByText('No instruments found')).toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' }));
  expect(screen.getAllByRole('menuitem')).toHaveLength(instruments.length);
});

test('uses the confirmed live support list when the API fails', async () => {
  const user = userEvent.setup();
  vi.mocked(fetchLiveDataInstruments).mockRejectedValue(new Error('Offline'));
  renderLiveData();
  await user.click(screen.getByRole('button', { name: 'Instrument: Browse instruments' }));
  expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  expect(screen.getByRole('menuitem', { name: /MARI\s/ })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /MERLIN\s/ })).toBeInTheDocument();
});

test('ignores an old file response after navigating back to the generic page', async () => {
  let resolveFiles!: (files: string[]) => void;
  vi.mocked(fetchLiveDataFiles).mockReturnValue(
    new Promise((resolve) => {
      resolveFiles = resolve;
    })
  );
  const history = renderLiveData('/live-data/MARI');

  act(() => history.push('/live-data'));
  await act(async () => {
    resolveFiles(['old-mari.nxs']);
  });

  expect(history.location.pathname).toBe('/live-data');
  expect(screen.queryByText('old-mari.nxs')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByTestId('live-viewer')).toHaveTextContent('Select an instrument to view live data');
});
