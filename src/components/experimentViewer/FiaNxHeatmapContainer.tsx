import { getSliceSelection } from '@h5web/lib';
import {
  assertDatasetValue,
  assertGroup,
  assertMinDims,
  assertNumericLikeType,
  hasComplexType,
} from '@h5web/shared/guards';
import React, { useState } from 'react';

import { getAxisDisplays } from './axisLabels';
import FiaDimensionMapper from './FiaDimensionMapper';
import { useDimMappingState } from '../../h5web/packages/app/src/dim-mapping-store';
import { useDataContext } from '../../h5web/packages/app/src/providers/DataProvider';
import MappedComplexHeatmapVis from '../../h5web/packages/app/src/vis-packs/core/complex/MappedComplexHeatmapVis';
import { useHeatmapConfig } from '../../h5web/packages/app/src/vis-packs/core/heatmap/config';
import MappedHeatmapVis from '../../h5web/packages/app/src/vis-packs/core/heatmap/MappedHeatmapVis';
import { type VisContainerProps } from '../../h5web/packages/app/src/vis-packs/models';
import {
  useNxData,
  useNxHeatmapDataToFetch,
  useNxValuesCached,
} from '../../h5web/packages/app/src/vis-packs/nexus/hooks';
import NxHeatmapSignalPicker from '../../h5web/packages/app/src/vis-packs/nexus/NxHeatmapSignalPicker';
import NxValuesFetcher from '../../h5web/packages/app/src/vis-packs/nexus/NxValuesFetcher';
import { guessKeepRatio } from '../../h5web/packages/app/src/vis-packs/nexus/utils';
import VisBoundary from '../../h5web/packages/app/src/vis-packs/VisBoundary';
import visualizerStyles from '../../h5web/packages/app/src/visualizer/Visualizer.module.css';

/**
 * H5Web's NX heatmap container, unchanged except that the dimension mapper is `FiaDimensionMapper`,
 * which labels each dimension with its own name instead of `D<index>`. The plot itself is still
 * H5Web's, so axis titles, tooltips and the signal picker behave exactly as before.
 *
 * Upstream: packages/app/src/vis-packs/nexus/containers/NxHeatmapContainer.tsx @ h5web v17.0.0-beta.1
 */
function FiaNxHeatmapContainer(props: VisContainerProps): JSX.Element {
  const { entity, toolbarContainer } = props;
  assertGroup(entity);

  const { attrValuesStore } = useDataContext();
  const nxData = useNxData(entity);

  const { signalDef, axisDefs, auxDefs, defaultSlice, silxStyle } = nxData;
  const [selectedDef, setSelectedDef] = useState(signalDef);
  const { dataset: selectedDataset } = selectedDef;

  assertMinDims(selectedDataset, 2);
  const { shape: dims } = selectedDataset;
  const [dimMapping, setDimMapping] = useDimMappingState({ dims, axesCount: 2, defaultSlice });

  const axisLabels = axisDefs.map((def) => def?.label);
  const dimLabels = getAxisDisplays(axisDefs, attrValuesStore);
  const xAxisDef = axisDefs[dimMapping.indexOf('x')];
  const yAxisDef = axisDefs[dimMapping.indexOf('y')];

  const config = useHeatmapConfig({
    scaleType: silxStyle.signalScaleType,
    keepRatio: guessKeepRatio(xAxisDef, yAxisDef),
  });

  const nxDataToFetch = useNxHeatmapDataToFetch(nxData, selectedDef);

  return (
    <>
      {auxDefs.length > 0 && (
        <NxHeatmapSignalPicker
          definitions={[signalDef, ...auxDefs]}
          value={selectedDef}
          onChange={setSelectedDef}
          toolbarContainer={toolbarContainer}
        />
      )}

      <FiaDimensionMapper
        className={visualizerStyles.dimMapper}
        dims={dims}
        dimLabels={dimLabels}
        dimMapping={dimMapping}
        canSliceFast={useNxValuesCached(nxData)}
        onChange={setDimMapping}
      />

      <VisBoundary resetKey={dimMapping}>
        <NxValuesFetcher
          nxData={nxDataToFetch}
          selection={getSliceSelection(dimMapping)}
          render={(nxValues) => {
            const { signal, axisValues, title } = nxValues;

            if (hasComplexType(selectedDataset)) {
              assertDatasetValue(signal, selectedDataset);

              return (
                <MappedComplexHeatmapVis
                  value={signal}
                  dims={dims}
                  dimMapping={dimMapping}
                  axisLabels={axisLabels}
                  axisValues={axisValues}
                  title={title}
                  toolbarContainer={toolbarContainer}
                  config={config}
                />
              );
            }

            assertNumericLikeType(selectedDataset);
            assertDatasetValue(signal, selectedDataset);

            return (
              <MappedHeatmapVis
                dataset={selectedDataset}
                value={signal}
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

export default FiaNxHeatmapContainer;
