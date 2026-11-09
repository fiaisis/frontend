import { type AttributeValues } from '@h5web/shared/hdf5-models';

import { type AttrValuesStore } from '../../h5web/packages/app/src/providers/models';
import { type AxisDef } from '../../h5web/packages/app/src/vis-packs/nexus/models';

/** Custom NeXus attribute written alongside `long_name` by the MERLIN reduction script. */
export const SHORT_NAME_ATTR = 'short_name';

/** Text to show on a dimension button/slider, and the text to show on hover. */
export interface AxisDisplay {
  short: string;
  long: string;
}

/**
 * Labels for one signal dimension, taken from its axis scale dataset.
 *
 * `short_name`/`long_name` are only present in files written after the reduction scripts started
 * labelling their axes, so everything falls back to the dimension index `D<i>` that H5Web has
 * always shown. Note that `index` is the index of the dimension in the signal, which is *not* the
 * number in the scale dataset's name (`D0` holds the H boundaries but describes the *last*
 * dimension of the signal).
 *
 * H5Web's own `getDatasetInfo` falls back to the dataset *name*, which would put `D3` on the button
 * for signal dimension 0, so the attributes are read directly rather than via that label.
 */
export function getAxisDisplay(index: number, attrValues: AttributeValues): AxisDisplay {
  const fallback = `D${index}`;
  const nonEmpty = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

  const shortName = nonEmpty(attrValues[SHORT_NAME_ATTR]);
  const longName = nonEmpty(attrValues.long_name);

  const long = longName ?? shortName ?? fallback;
  const short = shortName ?? long;

  return { short, long };
}

/** Labels for every signal dimension, in signal (C) order, `undefined` where there is no axis. */
export function getAxisDisplays(
  axisDefs: (AxisDef | undefined)[],
  attrValuesStore: AttrValuesStore
): (AxisDisplay | undefined)[] {
  return axisDefs.map((def, index) => (def ? getAxisDisplay(index, attrValuesStore.get(def.dataset)) : undefined));
}

/** `H (rtu)` for a button already labelled `H`, but the full label when there is nothing to add. */
export function getHoverLabel(display: AxisDisplay | undefined): string | undefined {
  if (!display) {
    return undefined;
  }

  return display.long === display.short ? undefined : display.long;
}
