import { type ProvidedEntity } from '@h5web/shared/hdf5-models';
import { describe, expect, test, vi } from 'vitest';

import { getAxisDisplay, getAxisDisplays, getHoverLabel } from './axisLabels';
import FiaNxHeatmapContainer from './FiaNxHeatmapContainer';
import FiaNxLineContainer from './FiaNxLineContainer';
import { withFiaContainers } from './fiaVisContainers';
import { type AttrValuesStore } from '../../h5web/packages/app/src/providers/models';
import { CORE_VIS, Vis } from '../../h5web/packages/app/src/vis-packs/core/visualizations';
import { type AxisDef } from '../../h5web/packages/app/src/vis-packs/nexus/models';
import { NX_DATA_VIS, NxDataVis } from '../../h5web/packages/app/src/vis-packs/nexus/visualizations';

describe('getAxisDisplay', () => {
  test('uses short_name and long_name when the file provides them', () => {
    expect(getAxisDisplay(0, { short_name: 'E', long_name: 'Energy transfer (meV)' })).toEqual({
      short: 'E',
      long: 'Energy transfer (meV)',
    });
  });

  test('falls back to the long name when there is no short_name', () => {
    expect(getAxisDisplay(3, { long_name: 'H (rtu)' })).toEqual({ short: 'H (rtu)', long: 'H (rtu)' });
  });

  test('falls back to the short name when there is no long_name', () => {
    expect(getAxisDisplay(1, { short_name: 'L' })).toEqual({ short: 'L', long: 'L' });
  });

  test('falls back to the dimension index for files written before axes were named', () => {
    // The scale dataset's own name must not leak in: `D0` holds the H boundaries but describes
    // signal dimension 3, so an unnamed dimension 0 has to read `D0`, never `D3`.
    expect(getAxisDisplay(0, {})).toEqual({ short: 'D0', long: 'D0' });
    expect(getAxisDisplay(3, {})).toEqual({ short: 'D3', long: 'D3' });
  });

  test('ignores empty attributes', () => {
    expect(getAxisDisplay(2, { short_name: '', long_name: '' })).toEqual({ short: 'D2', long: 'D2' });
  });

  test('ignores non-string attributes', () => {
    expect(getAxisDisplay(0, { short_name: 3, long_name: null })).toEqual({ short: 'D0', long: 'D0' });
  });
});

describe('getHoverLabel', () => {
  test('returns the long name when it adds something', () => {
    expect(getHoverLabel({ short: 'E', long: 'Energy transfer (meV)' })).toBe('Energy transfer (meV)');
  });

  test('returns nothing when there is nothing to add', () => {
    expect(getHoverLabel({ short: 'H (rtu)', long: 'H (rtu)' })).toBeUndefined();
    expect(getHoverLabel({ short: 'D1', long: 'D1' })).toBeUndefined();
  });

  test('returns nothing for a dimension with no axis', () => {
    expect(getHoverLabel(undefined)).toBeUndefined();
  });
});

describe('getAxisDisplays', () => {
  test('maps defined axis defs through the attribute store and leaves undefined entries untouched', () => {
    const d3 = { name: 'D3', path: '/data/D3' };
    const d0 = { name: 'D0', path: '/data/D0' };
    const store = {
      get: vi.fn((dataset: unknown) =>
        dataset === d3
          ? { short_name: 'E', long_name: 'Energy transfer (meV)' }
          : { short_name: 'H', long_name: 'H (rtu)' }
      ),
    } as unknown as AttrValuesStore;

    const defs = [
      { dataset: d3, label: 'Energy transfer (meV)', unit: 'meV' },
      undefined,
      { dataset: d0, label: 'H (rtu)', unit: 'rtu' },
    ] as unknown as (AxisDef | undefined)[];

    expect(getAxisDisplays(defs, store)).toEqual([
      { short: 'E', long: 'Energy transfer (meV)' },
      undefined,
      { short: 'H', long: 'H (rtu)' },
    ]);
  });
});

describe('withFiaContainers', () => {
  const entity = { name: 'data', path: '/data' } as ProvidedEntity;

  test('replaces NxHeatmap and NxLine containers and updates primaryVis when it was one of them', () => {
    const heatmap = NX_DATA_VIS[NxDataVis.NxHeatmap];
    const line = NX_DATA_VIS[NxDataVis.NxLine];
    const rgb = NX_DATA_VIS[NxDataVis.NxRGB];

    const result = withFiaContainers({
      entity,
      supportedVis: [line, heatmap, rgb],
      primaryVis: heatmap,
    });

    expect(result.supportedVis[0].Container).toBe(FiaNxLineContainer);
    expect(result.supportedVis[1].Container).toBe(FiaNxHeatmapContainer);
    expect(result.supportedVis[2]).toBe(rgb);
    expect(result.primaryVis).toBe(result.supportedVis[1]);
  });

  test('leaves unrelated visualizations and a non-matching primaryVis untouched', () => {
    const raw = CORE_VIS[Vis.Raw];
    const matrix = CORE_VIS[Vis.Matrix];

    const result = withFiaContainers({
      entity,
      supportedVis: [raw],
      primaryVis: matrix,
    });

    expect(result.supportedVis[0]).toBe(raw);
    expect(result.primaryVis).toBe(matrix);
  });
});
