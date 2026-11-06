import { type DimensionMapping } from '@h5web/shared/vis-models';
import { act, cleanup, fireEvent, render, screen, within, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { type AxisDisplay } from './axisLabels';
import FiaDimensionMapper from './FiaDimensionMapper';
import FiaSlicingSlider from './FiaSlicingSlider';

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

  test('inverts x and y when choosing the dimension currently mapped to the other axis, and ignores clicking the already selected dimension', async () => {
    const onChange = vi.fn();
    renderMapper({ onChange });

    const xGroup = screen.getByRole('radiogroup', { name: 'Dimension as x axis' });
    // H is already selected on x -> no-op
    await userEvent.click(within(xGroup).getByRole('radio', { name: 'H' }));
    expect(onChange).not.toHaveBeenCalled();

    // K is currently y -> swaps x and y
    await userEvent.click(within(xGroup).getByRole('radio', { name: 'K' }));
    expect(onChange).toHaveBeenCalledWith([18, 49, 'x', 'y']);
  });

  test('updates the slice index when a slice slider is moved and forwards canSliceFast', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const canSliceFast = vi.fn(() => true);
    renderMapper({ onChange, canSliceFast });

    const sliders = screen.getAllByRole('slider');
    fireEvent.focus(sliders[0]);
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    fireEvent.keyUp(document, { key: 'ArrowUp' });

    expect(canSliceFast).toHaveBeenCalledWith([19, 49, 'y', 'x']);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onChange).toHaveBeenCalledWith([19, 49, 'y', 'x']);
    vi.useRealTimers();
  });

  test('omits the slider track when a sliced dimension has length 1 and omits the y row for 1D mapping', () => {
    renderMapper({
      dims: [1, 100],
      dimLabels: [LABELS[0], LABELS[3]],
      dimMapping: [0, 'x'],
    });

    expect(screen.queryByRole('radiogroup', { name: 'Dimension as y axis' })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(document.getElementById('fia-slider-0-label')).toHaveTextContent('E');
  });
});

describe('FiaSlicingSlider', () => {
  test('throws when given a non-positive dimension length', () => {
    expect(() =>
      render(<FiaSlicingSlider dimension={0} length={0} initialValue={0} label="E" onChange={vi.fn()} />)
    ).toThrow('Expected non-empty dimension');
  });

  test('uses the longer debounce delay when isFastSlice returns false', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(
      <FiaSlicingSlider
        dimension={0}
        length={10}
        initialValue={2}
        label="E"
        title="Energy transfer (meV)"
        isFastSlice={() => false}
        onChange={onChange}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.focus(slider);
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    fireEvent.keyUp(document, { key: 'ArrowUp' });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onChange).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
