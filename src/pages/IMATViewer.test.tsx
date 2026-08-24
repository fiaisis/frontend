import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, useHistory, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import IMATViewer from './IMATViewer';
import { fiaApi, h5Api } from '../lib/api';

import type { Job } from '../lib/types';

const treeJob = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@h5web/lib', () => ({
  DomainWidget: () => <div data-testid="domain-widget" />,
  HeatmapVis: () => <div data-testid="heatmap" />,
  RgbVis: () => <div data-testid="rgb-image" />,
  ScaleType: { Linear: 'linear' },
  Toolbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSafeDomain: (domain: [number, number]) => [domain],
}));

vi.mock('../components/imat/ImatStackJobTree', () => ({
  default: ({
    autoSelect,
    selectedJobId,
    onSelectJob,
  }: {
    autoSelect: boolean;
    selectedJobId: number | null;
    onSelectJob: (job: Job) => void;
  }) => (
    <aside aria-label="Mock stack tree">
      <span>{`Selected job: ${selectedJobId ?? 'none'}`}</span>
      <span>{`Auto select: ${autoSelect}`}</span>
      <button type="button" onClick={() => onSelectJob(treeJob.get() as Job)}>
        Select another stack
      </button>
    </aside>
  ),
}));

vi.mock('../lib/api', () => ({
  fiaApi: { get: vi.fn() },
  h5Api: { get: vi.fn() },
}));

const makeJob = (id: number, experimentNumber: number, filename = `IMAT${id}.raw`): Job => ({
  id,
  start: '2026-01-01T10:00:00Z',
  end: '2026-01-01T10:05:00Z',
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
    run_start: '2026-01-01T09:00:00Z',
    run_end: '2026-01-01T09:30:00Z',
    title: `Sample ${id}`,
    users: 'User',
    good_frames: 10,
    raw_frames: 10,
    instrument_name: 'IMAT',
  },
});

const LocationDisplay = (): React.ReactElement => {
  const history = useHistory();
  const location = useLocation();
  return (
    <>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => history.goBack()}>
        Back
      </button>
    </>
  );
};

const renderViewer = (path: string): ReturnType<typeof render> =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Route path="/reduction-history/IMAT/stack-viewer">
        <IMATViewer mode="stack" showNav={false} />
        <LocationDisplay />
      </Route>
    </MemoryRouter>
  );

const mockStackResponses = (): void => {
  vi.mocked(h5Api.get).mockImplementation(async (url) => {
    if (String(url).startsWith('/find_file/')) return { data: '/data/imat' };
    if (url === '/imat/list-images') return { data: ['frame-1.tif', 'frame-2.tif'] };
    if (url === '/imat/image') {
      return {
        data: new Uint16Array([1, 2, 3, 4]).buffer,
        headers: {
          'x-image-width': '2',
          'x-image-height': '2',
          'x-original-width': '2',
          'x-original-height': '2',
        },
      };
    }
    throw new Error(`Unexpected H5 request: ${url}`);
  });
};

