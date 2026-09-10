import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Link, MemoryRouter, Route, useHistory, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ExperimentViewer from './ExperimentViewer';
import { fiaApi } from '../lib/api';
import { discoverFileStructure, fetchData1D, fetchFilePath } from '../lib/plottingServiceAPI';

import type { DiscoveredDataset, FileStructure } from '../lib/plottingServiceAPI';
import type { Job, LinePlotData } from '../lib/types';

vi.mock('../lib/api', () => ({ fiaApi: { get: vi.fn() } }));
vi.mock('../lib/plottingServiceAPI', () => ({
  discoverFileStructure: vi.fn(),
  fetchData1D: vi.fn(),
  fetchErrorData: vi.fn(),
  fetchFilePath: vi.fn(),
}));
vi.mock('../lib/useAvailablePluginHeight', () => ({
  useAvailablePluginHeight: () => ({ rootRef: { current: null }, availableHeight: '800px' }),
}));
vi.mock('../components/jobs/InstrumentSelector', () => ({
  default: ({ handleInstrumentChange }: { handleInstrumentChange: (instrument: string) => void }) => (
    <button onClick={() => handleInstrumentChange('LOQ')}>Browse instruments</button>
  ),
}));
vi.mock('../components/experimentViewer/Graph', () => ({
  default: ({ linePlotData }: { linePlotData: LinePlotData[] }) => (
    <output data-testid="plot-data">{JSON.stringify(linePlotData)}</output>
  ),
}));
vi.mock('../components/experimentViewer/Viewer2D', () => ({
  default: ({ filepath }: { filepath: string | null }) => <div data-testid="md-view">{filepath}</div>,
}));

const selectedFilename = 'result & scan #1.nxs';
const experimentPath = '/experiment-viewer?instrument=LOQ&experiment=12345';
const outputLink = (filename = selectedFilename, jobId = 7): string =>
  `${experimentPath}&${new URLSearchParams({ jobId: String(jobId), file: filename })}`;
const searchLink = (filename: string, instrument?: string): string =>
  `/experiment-viewer?${new URLSearchParams({ ...(instrument ? { instrument } : {}), filename })}`;

const makeJob = (id = 7): Job => ({
  id,
  start: '2026-01-01T10:00:00Z',
  end: '2026-01-01T10:05:00Z',
  state: 'SUCCESSFUL',
  status_message: '',
  runner_image: 'mantid:6.9',
  type: 'JobType.REDUCTION',
  inputs: {},
  outputs: `['other.nxs', '${selectedFilename}']`,
  stacktrace: '',
  script: { value: 'reduce()' },
  run: {
    experiment_number: 12345,
    instrument_name: 'LOQ',
    filename: `LOQ${id}.nxs`,
    title: `Reduction ${id}`,
    users: 'Ada',
    run_start: '2026-01-01T09:00:00Z',
    run_end: '2026-01-01T09:30:00Z',
    good_frames: 100,
    raw_frames: 110,
  },
});

const pageJob = (id: number): Job => ({ ...makeJob(id), outputs: JSON.stringify([`page-${id}.nxs`]) });

const servePages = (pages: Job[][], count = 20): void => {
  vi.mocked(fiaApi.get).mockImplementation(async (url, config) => {
    if (url === '/jobs/count') return { data: { count } };
    if (url === '/jobs') return { data: pages[Math.floor((config?.params.offset ?? 0) / 10)] ?? [] };
    if (url.startsWith('/job/')) return { data: makeJob(Number(url.split('/').pop())) };
    throw new Error(`Unexpected API request: ${url}`);
  });
};

const dataset = (path: string, overrides: Partial<DiscoveredDataset> = {}): DiscoveredDataset => ({
  path,
  shape: [3],
  dtype: { class: 'Float', size: 32, endianness: undefined } as DiscoveredDataset['dtype'],
  isNumeric: true,
  is1D: true,
  is2D: false,
  ...overrides,
});

const structure = (
  filename = selectedFilename,
  datasets = [dataset('/secondary'), dataset('/primary', { isPrimary: true })]
): FileStructure => ({ filename, fullPath: `/data/${filename}`, datasets });

const deferred = <T,>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
};

const Navigation = (): React.ReactElement => {
  const history = useHistory();
  const location = useLocation();
  return (
    <>
      <output data-testid="page-location">{location.pathname + location.search}</output>
      <button onClick={() => history.goBack()}>Back</button>
      <button onClick={() => history.goForward()}>Forward</button>
    </>
  );
};

const renderViewer = (path = outputLink(), nextPath = outputLink('other.nxs')): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
      <Link to={nextPath}>Open another output</Link>
      <Link to="/experiment-viewer">Viewer home</Link>
      <Route exact path="/experiment-viewer">
        <ExperimentViewer />
      </Route>
    </MemoryRouter>
  );
};

