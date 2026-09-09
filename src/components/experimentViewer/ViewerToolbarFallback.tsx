import { Box } from '@mui/material';
import React from 'react';

import { useHeatmapConfig } from '../../h5web/packages/app/src/vis-packs/core/heatmap/config';
import HeatmapToolbar from '../../h5web/packages/app/src/vis-packs/core/heatmap/HeatmapToolbar';
import { useLineConfig } from '../../h5web/packages/app/src/vis-packs/core/line/config';
import LineToolbar from '../../h5web/packages/app/src/vis-packs/core/line/LineToolbar';
import { useMatrixConfig } from '../../h5web/packages/app/src/vis-packs/core/matrix/config';
import MatrixToolbar from '../../h5web/packages/app/src/vis-packs/core/matrix/MatrixToolbar';
import { useRawConfig } from '../../h5web/packages/app/src/vis-packs/core/raw/config';
import RawToolbar from '../../h5web/packages/app/src/vis-packs/core/raw/RawToolbar';
import { useRgbConfig } from '../../h5web/packages/app/src/vis-packs/core/rgb/config';
import RgbToolbar from '../../h5web/packages/app/src/vis-packs/core/rgb/RgbToolbar';

import type { VisDef } from '../../h5web/packages/app/src/vis-packs/models';

const ViewerToolbarFallback: React.FC<{ vis?: VisDef }> = ({ vis }) => {
  const heatmapConfig = useHeatmapConfig();
  const lineConfig = useLineConfig();
  const matrixConfig = useMatrixConfig();
  const rawConfig = useRawConfig();
  const rgbConfig = useRgbConfig();

  return (
    <Box
      component="fieldset"
      disabled
      aria-label="Plot controls"
      {...{ inert: '' }}
      sx={{ display: 'flex', flex: '1 1 auto', minWidth: 0, border: 0, p: 0, m: 0, opacity: 0.6 }}
    >
      {vis?.name.includes('Line') ? (
        <LineToolbar dataDomain={[0.1, 1]} config={lineConfig} />
      ) : vis?.name.includes('RGB') ? (
        <RgbToolbar config={rgbConfig} />
      ) : vis?.name === 'Matrix' || vis?.name === 'Compound' ? (
        <MatrixToolbar cellWidth={100} isSlice={false} config={matrixConfig} exportEntries={[]} />
      ) : vis?.name === 'Raw' ? (
        <RawToolbar isImage={false} config={rawConfig} exportEntries={[]} />
      ) : (
        <HeatmapToolbar dataDomain={[0.1, 1]} config={heatmapConfig} />
      )}
    </Box>
  );
};

export default ViewerToolbarFallback;