describe('IMATViewer stack selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    treeJob.get.mockReturnValue(makeJob(2, 2222));
    mockStackResponses();
  });

  afterEach(() => {
    cleanup();
  });

  test('hydrates and canonicalises an older deep-linked job, then clamps its image index', async () => {
    const job = makeJob(1, 1111);
    vi.mocked(fiaApi.get).mockResolvedValue({ data: job });

    renderViewer(
      '/reduction-history/IMAT/stack-viewer?jobId=1&experiment=9999&instrument=BAD&imageIndex=99&viewerSize=small'
    );

    await waitFor(() =>
      expect(fiaApi.get).toHaveBeenCalledWith('/job/1', expect.objectContaining({ signal: expect.anything() }))
    );
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('experiment=1111'));
    expect(screen.getByTestId('location')).toHaveTextContent('instrument=IMAT');

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('imageIndex=1'));
    expect(await screen.findByText('Image 2 of 2')).toBeInTheDocument();
    expect(await screen.findByTestId('heatmap')).toBeInTheDocument();
  });

  test('pushes a selected job to the URL, resets the image, and preserves viewer size', async () => {
    const user = userEvent.setup();
    renderViewer('/reduction-history/IMAT/stack-viewer?viewerSize=large&imageIndex=4');

    await user.click(screen.getByRole('button', { name: 'Select another stack' }));

    await waitFor(() => {
      const location = screen.getByTestId('location');
      expect(location).toHaveTextContent('jobId=2');
      expect(location).toHaveTextContent('experiment=2222');
      expect(location).toHaveTextContent('instrument=IMAT');
      expect(location).toHaveTextContent('viewerSize=large');
      expect(location).not.toHaveTextContent('imageIndex=');
    });
    expect(screen.getByText('Selected job: 2')).toBeInTheDocument();
  });

  test('ignores stale directory responses when users switch jobs quickly', async () => {
    const user = userEvent.setup();
    const firstJob = makeJob(1, 1111);
    const secondJob = makeJob(2, 2222);
    let resolveFirstDirectory: ((value: { data: string }) => void) | undefined;
    const firstDirectoryResponse = new Promise<{ data: string }>((resolve) => {
      resolveFirstDirectory = resolve;
    });

    vi.mocked(h5Api.get).mockImplementation(async (url, options) => {
      const requestUrl = String(url);
      if (requestUrl.includes('experiment_number/1111')) return firstDirectoryResponse;
      if (requestUrl.includes('experiment_number/2222')) return { data: '/data/new' };
      if (url === '/imat/list-images') return { data: ['new-frame.tif'] };
      if (url === '/imat/image') {
        return {
          data: new Uint16Array([1, 2, 3, 4]).buffer,
          headers: {
            'x-image-width': '2',
            'x-image-height': '2',
            'x-original-width': '2',
            'x-original-height': '2',
          },
        };
      }
      throw new Error(`Unexpected H5 request: ${url} ${JSON.stringify(options)}`);
    });

    treeJob.get.mockReturnValue(firstJob);
    renderViewer('/reduction-history/IMAT/stack-viewer');
    await user.click(screen.getByRole('button', { name: 'Select another stack' }));
    await waitFor(() =>
      expect(h5Api.get).toHaveBeenCalledWith(
        expect.stringContaining('experiment_number/1111'),
        expect.objectContaining({ signal: expect.anything() })
      )
    );

    treeJob.get.mockReturnValue(secondJob);
    await user.click(screen.getByRole('button', { name: 'Select another stack' }));
    expect(await screen.findByText('new-frame.tif')).toBeInTheDocument();

    resolveFirstDirectory?.({ data: '/data/old' });
    await waitFor(() => {
      const listedPaths = vi
        .mocked(h5Api.get)
        .mock.calls.filter(([url]) => url === '/imat/list-images')
        .map(([, options]) => options?.params.path);
      expect(listedPaths).toEqual(['/data/new/run-2']);
    });
  });

  test('rehydrates the URL-selected job when navigating back', async () => {
    const user = userEvent.setup();
    const firstJob = makeJob(1, 1111);
    const secondJob = makeJob(2, 2222);
    vi.mocked(fiaApi.get).mockImplementation(async (url) => ({
      data: String(url) === '/job/1' ? firstJob : secondJob,
    }));
    treeJob.get.mockReturnValue(secondJob);

    renderViewer('/reduction-history/IMAT/stack-viewer?jobId=1&experiment=1111&instrument=IMAT');
    expect(await screen.findByText('Selected job: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select another stack' }));
    expect(await screen.findByText('Selected job: 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Selected job: 1')).toBeInTheDocument();
    await waitFor(() => {
      const firstJobRequests = vi.mocked(fiaApi.get).mock.calls.filter(([url]) => url === '/job/1');
      expect(firstJobRequests).toHaveLength(2);
    });
  });

  test('rejects a deep link to a non-IMAT or unsuccessful job without loading stack data', async () => {
    const unavailableJob = makeJob(3, 3333);
    unavailableJob.state = 'ERROR';
    vi.mocked(fiaApi.get).mockResolvedValue({ data: unavailableJob });

    renderViewer('/reduction-history/IMAT/stack-viewer?jobId=3');

    expect(await screen.findByText('This job is not an available successful IMAT stack.')).toBeInTheDocument();
    expect(h5Api.get).not.toHaveBeenCalled();
    expect(screen.getByText('Auto select: false')).toBeInTheDocument();
  });
});
