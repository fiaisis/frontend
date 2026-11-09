import { ToggleGroup } from '@h5web/lib';
import { type Axis, type DimensionMapping } from '@h5web/shared/vis-models';
import React, { type HTMLAttributes } from 'react';

import { type AxisDisplay, getHoverLabel } from './axisLabels';
import FiaSlicingSlider from './FiaSlicingSlider';
import styles from '../../h5web/packages/lib/src/dimension-mapper/DimensionMapper.module.css';

/**
 * Copy of H5Web's `DimensionMapper`, which labels every dimension `D<index>` and only reveals the
 * resolved axis name in a hover `hint`. Here the button and the slice slider both carry the
 * dimension's own name, with the longer name on hover.
 *
 * Upstream: packages/lib/src/dimension-mapper/{DimensionMapper,AxisMapper}.tsx @ h5web v17.0.0-beta.1
 */

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  dims: number[];
  dimLabels: (AxisDisplay | undefined)[];
  dimMapping: DimensionMapping;
  canSliceFast?: (nextMapping: DimensionMapping) => boolean;
  onChange: (dimMapping: DimensionMapping) => void;
}

interface MapperProps {
  axis: Axis;
  dimLabels: (AxisDisplay | undefined)[];
  dimMapping: DimensionMapping;
  onChange: (dimMapping: DimensionMapping) => void;
}

function AxisMapper(props: MapperProps): JSX.Element | null {
  const { axis, dimLabels, dimMapping, onChange } = props;
  const selectedDim = dimMapping.indexOf(axis);

  if (selectedDim === -1) {
    return null;
  }

  return (
    <div className={styles.axisMapper}>
      <span className={styles.axisLabel}>{axis}</span>
      <ToggleGroup
        role="radiogroup"
        ariaLabel={`Dimension as ${axis} axis`}
        value={selectedDim.toString()}
        onChange={(val) => {
          const newDim = Number(val);
          if (selectedDim !== newDim) {
            const newMapping = [...dimMapping];

            // Invert mappings or reset slicing index of previously selected dimension
            newMapping[selectedDim] = typeof dimMapping[newDim] === 'number' ? 0 : dimMapping[newDim];
            newMapping[newDim] = axis; // assign axis to newly selected dimension

            onChange(newMapping);
          }
        }}
      >
        {dimMapping.map((val, i) => {
          const display = dimLabels[i];

          return (
            <ToggleGroup.Btn
              key={i} // eslint-disable-line react/no-array-index-key
              label={display?.short ?? `D${i}`}
              value={i.toString()}
              disabled={val === null} // locked dimension
              hint={getHoverLabel(display)}
            />
          );
        })}
      </ToggleGroup>
    </div>
  );
}

function FiaDimensionMapper(props: Props): JSX.Element | null {
  const { className, dims, dimLabels, dimMapping, canSliceFast, onChange, ...htmlProps } = props;

  if (dims.length !== dimMapping.length) {
    throw new Error('Expected dimensions and mapping arrays of same length');
  }

  if (dimMapping.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.mapper} ${className ?? ''}`} {...htmlProps}>
      <div className={styles.axisMapperWrapper}>
        <div className={styles.dims}>
          <span className={styles.dimsLabel}>
            <abbr title="Number of elements in each dimension">n</abbr>
          </span>
          {dims.map((d, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} className={styles.dimSize}>
              {' '}
              {d}
            </span>
          ))}
        </div>
        <AxisMapper axis="x" dimLabels={dimLabels} dimMapping={dimMapping} onChange={onChange} />
        <AxisMapper axis="y" dimLabels={dimLabels} dimMapping={dimMapping} onChange={onChange} />
      </div>
      <div className={styles.sliders}>
        {dimMapping.map((val, index) =>
          typeof val === 'number' ? (
            <FiaSlicingSlider
              key={index} // eslint-disable-line react/no-array-index-key
              dimension={index}
              length={dims[index]}
              initialValue={val}
              label={dimLabels[index]?.short ?? `D${index}`}
              title={getHoverLabel(dimLabels[index])}
              isFastSlice={
                canSliceFast &&
                ((newVal) => {
                  const newMapping = [...dimMapping];
                  newMapping[index] = newVal;
                  return canSliceFast(newMapping);
                })
              }
              onChange={(newVal) => {
                const newMapping = [...dimMapping];
                newMapping[index] = newVal;
                onChange(newMapping);
              }}
            />
          ) : undefined
        )}
      </div>
    </div>
  );
}

export default FiaDimensionMapper;
