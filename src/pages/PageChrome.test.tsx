import { cleanup, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ExperimentViewer from './ExperimentViewer';
import Instruments from './Instruments';
import LiveData from './LiveData';
import LiveValueEditor from './LiveValueEditor';
import ValueEditor from './ValueEditor';
import { fiaApi } from '../lib/api';
import { fetchLiveDataFiles, fetchLiveDataInstruments } from '../lib/plottingServiceAPI';

vi.mock('@monaco-editor/react', () => ({ default: () => <div data-testid="mock-editor" /> }));

vi.mock('../lib/api', () => ({
  fiaApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../lib/plottingServiceAPI', () => ({
  discoverFileStructure: vi.fn(),
  fetchData1D: vi.fn(),
  fetchErrorData: vi.fn(),
  fetchFilePath: vi.fn(),
  fetchLiveDataFiles: vi.fn(),
  fetchLiveDataInstruments: vi.fn(),
}));

vi.mock('../lib/useLiveDataSSE', () => ({
  useLiveDataSSE: () => ({ isConnected: false, directory: null, changedFile: null, error: null }),
}));

vi.mock('../lib/useAvailablePluginHeight', () => ({
  useAvailablePluginHeight: () => ({ rootRef: { current: null }, availableHeight: '800px' }),
}));

vi.mock('../components/jobs/InstrumentSelector', () => ({
  default: () => <button type="button">Browse instruments</button>,
}));

vi.mock('../components/experimentViewer/Viewer2D', () => ({ default: () => <div data-testid="viewer-2d" /> }));
vi.mock('../components/experimentViewer/FileTree', () => ({ default: () => <div data-testid="file-tree" /> }));
vi.mock('../components/experimentViewer/Graph', () => ({ default: () => <div data-testid="plot-viewer" /> }));
vi.mock('../components/experimentViewer/ViewerTabs', () => ({ default: () => <div data-testid="viewer-tabs" /> }));
vi.mock('../components/experimentViewer/LiveLogViewer', () => ({ LiveLogViewer: () => null }));

const renderPage = (path: string, route: string, page: React.ReactElement): ReturnType<typeof render> =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Route path={route}>{page}</Route>
    </MemoryRouter>
  );

describe('page chrome titles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchLiveDataInstruments).mockResolvedValue(['LOQ']);
    vi.mocked(fetchLiveDataFiles).mockResolvedValue([]);
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/jobs/runners') return { data: { runner: '6.9' } };
      if (url === '/job/42') {
        return { data: { script: { value: 'reduce()' }, run: { instrument_name: 'LOQ' } } };
      }
      if (url === '/live-data/LOQ/script') return { data: 'print("live")' };
      return { data: [] };
    });
  });

  afterEach(cleanup);

  test('removes the Experiment Viewer page heading while retaining its breadcrumb', () => {
    renderPage('/experiment-viewer', '/experiment-viewer', <ExperimentViewer />);

    expect(screen.queryByRole('heading', { name: 'Experiment viewer' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('breadcrumb')).toBeInTheDocument();
  });

  test('removes the Live data viewer page heading while retaining connection status', async () => {
    renderPage('/live-data/LOQ', '/live-data/:instrumentName', <LiveData />);

    expect(screen.queryByRole('heading', { name: 'Live data viewer' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Disconnected');
    expect(screen.getByRole('status')).not.toContainElement(screen.getByRole('group', { name: 'Page controls' }));
  });

  test('removes the Instruments page heading while retaining its cards', () => {
    renderPage('/isis-instruments', '/isis-instruments', <Instruments />);

    expect(screen.queryByRole('heading', { name: 'ISIS instruments' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Instrument cards' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Page controls' })).getByRole('textbox', {
        name: 'Search for instrument, technique, or scientist',
      })
    ).toBeInTheDocument();
  });

  test('renders the reduction editor label as paragraph text', async () => {
    renderPage(
      '/reduction-history/LOQ/value-editor-42',
      '/reduction-history/:instrumentName/value-editor-:jobId',
      <ValueEditor />
    );

    const label = await screen.findByText('LOQ Job 42 values');
    expect(label.tagName).toBe('P');
    expect(screen.queryByRole('heading', { name: 'LOQ Job 42 values' })).not.toBeInTheDocument();
  });

  test('renders the live script editor label as paragraph text', () => {
    renderPage('/live-data/LOQ/edit-script', '/live-data/:instrumentName/edit-script', <LiveValueEditor />);

    const label = screen.getByText('LOQ Live data script');
    expect(label.tagName).toBe('P');
    expect(screen.queryByRole('heading', { name: 'LOQ Live data script' })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('breadcrumb')).getByText('Edit script')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(screen.getByLabelText('breadcrumb')).getByRole('link', { name: 'LOQ' })).toHaveAttribute(
      'href',
      '/live-data/LOQ'
    );
    expect(
      within(screen.getByRole('group', { name: 'Page controls' })).getByRole('button', { name: 'Browse instruments' })
    ).toBeInTheDocument();
  });
});
