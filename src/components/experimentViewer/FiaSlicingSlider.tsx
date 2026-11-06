import { useMeasure } from '@react-hookz/web';
import React, { useState } from 'react';
import ReactSlider from 'react-slider';

import { useDynamicDebouncedCallback } from '../../h5web/packages/lib/src/dimension-mapper/hooks';
import styles from '../../h5web/packages/lib/src/dimension-mapper/SlicingSlider.module.css';

/**
 * Copy of H5Web's `SlicingSlider`, which labels a sliced dimension `D<index>` and gives no way of
 * passing a name in. Everything except the label is taken from the vendored source unchanged,
 * including its stylesheet, so the slider looks and behaves exactly as before.
 *
 * Upstream: packages/lib/src/dimension-mapper/SlicingSlider.tsx @ h5web v17.0.0-beta.1
 */

const ID = 'fia-slider';
const MIN_HEIGHT_PER_MARK = 25;
const SHORT_DELAY = 20;
const LONG_DELAY = 250;

interface Props {
  dimension: number;
  length: number;
  initialValue: number;
  /** Name of the dimension, e.g. `E`. */
  label: string;
  /** Longer name to reveal on hover, e.g. `Energy transfer (meV)`. */
  title?: string;
  isFastSlice?: (value: number) => boolean;
  onChange: (value: number) => void;
}

function FiaSlicingSlider(props: Props): JSX.Element {
  const { dimension, length, initialValue, label, title, isFastSlice, onChange } = props;

  if (length <= 0) {
    throw new Error('Expected non-empty dimension');
  }

  const [value, setValue] = useState(initialValue);
  const onDebouncedChange = useDynamicDebouncedCallback(onChange, [onChange], (val) =>
    isFastSlice?.(val) ? SHORT_DELAY : LONG_DELAY
  );

  const [containerSize, containerRef] = useMeasure<HTMLDivElement>();
  const sliderLabelId = `${ID}-${dimension}-label`;

  return (
    <div key={dimension} ref={containerRef} className={styles.container}>
      <span id={sliderLabelId} className={styles.label} title={title}>
        {label}
      </span>
      <span className={styles.sublabel}>0:{length - 1}</span>
      {length > 1 ? (
        <ReactSlider
          className={styles.slider}
          ariaLabelledby={sliderLabelId}
          min={0}
          max={length - 1}
          step={1}
          marks={containerSize && containerSize.height / length >= MIN_HEIGHT_PER_MARK}
          markClassName={styles.mark}
          orientation="vertical"
          invert
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
            onDebouncedChange(newValue);
          }}
          /* When slicing in E2E tests, `onChange` is called with the old value.
             The `onChange` event is fired via a `setState` callback in `ReactSlider`:
             https://github.com/zillow/react-slider/blob/master/src/components/ReactSlider/ReactSlider.jsx#L908
             Adding `onAfterChange` fixes the issue for now with react-slider@2.0.4, but not with react-slider@2.0.5+ */
          onAfterChange={(newValue) => {
            setValue(newValue);
            onDebouncedChange(newValue);
          }}
          renderThumb={({ key, ...thumbProps }, state) => (
            <div key={key} {...thumbProps} className={styles.thumb}>
              <span className={styles.thumbValue}>{state.valueNow}</span>
            </div>
          )}
          renderTrack={({ key }, { index }) => (index === 0 ? <div key={key} className={styles.track} /> : null)}
        />
      ) : null}
    </div>
  );
}

export default FiaSlicingSlider;
