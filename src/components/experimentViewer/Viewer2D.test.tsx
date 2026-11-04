import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import Viewer2D from './Viewer2D';
import { h5Api } from '../../lib/api';

vi.mock('@h5web/lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@h5web/lib')>()),
  HeatmapVis: () => <div data-testid="heatmap" />,
  LineVis: () => <div data-testid="line" />,
  Toolbar: ({ children }: React.PropsWithChildren) => <div role="toolbar">{children}</div>,
}));

const jsonBuffer = (value: unknown): ArrayBuffer =>
  new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer;

const stringAttr = (name: string): { name: string; shape: never[]; type: Record<string, unknown> } => ({
  name,
  shape: [],
  type: { class: 3, dtype: '|S8', size: 8, cset: 0, strpad: 0, vlen: false },
});

const intAttr = (name: string): { name: string; shape: never[]; type: Record<string, unknown> } => ({
  name,
  shape: [],
  type: { class: 0, dtype: '<i4', size: 4, order: 0, sign: 1 },
});

const metadata = new TextEncoder().encode(
  JSON.stringify({
    name: 'image',
    kind: 'dataset',
    shape: [2, 2],
    type: { class: 1, size: 4, order: 0 },
    chunks: null,
    filters: null,
    attributes: [],
  })
).buffer as ArrayBuffer;
const imageData = new Float32Array([1, 2, 3, 4]).buffer;

const deferred = <T,>(): { promise: Promise<T>; resolve: (value: T) => void } => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('shows disabled plot controls without requesting a file when nothing is selected', () => {
  const get = vi.spyOn(h5Api, 'get');
  render(<Viewer2D filepath={null} />);
  expect(screen.getByLabelText('Plot controls')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Grid' })).toBeDisabled();
  expect(screen.getByText('Select a file to view 2D data')).toBeInTheDocument();
  expect(get).not.toHaveBeenCalled();
});

test('keeps a toolbar through metadata loading, data loading and live refreshes without resetting settings', async () => {
  const user = userEvent.setup();
  const metaResponse = deferred<ArrayBuffer>();
  let dataResponse = deferred<ArrayBuffer>();
  const get = vi.spyOn(h5Api, 'get').mockImplementation(async (url) => ({
    data: await (url === '/meta/' ? metaResponse.promise : dataResponse.promise),
  }));
  const { rerender } = render(<Viewer2D filepath="/live/image.nxs" />);
  expect(screen.getByLabelText('Plot controls')).toBeDisabled();
  expect(screen.getByLabelText('Loading viewer data')).toBeInTheDocument();

  await act(async () => {
    metaResponse.resolve(metadata);
  });
  await screen.findByTestId('LoadingDatasetValue');
  expect(screen.getAllByRole('toolbar')).toHaveLength(1);
  expect(screen.getByLabelText('Plot controls')).toBeDisabled();

  await act(async () => {
    dataResponse.resolve(imageData);
  });
  await screen.findByTestId('heatmap');
  expect(screen.getAllByRole('toolbar')).toHaveLength(1);
  expect(screen.queryByLabelText('Plot controls')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Grid' }));
  expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'false');

  dataResponse = deferred<ArrayBuffer>();
  rerender(<Viewer2D filepath="/live/image.nxs" refreshKey={1} />);
  await screen.findByTestId('LoadingDatasetValue');
  expect(screen.getByLabelText('Plot controls')).toBeDisabled();
  await act(async () => {
    dataResponse.resolve(imageData);
  });
  await waitFor(() => expect(screen.queryByLabelText('Plot controls')).not.toBeInTheDocument());
  expect(screen.getAllByRole('toolbar')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'false');
  expect(get.mock.calls.filter(([url]) => url === '/data/')).toHaveLength(2);

  await user.click(screen.getByRole('tab', { name: 'Matrix' }));
  await waitFor(() => expect(screen.queryByLabelText('Plot controls')).not.toBeInTheDocument());
  expect(screen.getByRole('spinbutton', { name: 'Cell width' })).toBeEnabled();

  dataResponse = deferred<ArrayBuffer>();
  rerender(<Viewer2D filepath="/live/image.nxs" refreshKey={2} />);
  await screen.findByTestId('LoadingDatasetValue');
  const fallback = screen.getByLabelText('Plot controls');
  expect(within(fallback).getByRole('spinbutton', { name: 'Cell width' })).toBeDisabled();
  await act(async () => {
    dataResponse.resolve(imageData);
  });
  await waitFor(() => expect(screen.queryByLabelText('Plot controls')).not.toBeInTheDocument());
  expect(screen.getAllByRole('toolbar')).toHaveLength(1);
  expect(screen.getByRole('spinbutton', { name: 'Cell width' })).toBeEnabled();
  await user.click(screen.getByRole('tab', { name: 'Heatmap' }));
  expect(await screen.findByTestId('heatmap')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'false');
});

test('keeps disabled controls when the file contains nothing to display', async () => {
  const emptyGroup = new TextEncoder().encode(
    JSON.stringify({ name: '/', kind: 'group', children: [], attributes: [] })
  ).buffer as ArrayBuffer;
  const get = vi.spyOn(h5Api, 'get').mockResolvedValue({ data: emptyGroup });

  render(<Viewer2D filepath="/empty.nxs" />);
  expect(await screen.findByText('Nothing to display')).toBeInTheDocument();
  expect(screen.getByLabelText('Plot controls')).toBeDisabled();
  expect(screen.getAllByRole('toolbar')).toHaveLength(1);
  expect(get.mock.calls.some(([url]) => url === '/data/')).toBe(false);
});

test('keeps disabled controls after a dataset request fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(h5Api, 'get').mockImplementation(async (url) => {
    if (url === '/meta/') return { data: metadata };
    throw new Error('Data request failed');
  });

  render(<Viewer2D filepath="/broken.nxs" />);
  expect(await screen.findByText('Data request failed')).toBeInTheDocument();
  expect(screen.getByLabelText('Plot controls')).toBeDisabled();
  expect(screen.getAllByRole('toolbar')).toHaveLength(1);
  expect(screen.queryByTestId('heatmap')).not.toBeInTheDocument();
});

