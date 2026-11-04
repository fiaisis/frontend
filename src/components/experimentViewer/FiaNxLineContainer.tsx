import { getSliceSelection, ScaleType } from '@h5web/lib';
import { assertGroup, isAxisScaleType } from '@h5web/shared/guards';
import React, { useState } from 'react';

import { getAxisDisplays } from './axisLabels';
import FiaDimensionMapper from './FiaDimensionMapper';
import { useDimMappingState } from '../../h5web/packages/app/src/dim-mapping-store';
import { useDataContext } from '../../h5web/packages/app/src/providers/DataProvider';
import { useLineConfig } from '../../h5web/packages/app/src/vis-packs/core/line/config';
import MappedLineVis from '../../h5web/packages/app/src/vis-packs/core/line/MappedLineVis';
import { type VisContainerProps } from '../../h5web/packages/app/src/vis-packs/models';
import { assertNumericLikeNxData } from '../../h5web/packages/app/src/vis-packs/nexus/guards';
import { useNxData, useNxValuesCached } from '../../h5web/packages/app/src/vis-packs/nexus/hooks';
import NxLineSignalPicker from '../../h5web/packages/app/src/vis-packs/nexus/NxLineSignalPicker';
import NxValuesFetcher from '../../h5web/packages/app/src/vis-packs/nexus/NxValuesFetcher';
import { areSameDims } from '../../h5web/packages/app/src/vis-packs/nexus/utils';
import VisBoundary from '../../h5web/packages/app/src/vis-packs/VisBoundary';
import visualizerStyles from '../../h5web/packages/app/src/visualizer/Visualizer.module.css';

/**
 * H5Web's NX line container, unchanged except that the dimension mapper is `FiaDimensionMapper`,
 * which labels each dimension with its own name instead of `D<index>`. A 4D signal can be shown as
 * a line, in which case H5Web offers one axis and three slice sliders, all of which were `D0..D3`.
 *
 * Upstream: packages/app/src/vis-packs/nexus/containers/NxLineContainer.tsx @ h5web v17.0.0-beta.1
 */
function FiaNxLineContainer(props: VisContainerProps): JSX.Element {
  const { entity, toolbarContainer } = props;
  assertGroup(entity);

  const { attrValuesStore } = useDataContext();
  const nxData = useNxData(entity);
  assertNumericLikeNxData(nxData);

  const { signalDef, axisDefs, auxDefs, defaultSlice, silxStyle } = nxData;
  const signalDims = signalDef.dataset.shape;
  const errorDims = signalDef.errorDataset?.shape;

  if (errorDims && !areSameDims(signalDims, errorDims)) {
    const dimsStr = JSON.stringify({ signalDims, errorsDims: errorDims });
    throw new Error(`Signal and errors dimensions don't match: ${dimsStr}`);
  }

  const [dimMapping, setDimMapping] = useDimMappingState({
    dims: signalDims,
    axesCount: 1,
    defaultSlice,
  });

  const auxLabels = auxDefs.map((def) => def.label);
  const axisLabels = axisDefs.map((def) => def?.label);
  const dimLabels = getAxisDisplays(axisDefs, attrValuesStore);
  const xDimIndex = dimMapping.indexOf('x');

  const [isSignalVisible, setSignalVisible] = useState(true);
  const [auxVisible, setAuxVisible] = useState(auxDefs.map(() => true));

  const config = useLineConfig({
    xScaleType: silxStyle.axisScaleTypes?.[xDimIndex],
    yScaleType: isAxisScaleType(silxStyle.signalScaleType) ? silxStyle.signalScaleType : ScaleType.Linear,
  });

  return (
    <>
      {auxDefs.length > 0 && (
        <NxLineSignalPicker
          signalLabel={signalDef.label}
          signalChecked={isSignalVisible}
          auxLabels={auxLabels}
          auxChecked={auxVisible}
          onSignalChange={setSignalVisible}
          onAuxChange={setAuxVisible}
          toolbarContainer={toolbarContainer}
        />
      )}

      <FiaDimensionMapper
        className={visualizerStyles.dimMapper}
        dims={signalDims}
        dimLabels={dimLabels}
        dimMapping={dimMapping}
        canSliceFast={useNxValuesCached(nxData)}
        onChange={setDimMapping}
      />

      <VisBoundary resetKey={dimMapping}>
        <NxValuesFetcher
          nxData={nxData}
          selection={getSliceSelection(dimMapping)}
          render={(nxValues) => {
            const { signal, errors, axisValues, auxValues, auxErrors, title } = nxValues;

            return (
              <MappedLineVis
                dataset={signalDef.dataset}
                value={signal}
                valueLabel={signalDef.label}
                valueVisible={isSignalVisible}
                errors={errors}
                auxLabels={auxLabels}
                auxValues={auxValues}
                auxErrors={auxErrors}
                auxVisible={auxVisible}
                dimMapping={dimMapping}
                axisLabels={axisLabels}
                axisValues={axisValues}
                title={title}
                toolbarContainer={toolbarContainer}
                config={config}
              />
            );
          }}
        />
      </VisBoundary>
    </>
  );
}

export default FiaNxLineContainer;
