import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import Viewer2D from './Viewer2D';
import { h5Api } from '../../lib/api';

vi.mock('@h5web/lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@h5web/lib')>()),
  HeatmapVis: () => <div data-testid="heatmap" />,
  Toolbar: ({ children }: React.PropsWithChildren) => <div role="toolbar">{children}</div>,
}));

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
