import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ndarray from 'ndarray';
import React from 'react';
import { OrthographicCamera, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ImatStackPlot from './ImatStackPlot';

import type { ViewerSize } from './ImatStackPlot';
import type { NdArray } from 'ndarray';

type PlotProps = React.ComponentProps<typeof ImatStackPlot>;
type WheelInput = { sourceEvent: WheelEvent; worldPt: Vector3 };

const scene = vi.hoisted(() => ({
  camera: undefined as unknown as OrthographicCamera,
  visSize: { width: 1024, height: 512 },
  invalidate: vi.fn(),
  moveCameraTo: vi.fn<(position: Vector3) => void>(),
  shouldZoom: vi.fn<() => boolean>(),
  wheel: vi.fn<(event: WheelInput) => void>() as (event: WheelInput) => void,
  tooltipCoords: [1024, 512] as [number, number],
  canvas: vi.fn(),
  heatmap: vi.fn(),
  colorBar: vi.fn(),
}));

// Keep real camera math, replacing only the WebGL renderer and its event/frame hooks.
// Cypress tests separately verify the rendered pixels and browser interactions.
vi.mock('@react-three/fiber', () => ({
  useThree: (select: (state: typeof scene) => unknown) => select(scene),
}));

vi.mock('@h5web/lib', () => ({
  VisCanvas: ({ children, ...props }: React.PropsWithChildren) => {
    scene.canvas(props);
    return <div>{children}</div>;
  },
  HeatmapMesh: (props: unknown) => {
    scene.heatmap(props);
    return null;
  },
  ColorBar: (props: unknown) => {
    scene.colorBar(props);
    return null;
  },
  DefaultInteractions: () => null,
  FloatingControl: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TooltipMesh: ({ renderTooltip }: { renderTooltip: (x: number, y: number) => React.ReactNode }) => (
    <div role="tooltip">{renderTooltip(...scene.tooltipCoords)}</div>
  ),
  ScaleType: { Linear: 'linear' },
  useVisCanvasContext: () => ({ visSize: scene.visSize }),
  useInteraction: () => scene.shouldZoom,
  useCanvasEvent: (_name: string, listener: (event: WheelInput) => void) => {
    scene.wheel = listener;
  },
  useCameraState: (select: (camera: OrthographicCamera) => boolean) => select(scene.camera),
}));

vi.mock('../../h5web/packages/lib/src/interactions/hooks', () => ({
  useMoveCameraTo: () => scene.moveCameraTo,
  useWheelCapture: vi.fn(),
}));

vi.mock('../../h5web/packages/lib/src/vis/heatmap/hooks', () => ({
  useTextureSafeNdArray: (values: NdArray<Float32Array>) => values,
}));

const renderPlot = (overrides: Partial<PlotProps> = {}): { update: (changes?: Partial<PlotProps>) => void } => {
  const props: PlotProps = {
    dataArray: ndarray(new Float32Array([10, 20, 30, 40, 50, 60, 70, 80]), [2, 4]),
    originalWidth: 2048,
    originalHeight: 1024,
    viewerSize: 'full',
    domain: [0, 100],
    ...overrides,
  };
  const { rerender } = render(<ImatStackPlot {...props} />);
  const update = (changes: Partial<PlotProps> = {}): void => {
    Object.assign(props, changes);
    rerender(<ImatStackPlot {...props} />);
  };
  // In the browser, H5Web observes camera changes on the next rendered frame.
  update();
  return { update };
};

const wheel = (deltaY: number, worldPt = new Vector3()): void => {
  act(() => scene.wheel({ sourceEvent: new WheelEvent('wheel', { deltaY }), worldPt }));
};

beforeEach(() => {
  vi.clearAllMocks();
  scene.camera = new OrthographicCamera();
  scene.camera.position.set(40, -30, 10);
  scene.visSize = { width: 1024, height: 512 };
  scene.tooltipCoords = [1024, 512];
  scene.shouldZoom.mockReturnValue(true);
  scene.moveCameraTo.mockImplementation((position) => {
    scene.camera.position.set(position.x, position.y, scene.camera.position.z);
    scene.camera.updateMatrixWorld();
    scene.invalidate();
  });
});

afterEach(cleanup);

describe('IMAT stack camera controls', () => {
  test.each<[ViewerSize, number]>([
    ['fit', 1],
    ['small', 2],
    ['medium', 1],
    ['large', 2 / 3],
    ['full', 0.5],
  ])('centres the image at the %s preset', (viewerSize, expectedScale) => {
    renderPlot({ viewerSize });
    expect(scene.camera.scale.toArray()).toEqual([expectedScale, expectedScale, 1]);
    expect(scene.camera.position.toArray()).toEqual([0, 0, 10]);
    expect(scene.camera.matrixWorld.elements[0]).toBeCloseTo(expectedScale);
    expect(scene.invalidate).toHaveBeenCalled();
    expect(screen.getByText('Reset zoom').closest('button')).not.toBeVisible();
  });

  test('accounts for the limiting viewport dimension', () => {
    scene.visSize = { width: 800, height: 800 };
    renderPlot();
    expect(scene.camera.scale.x).toBe(800 / 1024);
    expect(scene.camera.scale.y).toBe(800 / 1024);
  });

  test('zooms around the pointer and cannot zoom out beyond the selected preset', () => {
    const plot = renderPlot();
    wheel(-100, new Vector3(100, 50));
    expect(scene.camera.scale.x).toBeCloseTo(0.475);
    expect(scene.camera.position.x).toBeCloseTo(5);
    expect(scene.camera.position.y).toBeCloseTo(2.5);
    plot.update();
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeVisible();

    wheel(100, new Vector3(100, 50));
    wheel(100, new Vector3(100, 50));
    expect(scene.camera.scale.x).toBeCloseTo(0.5);
    expect(scene.camera.position.x).toBeCloseTo(0);
    expect(scene.camera.position.y).toBeCloseTo(0);
  });

  test('ignores wheel input when another interaction owns it or there is no vertical movement', () => {
    renderPlot();
    scene.shouldZoom.mockReturnValue(false);
    wheel(-100);
    scene.shouldZoom.mockReturnValue(true);
    wheel(0);
    expect(scene.camera.scale.x).toBe(0.5);
    expect(scene.moveCameraTo).not.toHaveBeenCalled();
  });

  test('preserves extra magnification when the viewport is resized', () => {
    const plot = renderPlot({ viewerSize: 'medium' });
    wheel(-100);
    scene.visSize = { width: 2048, height: 1024 };
    plot.update();
    expect(scene.camera.scale.toArray()).toEqual([1.9, 1.9, 1]);
    expect(2048 / scene.camera.scale.x).toBeCloseTo(1024 / 0.95);
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(scene.camera.scale.toArray()).toEqual([2, 2, 1]);
  });

  test.each([
    { name: 'horizontal zoom', scale: [0.25, 0.5], position: [0, 0] },
    { name: 'vertical zoom', scale: [0.5, 0.25], position: [0, 0] },
    { name: 'horizontal pan', scale: [0.5, 0.5], position: [20, 0] },
    { name: 'vertical pan', scale: [0.5, 0.5], position: [0, -20] },
  ])('resets after $name alone', ({ scale, position }) => {
    const plot = renderPlot();
    scene.camera.scale.set(scale[0], scale[1], 1);
    scene.camera.position.set(position[0], position[1], 10);
    plot.update();
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(scene.camera.scale.toArray()).toEqual([0.5, 0.5, 1]);
    expect(scene.camera.position.toArray()).toEqual([0, 0, 10]);
    plot.update();
    expect(screen.getByText('Reset zoom').closest('button')).not.toBeVisible();
  });

  test('preserves zoom and pan across frames, previews and intensity changes but resets on preset changes', () => {
    const plot = renderPlot();
    wheel(-100);
    scene.camera.position.set(12, -8, 10);
    const preview = ndarray(new Float32Array([21, 42]), [1, 2]);
    plot.update({ dataArray: preview, domain: [0, 50] });
    expect(scene.camera.scale.x).toBeCloseTo(0.475);
    expect(scene.camera.position.toArray()).toEqual([12, -8, 10]);
    expect(scene.heatmap).toHaveBeenLastCalledWith(expect.objectContaining({ values: preview, domain: [0, 50] }));
    expect(scene.colorBar).toHaveBeenLastCalledWith(expect.objectContaining({ domain: [0, 50] }));

    plot.update({ viewerSize: 'small' });
    expect(scene.camera.scale.toArray()).toEqual([2, 2, 1]);
    expect(scene.camera.position.toArray()).toEqual([0, 0, 10]);
  });

  test.each([0, Number.NaN, Number.POSITIVE_INFINITY])('waits for valid viewport dimensions (%s)', (size) => {
    scene.visSize = { width: size, height: size };
    const plot = renderPlot();
    expect(scene.camera.scale.toArray()).toEqual([1, 1, 1]);
    expect(scene.invalidate).not.toHaveBeenCalled();
    if (size === 0) {
      wheel(-100);
      expect(scene.moveCameraTo).not.toHaveBeenCalled();
    }
    scene.visSize = { width: 1024, height: 512 };
    plot.update();
    expect(scene.camera.scale.x).toBe(0.5);
    expect(scene.camera.position.toArray()).toEqual([0, 0, 10]);
  });
});

describe('IMAT stack coordinates', () => {
  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to sampled dimensions when original dimensions are invalid (%s)',
    (size) => {
      renderPlot({ originalWidth: size, originalHeight: size });
      expect(scene.canvas).toHaveBeenLastCalledWith(
        expect.objectContaining({
          abscissaConfig: { visDomain: [0, 4], isIndexAxis: true },
          ordinateConfig: { visDomain: [0, 2], isIndexAxis: true, flip: true },
        })
      );
      expect(scene.camera.scale.x).toBe(256);
    }
  );

  test('maps original coordinates to sampled values, including preview frames', () => {
    const plot = renderPlot();
    expect(screen.getByRole('figure', { name: 'IMAT stack image' })).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('x=1024, y=512');
    expect(screen.getByRole('tooltip').querySelector('strong')).toHaveTextContent('70');
    plot.update({ dataArray: ndarray(new Float32Array([21, 42]), [1, 2]) });
    expect(screen.getByRole('tooltip')).toHaveTextContent('x=1024, y=512');
    expect(screen.getByRole('tooltip').querySelector('strong')).toHaveTextContent('42');
    expect(scene.canvas).toHaveBeenLastCalledWith(
      expect.objectContaining({
        abscissaConfig: { visDomain: [0, 2048], isIndexAxis: true },
        ordinateConfig: { visDomain: [0, 1024], isIndexAxis: true, flip: true },
      })
    );
  });

  test.each<[[number, number], string, string]>([
    [[-1, -1], 'x=-1, y=-1', '10'],
    [[2048, 1024], 'x=2048, y=1024', '80'],
    [[1023.9, 511.9], 'x=1023, y=511', '20'],
  ])('clamps sampled indices and floors displayed coordinates at %j', (coords, label, value) => {
    scene.tooltipCoords = coords;
    renderPlot();
    expect(screen.getByRole('tooltip')).toHaveTextContent(label);
    expect(screen.getByRole('tooltip').querySelector('strong')).toHaveTextContent(value);
  });
});