test('labels dimension buttons and slice sliders from the NeXus axis datasets on heatmap and line tabs', async () => {
  const user = userEvent.setup();
  const axisDatasets = [
    { name: 'D0', shape: [5] },
    { name: 'D1', shape: [5] },
    { name: 'D2', shape: [5] },
    { name: 'D3', shape: [3] },
  ].map(({ name, shape }) => ({
    name,
    kind: 'dataset',
    shape,
    type: { class: 1, dtype: '<f8', size: 8, order: 0 },
    chunks: null,
    filters: null,
    attributes: [stringAttr('long_name'), stringAttr('short_name'), stringAttr('units')],
  }));

  const dataGroup = {
    name: 'data',
    kind: 'group',
    attributes: [
      stringAttr('NX_class'),
      stringAttr('default_slice'),
      stringAttr('auxiliary_signals'),
      stringAttr('SILX_style'),
    ],
    children: [
      ...axisDatasets,
      {
        name: 'signal',
        kind: 'dataset',
        shape: [2, 4, 4, 4],
        type: { class: 1, dtype: '<f8', size: 8, order: 0 },
        chunks: null,
        filters: null,
        attributes: [stringAttr('axes'), stringAttr('long_name'), intAttr('signal')],
      },
      {
        name: 'num_events',
        kind: 'dataset',
        shape: [2, 4, 4, 4],
        type: { class: 1, dtype: '<f8', size: 8, order: 0 },
        chunks: null,
        filters: null,
        attributes: [],
      },
    ],
  };

  const rootGroup = {
    name: '/',
    kind: 'group',
    attributes: [stringAttr('NX_class')],
    children: [
      {
        name: 'MDHistoWorkspace',
        kind: 'group',
        attributes: [stringAttr('NX_class')],
        children: [dataGroup],
      },
    ],
  };

  const attrsByPath: Record<string, Record<string, unknown>> = {
    '/': { NX_class: 'NXroot' },
    '/MDHistoWorkspace': { NX_class: 'NXentry' },
    '/MDHistoWorkspace/data': {
      NX_class: 'NXdata',
      default_slice: ['1', '2', '.', '.'],
      auxiliary_signals: ['num_events'],
      SILX_style: JSON.stringify({ signal_scale_type: 'log' }),
    },
    '/MDHistoWorkspace/data/signal': { axes: 'D3:D2:D1:D0', long_name: 'S(Q,E) (a.u.)', signal: 1 },
    '/MDHistoWorkspace/data/D0': { long_name: 'H (rtu)', short_name: 'H', units: 'rtu' },
    '/MDHistoWorkspace/data/D1': { long_name: 'K (rtu)', short_name: 'K', units: 'rtu' },
    '/MDHistoWorkspace/data/D2': { long_name: 'L (rtu)', short_name: 'L', units: 'rtu' },
    '/MDHistoWorkspace/data/D3': { long_name: 'Energy transfer (meV)', short_name: 'E', units: 'meV' },
  };

  vi.spyOn(h5Api, 'get').mockImplementation(async (url, config) => {
    const path = (config?.params as { path?: string } | undefined)?.path ?? '/';
    if (url === '/meta/') {
      if (path === '/MDHistoWorkspace/data') return { data: jsonBuffer(dataGroup) };
      if (path === '/MDHistoWorkspace') return { data: jsonBuffer(rootGroup.children[0]) };
      return { data: jsonBuffer(rootGroup) };
    }
    if (url === '/attr/') {
      return { data: jsonBuffer(attrsByPath[path] ?? {}) };
    }
    if (path === '/MDHistoWorkspace/data/D3') return { data: new Float64Array(3).buffer };
    if (path.startsWith('/MDHistoWorkspace/data/D')) return { data: new Float64Array(5).buffer };
    return { data: new Float64Array(16).buffer };
  });

  render(<Viewer2D filepath="/live/MERlives_30meV_1to1_mdhisto.nxs" />);
  expect(await screen.findByTestId('heatmap')).toBeInTheDocument();

  const xGroup = screen.getByRole('radiogroup', { name: 'Dimension as x axis' });
  const yGroup = screen.getByRole('radiogroup', { name: 'Dimension as y axis' });
  expect(within(xGroup).getByRole('radio', { name: 'H' })).toHaveAttribute('aria-checked', 'true');
  expect(within(xGroup).getByRole('radio', { name: 'E' })).toHaveAttribute('title', 'Energy transfer (meV)');
  expect(within(yGroup).getByRole('radio', { name: 'K' })).toHaveAttribute('aria-checked', 'true');
  expect(within(xGroup).queryByRole('radio', { name: 'D0' })).not.toBeInTheDocument();
  expect(document.getElementById('fia-slider-0-label')).toHaveTextContent('E');
  expect(document.getElementById('fia-slider-1-label')).toHaveTextContent('L');

  await user.click(screen.getByRole('tab', { name: 'NX Line' }));
  expect(await screen.findByTestId('line')).toBeInTheDocument();
  expect(document.getElementById('fia-slider-0-label')).toHaveTextContent('E');
  expect(document.getElementById('fia-slider-1-label')).toHaveTextContent('L');
  expect(document.getElementById('fia-slider-2-label')).toHaveTextContent('K');
});

