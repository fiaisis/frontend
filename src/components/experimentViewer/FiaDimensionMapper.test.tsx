import { type DimensionMapping } from '@h5web/shared/vis-models';
import { cleanup, render, screen, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { type AxisDisplay } from './axisLabels';
import FiaDimensionMapper from './FiaDimensionMapper';

const DIMS = [50, 100, 100, 100];
// Signal (C) order for a MERLIN mdhisto: energy, L, K, H.
const MAPPING: DimensionMapping = [18, 49, 'y', 'x'];
const LABELS: AxisDisplay[] = [
  { short: 'E', long: 'Energy transfer (meV)' },
  { short: 'L', long: 'L (rtu)' },
  { short: 'K', long: 'K (rtu)' },
  { short: 'H', long: 'H (rtu)' },
];

beforeEach(() => {
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
  vi.unstubAllGlobals();
});

function renderMapper(props: Partial<React.ComponentProps<typeof FiaDimensionMapper>> = {}): RenderResult {
  return render(
    <FiaDimensionMapper dims={DIMS} dimLabels={LABELS} dimMapping={MAPPING} onChange={vi.fn()} {...props} />
  );
}

describe('FiaDimensionMapper', () => {
  test('names the dimension buttons and shows the long name on hover', () => {
    renderMapper();
    const xGroup = screen.getByRole('radiogroup', { name: 'Dimension as x axis' });

    expect(within(xGroup).getByRole('radio', { name: 'E' })).toHaveAttribute('title', 'Energy transfer (meV)');
    expect(within(xGroup).getByRole('radio', { name: 'H' })).toHaveAttribute('title', 'H (rtu)');
    expect(within(xGroup).queryByRole('radio', { name: 'D0' })).not.toBeInTheDocument();
  });

  test('marks the dimensions currently mapped to x and y as selected', () => {
    renderMapper();

    expect(
      within(screen.getByRole('radiogroup', { name: 'Dimension as x axis' })).getByRole('radio', { name: 'H' })
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      within(screen.getByRole('radiogroup', { name: 'Dimension as y axis' })).getByRole('radio', { name: 'K' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('names the slice sliders of the sliced dimensions', () => {
    renderMapper();

    expect(document.getElementById('fia-slider-0-label')).toHaveTextContent('E');
    expect(document.getElementById('fia-slider-1-label')).toHaveTextContent('L');
  });

  test('falls back to D<index> for files written before the axes were named', () => {
    renderMapper({ dimLabels: DIMS.map(() => undefined) });

    ['D0', 'D1', 'D2', 'D3'].forEach((name) => {
      expect(screen.getAllByRole('radio', { name }).at(0)).toBeInTheDocument();
    });
    expect(document.getElementById('fia-slider-0-label')).toHaveTextContent('D0');
  });

  test('reports a new mapping when another dimension is chosen for an axis', async () => {
    const onChange = vi.fn();
    renderMapper({ onChange });

    // H is dimension 3 and x is currently dimension 3; choosing E (dimension 0) for x
    // gives x to dimension 0 and leaves dimension 3 sliced at index 0.
    const xGroup = screen.getByRole('radiogroup', { name: 'Dimension as x axis' });
    await userEvent.click(within(xGroup).getByRole('radio', { name: 'E' }));

    expect(onChange).toHaveBeenCalledWith(['x', 49, 'y', 0]);
  });

  test('renders nothing without dimensions', () => {
    const { container } = renderMapper({ dims: [], dimLabels: [], dimMapping: [] });

    expect(container).toBeEmptyDOMElement();
  });

  test('rejects dimensions and mapping of different lengths', () => {
    expect(() => renderMapper({ dims: [50, 100] })).toThrow('Expected dimensions and mapping arrays of same length');
  });
});