// Complete search, navigation, and dataset-selection flows take longer with coverage enabled.
describe('Experiment viewer', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/jobs/count') return { data: { count: 120 } };
      if (url === '/jobs') return { data: [makeJob()] };
      if (url.startsWith('/job/')) return { data: makeJob(Number(url.split('/').pop())) };
      throw new Error(`Unexpected API request: ${url}`);
    });
    vi.mocked(fetchFilePath).mockImplementation(async (filename) => `/data/${filename}`);
    vi.mocked(discoverFileStructure).mockImplementation(async (filename) => structure(filename));
    vi.mocked(fetchData1D).mockResolvedValue([1, 2, 3]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('leaves both tabs unselected on the generic page and restores normal selection when browsing an instrument', async () => {
    const user = userEvent.setup();
    renderViewer('/experiment-viewer');

    for (const name of ['1D view', 'MD view']) {
      expect(screen.getByRole('tab', { name })).toBeDisabled();
      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'false');
    }
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    expect(fiaApi.get).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Browse instruments' }));
    expect(fiaApi.get).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'MD view' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'MD view' })).toBeEnabled());
    expect(screen.getByRole('tab', { name: '1D view' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'MD view' }));
    expect(screen.getByRole('tab', { name: 'MD view' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('link', { name: 'Viewer home' }));
    for (const name of ['1D view', 'MD view']) {
      expect(screen.getByRole('tab', { name })).toBeDisabled();
      expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'false');
    }

    await user.click(screen.getByRole('button', { name: 'Browse instruments' }));
    expect(screen.getByRole('tab', { name: 'MD view' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'MD view' })).toBeEnabled());
    expect(screen.getByRole('tab', { name: 'MD view' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: '1D view' }));
    expect(screen.getByRole('tab', { name: '1D view' })).toHaveAttribute('aria-selected', 'true');
  });

  test.each([
    '/experiment-viewer?instrument=LOQ',
    experimentPath,
    '/experiment-viewer?experiment=12345',
    searchLink('missing'),
  ])('keeps the default view selected for an empty search at %s', async (path) => {
    const user = userEvent.setup();
    vi.mocked(fiaApi.get).mockResolvedValue({ data: { count: 0 } });
    renderViewer('/experiment-viewer', path);

    await user.click(screen.getByRole('link', { name: 'Open another output' }));
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Loading jobs' })).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '1D view' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'MD view' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: '1D view' })).toBeDisabled();
  });

  test.each([undefined, 'LOQ'])(
    'waits for a blank search to load all reductions with instrument %s, paginates, and clears without loading',
    { timeout: 30000 },
    async (instrument) => {
      const user = userEvent.setup();
      const basePath = `/experiment-viewer${instrument ? `?instrument=${instrument}` : ''}`;
      const allPath = `${basePath}${instrument ? '&' : '?'}search=true`;
      servePages([[pageJob(10)], [pageJob(11)]]);
      renderViewer(basePath);
      expect(fiaApi.get).not.toHaveBeenCalled();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Search' }));
      await screen.findByRole('button', { name: /LOQ10.nxs/ });
      expect(screen.getByTestId('page-location').textContent).toBe(allPath);
      const filters = JSON.stringify({
        job_state_in: ['SUCCESSFUL'],
        ...(instrument ? { instrument_in: [instrument] } : {}),
      });
      expect(fiaApi.get).toHaveBeenCalledWith('/jobs/count', { params: { filters } });
      expect(fiaApi.get).toHaveBeenCalledWith('/jobs', {
        params: expect.objectContaining({ filters, limit: 10, offset: 0 }),
      });
      await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
      await screen.findByRole('button', { name: /LOQ11.nxs/ });
      expect(fiaApi.get).toHaveBeenCalledWith('/jobs', {
        params: expect.objectContaining({ filters, offset: 10 }),
      });
      await user.click(screen.getByRole('button', { name: 'Search' }));
      await screen.findByRole('button', { name: /LOQ10.nxs/ });
      expect(screen.getByRole('button', { name: 'page 1' })).toHaveAttribute('aria-current', 'page');
      await user.click(screen.getByRole('button', { name: /LOQ10.nxs/ }));
      await user.click(screen.getByRole('checkbox', { name: 'page-10.nxs' }));
      await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent('page-10.nxs'));
      const requestCount = vi.mocked(fiaApi.get).mock.calls.length;
      await user.click(screen.getByRole('button', { name: 'Clear experiment number' }));
      expect(screen.getByTestId('page-location').textContent).toBe(basePath);
      expect(screen.queryByRole('button', { name: /LOQ10.nxs/ })).not.toBeInTheDocument();
      expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
      expect(screen.getByRole('button', { name: 'Clear experiment number' })).toBeDisabled();
      expect(fiaApi.get).toHaveBeenCalledTimes(requestCount);
    }
  );

  test('treats whitespace in a run/file search as all reductions and restores it through browser history', async () => {
    const user = userEvent.setup();
    servePages([[pageJob(10)]]);
    renderViewer('/experiment-viewer', '/experiment-viewer?search=true');
    await user.click(screen.getByRole('combobox', { name: 'Search by' }));
    await user.click(screen.getByRole('option', { name: 'Run/file' }));
    await user.type(screen.getByRole('textbox', { name: 'Run/file' }), '   {Enter}');
    await screen.findByRole('button', { name: /LOQ10.nxs/ });
    expect(fiaApi.get).toHaveBeenCalledWith('/jobs/count', {
      params: { filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'] }) },
    });
    expect(screen.getByRole('textbox', { name: 'Run/file' })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Clear run/file search' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByRole('button', { name: /LOQ10.nxs/ });
    await user.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.queryByRole('button', { name: /LOQ10.nxs/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Open another output' }));
    await screen.findByRole('button', { name: /LOQ10.nxs/ });
  });

  test('ignores a pending all-reductions response after Clear', async () => {
    const user = userEvent.setup();
    const pending = deferred<{ data: Job[] }>();
    vi.mocked(fiaApi.get).mockImplementation(async (url) => {
      if (url === '/jobs/count') return { data: { count: 1 } };
      return pending.promise;
    });
    renderViewer('/experiment-viewer');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(fiaApi.get).toHaveBeenCalledWith('/jobs', expect.anything()));
    await user.click(screen.getByRole('button', { name: 'Clear experiment number' }));
    await act(async () => pending.resolve({ data: [pageJob(10)] }));
    expect(screen.queryByRole('button', { name: /LOQ10.nxs/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
  });

  test.each([undefined, 'LOQ'])(
    'searches input filenames with instrument %s and keeps files editable',
    async (instrument) => {
      const user = userEvent.setup();
      const filename = 'LOQ & scan #1.nxs';
      renderViewer(instrument ? experimentPath : '/experiment-viewer');
      if (instrument) await screen.findByRole('button', { name: /LOQ7.nxs/ });
      vi.mocked(fiaApi.get).mockClear();

      await user.click(screen.getByRole('combobox', { name: 'Search by' }));
      await user.click(screen.getByRole('option', { name: 'Run/file' }));
      await user.type(screen.getByRole('textbox', { name: 'Run/file' }), `  ${filename}  {Enter}`);

      const filters = JSON.stringify({
        job_state_in: ['SUCCESSFUL'],
        ...(instrument ? { instrument_in: [instrument] } : {}),
        filename,
      });
      await waitFor(() =>
        expect(fiaApi.get).toHaveBeenCalledWith('/jobs', {
          params: {
            filters,
            include_run: 'true',
            limit: 10,
            offset: 0,
            order_by: 'run_start',
            order_direction: 'desc',
          },
        })
      );
      expect(fiaApi.get).toHaveBeenCalledWith('/jobs/count', { params: { filters } });
      expect(screen.getByTestId('page-location').textContent).toBe(searchLink(filename, instrument));
      expect(screen.getByRole('textbox', { name: 'Run/file' })).toHaveValue(filename);

      await user.click(await screen.findByRole('button', { name: /LOQ7.nxs/ }));
      expect(screen.getByRole('checkbox', { name: selectedFilename })).not.toBeChecked();
      expect(discoverFileStructure).not.toHaveBeenCalled();
      await user.click(screen.getByRole('checkbox', { name: selectedFilename }));
      await waitFor(() => expect(fetchData1D).toHaveBeenCalledWith(`/data/${selectedFilename}`, '/primary', undefined));
    }
  );

  test('resolves an experiment-only query to its instrument while keeping the base pathname', async () => {
    renderViewer('/experiment-viewer?experiment=12345');
    await waitFor(() => expect(screen.getByTestId('page-location').textContent).toBe(experimentPath));
    expect(fiaApi.get).toHaveBeenCalledWith('/jobs/count', {
      params: { filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'], experiment_number_in: [12345] }) },
    });
    expect(screen.getByRole('spinbutton', { name: 'Experiment number' })).toHaveValue(12345);
    await screen.findByRole('button', { name: /LOQ7.nxs/ });
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
  });

  test('restores run/file searches from links and browser history while preserving instrument scope', async () => {
    const user = userEvent.setup();
    renderViewer(searchLink('LOQ7.nxs'));
    expect(screen.getByRole('combobox', { name: 'Search by' })).toHaveTextContent('Run/file');
    expect(screen.getByRole('textbox', { name: 'Run/file' })).toHaveValue('LOQ7.nxs');
    await screen.findByRole('button', { name: /LOQ7.nxs/ });

    const requestCount = vi.mocked(fiaApi.get).mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Browse instruments' }));
    expect(screen.getByTestId('page-location').textContent).toBe(`${searchLink('LOQ7.nxs', 'LOQ')}&search=false`);
    expect(screen.queryByRole('button', { name: /LOQ7.nxs/ })).not.toBeInTheDocument();
    expect(fiaApi.get).toHaveBeenCalledTimes(requestCount);
    expect(screen.getByRole('textbox', { name: 'Run/file' })).toHaveValue('LOQ7.nxs');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('page-location').textContent).toBe(searchLink('LOQ7.nxs', 'LOQ')));
    await user.click(screen.getByRole('combobox', { name: 'Search by' }));
    await user.click(screen.getByRole('option', { name: 'Experiment number' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Experiment number' }), '12345{Enter}');
    await waitFor(() => expect(screen.getByTestId('page-location').textContent).toBe(experimentPath));
    expect(fiaApi.get).toHaveBeenCalledWith('/jobs/count', {
      params: {
        filters: JSON.stringify({
          job_state_in: ['SUCCESSFUL'],
          instrument_in: ['LOQ'],
          experiment_number_in: [12345],
        }),
      },
    });

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('textbox', { name: 'Run/file' })).toHaveValue('LOQ7.nxs');
    expect(screen.getByTestId('page-location').textContent).toBe(searchLink('LOQ7.nxs', 'LOQ'));
    await user.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByRole('spinbutton', { name: 'Experiment number' })).toHaveValue(12345);
    expect(screen.getByTestId('page-location').textContent).toBe(experimentPath);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Clear run/file search' }));
    expect(screen.getByTestId('page-location').textContent).toBe('/experiment-viewer?instrument=LOQ');
    expect(screen.getByRole('textbox', { name: 'Run/file' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Clear run/file search' })).toBeDisabled();
    expect(fiaApi.get).not.toHaveBeenCalledWith('/jobs/count', {
      params: { filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'], instrument_in: ['LOQ'] }) },
    });
  });

  test('paginates within the filename search and resets the page and selection for a new search', async () => {
    const user = userEvent.setup();
    renderViewer(searchLink('LOQ', 'LOQ'));
    await user.click(await screen.findByRole('button', { name: /LOQ7.nxs/ }));
    await user.click(screen.getByRole('checkbox', { name: selectedFilename }));
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));

    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() =>
      expect(fiaApi.get).toHaveBeenCalledWith('/jobs', {
        params: expect.objectContaining({
          offset: 10,
          filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'], instrument_in: ['LOQ'], filename: 'LOQ' }),
        }),
      })
    );
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Loading jobs' })).not.toBeInTheDocument());
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    await user.clear(screen.getByRole('textbox', { name: 'Run/file' }));
    await user.type(screen.getByRole('textbox', { name: 'Run/file' }), 'LOQ8{Enter}');

    await waitFor(() =>
      expect(fiaApi.get).toHaveBeenCalledWith('/jobs', {
        params: expect.objectContaining({
          offset: 0,
          filters: JSON.stringify({ job_state_in: ['SUCCESSFUL'], instrument_in: ['LOQ'], filename: 'LOQ8' }),
        }),
      })
    );
    expect(screen.getByRole('button', { name: 'page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
  });

  test('ignores a pending filename search after navigation to another search', async () => {
    const user = userEvent.setup();
    const pendingJobs = deferred<{ data: Job[] }>();
    vi.mocked(fiaApi.get).mockImplementation(async (url, config) => {
      if (url === '/jobs/count') return { data: { count: 1 } };
      return JSON.parse(config?.params.filters).filename === 'LOQ7' ? pendingJobs.promise : { data: [makeJob(8)] };
    });
    renderViewer(searchLink('LOQ7'), searchLink('LOQ8'));
    await waitFor(() => expect(fiaApi.get).toHaveBeenCalledWith('/jobs', expect.anything()));
    expect(screen.getByRole('progressbar', { name: 'Loading jobs' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Loading experiment data' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Open another output' }));
    await screen.findByRole('button', { name: /LOQ8.nxs/ });
    await act(async () => pendingJobs.resolve({ data: [makeJob()] }));
    expect(screen.queryByRole('button', { name: /LOQ7.nxs/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LOQ8.nxs/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Run/file' })).toHaveValue('LOQ8');
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
  });

  test('reuses a reduction on the first page and retains the full experiment controls without duplicate rows', async () => {
    const user = userEvent.setup();
    servePages([[makeJob(), pageJob(10)], [pageJob(11)]]);
    renderViewer();
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
    expect(fiaApi.get).not.toHaveBeenCalledWith('/job/7');
    expect(screen.getByRole('button', { name: 'Browse instruments' })).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'Experiment number' })).toHaveValue(12345);
    expect(screen.getByRole('navigation', { name: 'Experiment viewer job pages' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /LOQ7.nxs/ })).toHaveLength(1);
    expect(
      within(screen.getByRole('region', { name: 'Opened reduction' })).getByRole('checkbox', { name: selectedFilename })
    ).toBeChecked();
    expect(screen.getByRole('button', { name: /LOQ10.nxs/ })).toBeVisible();
    expect(screen.getByText('Showing 1-10 of 20 jobs')).toBeVisible();
    expect(discoverFileStructure).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await screen.findByRole('button', { name: /LOQ11.nxs/ });
    expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    await user.click(screen.getByRole('button', { name: 'Go to page 1' }));
    expect(await screen.findByRole('checkbox', { name: selectedFilename })).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
    expect(discoverFileStructure).toHaveBeenCalledTimes(1);
  });

  test(
    'loads an older reduction alongside the experiment and clears edited selections when paging',
    { timeout: 30000 },
    async () => {
      const user = userEvent.setup();
      servePages([[pageJob(10)], [makeJob(), pageJob(11)]]);
      renderViewer();

      await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
      expect(fiaApi.get).toHaveBeenCalledWith('/job/7');
      expect(screen.getByRole('button', { name: /LOQ7.nxs/ })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('checkbox', { name: selectedFilename })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'other.nxs' })).not.toBeChecked();
      expect(screen.getByRole('tab', { name: '1D view' })).toHaveAttribute('aria-selected', 'true');
      expect(fetchData1D).toHaveBeenCalledWith(`/data/${selectedFilename}`, '/primary', undefined);

      await user.click(screen.getByRole('checkbox', { name: selectedFilename }));
      await user.click(screen.getByRole('checkbox', { name: 'other.nxs' }));
      await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent('other.nxs'));
      const plotRequests = vi.mocked(fetchData1D).mock.calls.length;
      await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
      await screen.findByRole('button', { name: /LOQ11.nxs/ });
      expect(screen.getByText('Showing 11-20 of 20 jobs')).toBeVisible();
      expect(screen.getAllByRole('button', { name: /LOQ7.nxs/ })).toHaveLength(1);
      expect(screen.getByRole('checkbox', { name: selectedFilename })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'other.nxs' })).not.toBeChecked();
      expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
      expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
      expect(fetchData1D).toHaveBeenCalledTimes(plotRequests);
      expect(discoverFileStructure).toHaveBeenCalledTimes(2);
      await user.click(screen.getByRole('button', { name: 'Go to page 1' }));
      await screen.findByRole('button', { name: /LOQ10.nxs/ });
      expect(screen.queryByRole('button', { name: /LOQ7.nxs/ })).not.toBeInTheDocument();
      expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
      expect(vi.mocked(fiaApi.get).mock.calls.filter(([url]) => url === '/job/7')).toHaveLength(1);
    }
  );

  test(
    'resets dataset, slice, and MD file selections when paging while retaining the chosen view',
    { timeout: 30000 },
    async () => {
      const user = userEvent.setup();
      servePages([[makeJob(), pageJob(10)], [pageJob(11)]]);
      vi.mocked(discoverFileStructure).mockResolvedValue(
        structure(selectedFilename, [
          dataset('/primary', { shape: [4, 3], is1D: false, is2D: true, isPrimary: true }),
          dataset('/another', { shape: [4, 3], is1D: false, is2D: true }),
        ])
      );
      renderViewer();
      await waitFor(() => expect(fetchData1D).toHaveBeenCalledWith(`/data/${selectedFilename}`, '/primary', 0));
      const opened = within(await screen.findByRole('region', { name: 'Opened reduction' }));
      await user.click(await opened.findByRole('combobox', { name: /Dataset/ }));
      await user.click(screen.getByRole('option', { name: /\/another/ }));
      await user.type(screen.getByRole('textbox', { name: 'Slice indices' }), '2');
      await waitFor(() => expect(fetchData1D).toHaveBeenLastCalledWith(`/data/${selectedFilename}`, '/another', 2));
      const plotRequests = vi.mocked(fetchData1D).mock.calls.length;
      await user.click(screen.getByRole('tab', { name: 'MD view' }));
      await user.click(screen.getByRole('radio', { name: selectedFilename }));
      await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
      await screen.findByRole('button', { name: /LOQ11.nxs/ });
      expect(screen.getByRole('tab', { name: 'MD view' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('md-view')).toBeEmptyDOMElement();
      await user.click(screen.getByRole('tab', { name: '1D view' }));
      expect(screen.queryByRole('combobox', { name: /Dataset/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Slice indices' })).not.toBeInTheDocument();
      expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
      expect(fetchData1D).toHaveBeenCalledTimes(plotRequests);
      await user.click(screen.getByRole('button', { name: 'Go to page 1' }));
      await user.click(await screen.findByRole('checkbox', { name: selectedFilename }));
      await waitFor(() => expect(fetchData1D).toHaveBeenLastCalledWith(`/data/${selectedFilename}`, '/primary', 0));
      expect(screen.getByRole('textbox', { name: 'Slice indices' })).toHaveValue('');
    }
  );

  test.each(['search', 'clear', 'instrument'] as const)(
    'clears the opened reduction and query parameters on %s',
    async (action) => {
      const user = userEvent.setup();
      servePages([[pageJob(10)]]);
      renderViewer();
      await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
      if (action === 'search') {
        await user.click(screen.getByRole('combobox', { name: 'Search by' }));
        await user.click(screen.getByRole('option', { name: 'Run/file' }));
        await user.type(screen.getByRole('textbox', { name: 'Run/file' }), 'LOQ10{Enter}');
      } else {
        await user.click(
          screen.getByRole('button', { name: action === 'clear' ? 'Clear experiment number' : 'Browse instruments' })
        );
      }
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument());
      expect(screen.getByTestId('page-location')).not.toHaveTextContent('jobId=');
      expect(screen.getByTestId('page-location')).not.toHaveTextContent('file=');
      expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
      if (action !== 'search') {
        expect(screen.queryByRole('button', { name: /LOQ10.nxs/ })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Search' }));
      }
      await screen.findByRole('button', { name: /LOQ10.nxs/ });
    }
  );

  test('reapplies the linked output on refresh and browser history without overriding later edits', async () => {
    const user = userEvent.setup();
    servePages([[pageJob(10)]]);
    renderViewer(outputLink(), outputLink());
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
    await user.click(screen.getByRole('checkbox', { name: selectedFilename }));
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Loading jobs' })).not.toBeInTheDocument());
    expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
    // Following the same URL again starts a fresh navigation, like a refresh.
    await user.click(screen.getByRole('link', { name: 'Open another output' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: selectedFilename })).toBeChecked());
    await user.click(screen.getByRole('link', { name: 'Viewer home' }));
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
    await user.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
  });

  test('clears both opened and ordinary plots when the next page fails and keeps browsing usable', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    servePages([[pageJob(10)]]);
    const respond = vi.mocked(fiaApi.get).getMockImplementation()!;
    vi.mocked(fiaApi.get).mockImplementation(async (url, config) => {
      if (url === '/jobs' && config?.params.offset === 10) throw new Error('Page unavailable');
      return respond(url, config);
    });
    renderViewer();
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
    await user.click(screen.getByRole('button', { name: /LOQ10.nxs/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'page-10.nxs' }));
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent('page-10.nxs'));
    const plotRequests = vi.mocked(fetchData1D).mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load jobs from server');
    expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    expect(fetchData1D).toHaveBeenCalledTimes(plotRequests);
    await user.click(screen.getByRole('button', { name: 'Go to page 1' }));
    await screen.findByRole('button', { name: /LOQ10.nxs/ });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
  });

  test.each(['empty', 'failed'] as const)(
    'opens the requested output even if the experiment list is %s',
    async (state) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      servePages([], 0);
      if (state === 'failed') vi.mocked(fiaApi.get).mockRejectedValueOnce(new Error('Count unavailable'));
      renderViewer();
      await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
      if (state === 'failed') expect(screen.getByRole('alert')).toHaveTextContent('Failed to load jobs from server');
      else expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Experiment viewer job pages' })).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Opened reduction' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Browse instruments' })).toBeEnabled();
    }
  );

  test('respects manual deselection and view changes during opened-file discovery', async () => {
    const user = userEvent.setup();
    const pending = deferred<FileStructure>();
    servePages([[pageJob(10)], [pageJob(11)]]);
    vi.mocked(discoverFileStructure).mockReturnValueOnce(pending.promise);
    renderViewer();
    await waitFor(() => expect(discoverFileStructure).toHaveBeenCalled());
    await user.click(await screen.findByRole('checkbox', { name: selectedFilename }));
    await user.click(screen.getByRole('tab', { name: 'MD view' }));
    await user.click(screen.getByRole('radio', { name: 'other.nxs' }));
    await act(async () => pending.resolve(structure()));
    expect(screen.getByRole('tab', { name: 'MD view' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('md-view')).toHaveTextContent('/data/other.nxs');
    await user.click(screen.getByRole('tab', { name: '1D view' }));
    expect(screen.getByRole('checkbox', { name: selectedFilename })).not.toBeChecked();
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    expect(fetchData1D).not.toHaveBeenCalled();
  });

  test('clears both MD and 1D selections when clearing an output opened from the reduction table', async () => {
    const user = userEvent.setup();
    renderViewer();
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
    await user.click(screen.getByRole('tab', { name: 'MD view' }));
    await user.click(screen.getByRole('radio', { name: selectedFilename }));
    expect(screen.getByTestId('md-view')).toHaveTextContent(`/data/${selectedFilename}`);
    const plotRequests = vi.mocked(fetchData1D).mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Clear experiment number' }));
    expect(screen.getByTestId('md-view')).toBeEmptyDOMElement();
    expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
    expect(screen.getByTestId('page-location').textContent).toBe('/experiment-viewer?instrument=LOQ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('button', { name: /LOQ7.nxs/ });
    await user.click(screen.getByRole('tab', { name: '1D view' }));
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
    expect(fetchData1D).toHaveBeenCalledTimes(plotRequests);
  });

  test.each(['datasets', 'plot'] as const)(
    'does not restore an output cleared during a pending %s request',
    async (stage) => {
      const user = userEvent.setup();
      const pending = deferred<void>();
      if (stage === 'datasets')
        vi.mocked(discoverFileStructure).mockImplementation(async (filename) => {
          await pending.promise;
          return structure(filename);
        });
      else
        vi.mocked(fetchData1D).mockImplementation(async () => {
          await pending.promise;
          return [1, 2, 3];
        });
      renderViewer();
      await waitFor(() => expect(stage === 'datasets' ? discoverFileStructure : fetchData1D).toHaveBeenCalled());
      await user.click(screen.getByRole('button', { name: 'Clear experiment number' }));
      await act(async () => pending.resolve());
      expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
      expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );

  test('ignores a previous output plot response after following another output link', async () => {
    const user = userEvent.setup();
    const pending = deferred<number[]>();
    servePages([[pageJob(10)]]);
    vi.mocked(fetchData1D).mockImplementation(async (filename) =>
      filename === `/data/${selectedFilename}` ? pending.promise : [7, 8, 9]
    );
    renderViewer();
    await waitFor(() => expect(fetchData1D).toHaveBeenCalledWith(`/data/${selectedFilename}`, '/primary', undefined));
    await user.click(screen.getByRole('link', { name: 'Open another output' }));
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent('other.nxs'));
    await act(async () => pending.resolve([1, 2, 3]));
    expect(screen.getByTestId('plot-data')).toHaveTextContent('other.nxs');
    expect(screen.getByTestId('plot-data')).not.toHaveTextContent(selectedFilename);
    expect(screen.getByRole('checkbox', { name: selectedFilename })).not.toBeChecked();
  });

  test.each(['reduction', 'file path', 'datasets', 'plot'] as const)(
    'does not restore the linked output after paging during its pending %s request',
    async (stage) => {
      const user = userEvent.setup();
      const pending = deferred<void>();
      servePages([[pageJob(10)], [pageJob(11)]]);
      const respond = vi.mocked(fiaApi.get).getMockImplementation()!;
      if (stage === 'reduction') {
        vi.mocked(fiaApi.get).mockImplementation(async (url, config) => {
          if (url === '/job/7') await pending.promise;
          return respond(url, config);
        });
      }
      if (stage === 'file path') {
        vi.mocked(fetchFilePath).mockImplementation(async (filename) => {
          if (filename === selectedFilename) await pending.promise;
          return `/data/${filename}`;
        });
      }
      if (stage === 'datasets') {
        vi.mocked(discoverFileStructure).mockImplementation(async (filename) => {
          await pending.promise;
          return structure(filename);
        });
      }
      if (stage === 'plot') {
        vi.mocked(fetchData1D).mockImplementation(async () => {
          await pending.promise;
          return [1, 2, 3];
        });
      }
      renderViewer();
      await waitFor(() => {
        if (stage === 'reduction') expect(fiaApi.get).toHaveBeenCalledWith('/job/7');
        if (stage === 'file path') expect(fetchFilePath).toHaveBeenCalledWith(selectedFilename, 'LOQ', 12345);
        if (stage === 'datasets') expect(discoverFileStructure).toHaveBeenCalled();
        if (stage === 'plot') expect(fetchData1D).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeEnabled();
      });
      await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
      await screen.findByRole('button', { name: /LOQ11.nxs/ });
      expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar', { name: 'Loading experiment data' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Go to page 1' }));
      await screen.findByRole('button', { name: /LOQ10.nxs/ });
      await act(async () => pending.resolve());
      expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /LOQ7.nxs/ })).not.toBeInTheDocument();
      expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(vi.mocked(fiaApi.get).mock.calls.filter(([url]) => url === '/job/7')).toHaveLength(1);
    }
  );

  test('ignores stale page-file discovery even when the same output appears on the next page', async () => {
    const user = userEvent.setup();
    const pending = deferred<FileStructure>();
    servePages([[pageJob(10)], [pageJob(10)]]);
    renderViewer();
    await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent(selectedFilename));
    vi.mocked(discoverFileStructure).mockReturnValueOnce(pending.promise);
    await user.click(screen.getByRole('button', { name: /LOQ10.nxs/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'page-10.nxs' }));
    await waitFor(() => expect(discoverFileStructure).toHaveBeenCalledWith('page-10.nxs', '/data/page-10.nxs'));
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Loading jobs' })).not.toBeInTheDocument());
    expect(screen.getByRole('checkbox', { name: 'page-10.nxs' })).not.toBeChecked();
    vi.mocked(discoverFileStructure).mockResolvedValueOnce(structure('page-10.nxs', [dataset('/fresh')]));
    await user.click(screen.getByRole('checkbox', { name: 'page-10.nxs' }));
    await waitFor(() => expect(fetchData1D).toHaveBeenCalledWith('/data/page-10.nxs', '/fresh', undefined));
    await act(async () => pending.resolve(structure('page-10.nxs', [dataset('/stale')])));
    expect(fetchData1D).not.toHaveBeenCalledWith('/data/page-10.nxs', '/stale', undefined);
    expect(screen.getByTestId('plot-data')).not.toHaveTextContent(selectedFilename);
    expect(screen.getByTestId('plot-data')).toHaveTextContent('page-10.nxs');
  });

  test.each([
    { label: 'the first dataset when no primary is marked', selected: dataset('/fallback'), slice: undefined },
    {
      label: 'the first slice of a multidimensional primary dataset',
      selected: dataset('/image', { shape: [2, 3], is1D: false, is2D: true, isPrimary: true }),
      slice: 0,
    },
  ])('selects $label', async ({ selected, slice }) => {
    vi.mocked(discoverFileStructure).mockResolvedValue(structure(selectedFilename, [selected]));
    renderViewer();

    await waitFor(() => expect(fetchData1D).toHaveBeenCalledWith(`/data/${selectedFilename}`, selected.path, slice));
    expect(screen.getByRole('tab', { name: '1D view' })).toHaveAttribute('aria-selected', 'true');
  });

  test('reports a missing output without selecting another file', async () => {
    renderViewer(outputLink('missing.nxs'));
    expect(await screen.findByRole('alert')).toHaveTextContent('The selected output is no longer available.');
    expect(discoverFileStructure).not.toHaveBeenCalled();
    expect(fetchData1D).not.toHaveBeenCalled();
    expect(screen.getByTestId('plot-data')).toHaveTextContent('[]');
  });

  test.each(['reduction', 'file path', 'datasets'] as const)('reports a failure to load the %s', async (stage) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('Unavailable');
    if (stage === 'reduction') {
      servePages([[pageJob(10)]]);
      const respond = vi.mocked(fiaApi.get).getMockImplementation()!;
      vi.mocked(fiaApi.get).mockImplementation(async (url, config) => {
        if (url === '/job/7') throw failure;
        return respond(url, config);
      });
    }
    if (stage === 'file path') {
      vi.mocked(fetchFilePath).mockImplementation(async (filename) => {
        if (filename === selectedFilename) throw failure;
        return `/data/${filename}`;
      });
    }
    if (stage === 'datasets') vi.mocked(discoverFileStructure).mockRejectedValueOnce(failure);
    renderViewer();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      stage === 'datasets'
        ? `Failed to load datasets for ${selectedFilename}.`
        : 'The selected output could not be loaded.'
    );
    expect(fetchData1D).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });

  test.each(['reduction', 'datasets'] as const)(
    'ignores an older %s response after following a different link',
    async (stage) => {
      const user = userEvent.setup();
      const pendingJob = deferred<{ data: Job }>();
      const pendingDatasets = deferred<FileStructure>();
      const nextJobId = stage === 'reduction' ? 8 : 7;
      if (stage === 'reduction') {
        servePages([[pageJob(10)]]);
        const respond = vi.mocked(fiaApi.get).getMockImplementation()!;
        vi.mocked(fiaApi.get).mockImplementation(async (url, config) =>
          url === '/job/7' ? pendingJob.promise : respond(url, config)
        );
      } else {
        vi.mocked(discoverFileStructure).mockImplementation(async (filename) =>
          filename === selectedFilename ? pendingDatasets.promise : structure(filename)
        );
      }
      renderViewer(outputLink(), outputLink('other.nxs', nextJobId));
      if (stage === 'reduction') await waitFor(() => expect(fiaApi.get).toHaveBeenCalledWith('/job/7'));
      if (stage === 'datasets') {
        await waitFor(() =>
          expect(discoverFileStructure).toHaveBeenCalledWith(selectedFilename, `/data/${selectedFilename}`)
        );
        expect(await screen.findByRole('progressbar', { name: 'Loading experiment data' })).toBeInTheDocument();
      }

      await user.click(screen.getByRole('link', { name: 'Open another output' }));
      await waitFor(() => expect(screen.getByTestId('plot-data')).toHaveTextContent('other.nxs'));
      await act(async () => {
        pendingJob.resolve({ data: makeJob() });
        pendingDatasets.resolve(structure(selectedFilename, [dataset('/stale')]));
      });

      expect(screen.getByRole('checkbox', { name: 'other.nxs' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: selectedFilename })).not.toBeChecked();
      expect(screen.getByTestId('plot-data')).not.toHaveTextContent(selectedFilename);
      expect(fetchData1D).not.toHaveBeenCalledWith(`/data/${selectedFilename}`, '/stale', undefined);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );

  test('keeps ordinary experiment links unselected until the user enables a file', async () => {
    const user = userEvent.setup();
    renderViewer(experimentPath);
    await user.click(await screen.findByRole('button', { name: /LOQ7.nxs/ }));
    expect(screen.getByRole('checkbox', { name: selectedFilename })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'other.nxs' })).not.toBeChecked();
    expect(discoverFileStructure).not.toHaveBeenCalled();
    expect(fetchData1D).not.toHaveBeenCalled();
    expect(screen.getByRole('spinbutton', { name: 'Experiment number' })).toHaveValue(12345);

    await user.click(screen.getByRole('checkbox', { name: selectedFilename }));
    await waitFor(() => expect(fetchData1D).toHaveBeenCalledWith(`/data/${selectedFilename}`, '/primary', undefined));
  });

  test.each([
    `${experimentPath}&jobId=invalid&file=result.nxs`,
    `${experimentPath}&jobId=7`,
    `${experimentPath}&file=result.nxs`,
    '/experiment-viewer?instrument=LOQ&jobId=7&file=result.nxs',
  ])('rejects an incomplete or invalid selection but keeps ordinary browsing at %s', async (path) => {
    const user = userEvent.setup();
    renderViewer(path);
    expect(await screen.findByRole('alert')).toHaveTextContent('The selected output link is invalid.');
    if (!new URLSearchParams(path.split('?')[1]).has('experiment')) {
      expect(fiaApi.get).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Search' }));
    }
    await screen.findByRole('button', { name: /LOQ7.nxs/ });
    expect(fiaApi.get).not.toHaveBeenCalledWith('/job/7');
    expect(screen.getByRole('button', { name: 'Browse instruments' })).toBeEnabled();
    expect(discoverFileStructure).not.toHaveBeenCalled();
  });

  test.each(['instrument', 'experiment'] as const)(
    'rejects a selected reduction from another %s without hiding the experiment list',
    async (mismatch) => {
      servePages([[pageJob(10)]]);
      const respond = vi.mocked(fiaApi.get).getMockImplementation()!;
      vi.mocked(fiaApi.get).mockImplementation(async (url, config) => {
        if (url === '/job/7') {
          const job = makeJob();
          if (mismatch === 'instrument') job.run.instrument_name = 'SANS2D';
          else job.run.experiment_number = 99999;
          return { data: job };
        }
        return respond(url, config);
      });
      renderViewer();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The selected reduction does not belong to this experiment.'
      );
      expect(screen.getByRole('button', { name: /LOQ10.nxs/ })).toBeVisible();
      expect(screen.queryByRole('region', { name: 'Opened reduction' })).not.toBeInTheDocument();
      expect(discoverFileStructure).not.toHaveBeenCalled();
    }
  );
});