test('renders complex NeXus signals on the heatmap tab with named dimension controls', async () => {
  const dataGroup = {
    name: 'data',
    kind: 'group',
    attributes: [stringAttr('NX_class')],
    children: [
      {
        name: 'D0',
        kind: 'dataset',
        shape: [3],
        type: { class: 1, dtype: '<f8', size: 8, order: 0 },
        chunks: null,
        filters: null,
        attributes: [stringAttr('long_name'), stringAttr('short_name')],
      },
      {
        name: 'D1',
        kind: 'dataset',
        shape: [3],
        type: { class: 1, dtype: '<f8', size: 8, order: 0 },
        chunks: null,
        filters: null,
        attributes: [stringAttr('long_name'), stringAttr('short_name')],
      },
      {
        name: 'signal',
        kind: 'dataset',
        shape: [2, 2],
        type: {
          class: 6,
          size: 8,
          members: {
            r: { class: 1, dtype: '<f4', size: 4, order: 0 },
            i: { class: 1, dtype: '<f4', size: 4, order: 0 },
          },
        },
        chunks: null,
        filters: null,
        attributes: [stringAttr('axes'), intAttr('signal')],
      },
    ],
  };

  const attrsByPath: Record<string, Record<string, unknown>> = {
    '/': { NX_class: 'NXdata' },
    '/signal': { axes: 'D1:D0', signal: 1 },
    '/D0': { long_name: 'H (rtu)', short_name: 'H' },
    '/D1': { long_name: 'K (rtu)', short_name: 'K' },
  };

  vi.spyOn(h5Api, 'get').mockImplementation(async (url, config) => {
    const path = (config?.params as { path?: string } | undefined)?.path ?? '/';
    if (url === '/meta/') return { data: jsonBuffer(dataGroup) };
    if (url === '/attr/') return { data: jsonBuffer(attrsByPath[path] ?? {}) };
    if (path === '/signal') {
      return {
        data: jsonBuffer([
          [1, 0],
          [0, 1],
          [1, 1],
          [2, 0],
        ]),
      };
    }
    return { data: new Float64Array(3).buffer };
  });

  render(<Viewer2D filepath="/live/complex.nxs" />);
  expect(await screen.findByTestId('heatmap')).toBeInTheDocument();
  const xGroup = screen.getByRole('radiogroup', { name: 'Dimension as x axis' });
  expect(within(xGroup).getByRole('radio', { name: 'H' })).toHaveAttribute('aria-checked', 'true');
});

test('shows an error when signal and error dataset dimensions do not match on the line tab', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const dataGroup = {
    name: 'data',
    kind: 'group',
    attributes: [stringAttr('NX_class')],
    children: [
      {
        name: 'signal',
        kind: 'dataset',
        shape: [4],
        type: { class: 1, dtype: '<f8', size: 8, order: 0 },
        chunks: null,
        filters: null,
        attributes: [intAttr('signal')],
      },
      {
        name: 'signal_errors',
        kind: 'dataset',
        shape: [3],
        type: { class: 1, dtype: '<f8', size: 8, order: 0 },
        chunks: null,
        filters: null,
        attributes: [],
      },
    ],
  };

  vi.spyOn(h5Api, 'get').mockImplementation(async (url) => {
    if (url === '/meta/') return { data: jsonBuffer(dataGroup) };
    if (url === '/attr/') return { data: jsonBuffer({ NX_class: 'NXdata', signal: 1 }) };
    return { data: new Float64Array(4).buffer };
  });

  render(<Viewer2D filepath="/live/mismatch.nxs" />);
  expect(await screen.findByText(/Signal and errors dimensions don't match/)).toBeInTheDocument();
});
