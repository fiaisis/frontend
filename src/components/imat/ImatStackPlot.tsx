import '@h5web/lib/styles.css';
import {
  ColorBar,
  DefaultInteractions,
  FloatingControl,
  HeatmapMesh,
  ScaleType,
  TooltipMesh,
  useCameraState,
  useCanvasEvent,
  useInteraction,
  useVisCanvasContext,
  VisCanvas,
} from '@h5web/lib';
import { formatTooltipVal } from '@h5web/shared/vis-utils';
import { useThree } from '@react-three/fiber';
import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { useMoveCameraTo, useWheelCapture } from '../../h5web/packages/lib/src/interactions/hooks';
import resetStyles from '../../h5web/packages/lib/src/toolbar/floating/ResetZoomButton.module.css';
import heatmapStyles from '../../h5web/packages/lib/src/vis/heatmap/HeatmapVis.module.css';
import { useTextureSafeNdArray } from '../../h5web/packages/lib/src/vis/heatmap/hooks';

import type { AxisConfig } from '../../h5web/packages/lib/src/vis/models';
import type { Domain } from '@h5web/lib';
import type { NdArray } from 'ndarray';

export type ViewerSize = 'fit' | 'small' | 'medium' | 'large' | 'full';

const IMAGE_SCALES = { small: 0.25, medium: 0.5, large: 0.75, full: 1 };
const ZOOM_FACTOR = 0.95;

interface ViewProps {
  viewerSize: ViewerSize;
  imageWidth: number;
  imageHeight: number;
}

function StackViewControls({ viewerSize, imageWidth, imageHeight }: ViewProps): React.ReactElement {
  const { visSize } = useVisCanvasContext();
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const moveCameraTo = useMoveCameraTo();
  const shouldZoom = useInteraction('Zoom', { button: 'Wheel' });
  const previousScale = useRef<number>();

  // H5Web's camera scale is inverse magnification. The frame and axis gutters
  // stay fixed; only the image's footprint in CSS pixels changes with the preset.
  const presetScale =
    viewerSize === 'fit'
      ? 1
      : Math.max(
          visSize.width / (imageWidth * IMAGE_SCALES[viewerSize]),
          visSize.height / (imageHeight * IMAGE_SCALES[viewerSize])
        );

  useLayoutEffect(() => {
    if (!Number.isFinite(presetScale) || presetScale <= 0) return;

    if (previousScale.current === undefined) {
      camera.scale.set(presetScale, presetScale, 1);
      camera.position.x = 0;
      camera.position.y = 0;
    } else {
      // Preserve extra user zoom during a resize. H5Web's ViewportCenterer
      // preserves the data coordinate at the centre and clamps panning bounds.
      const ratio = presetScale / previousScale.current;
      camera.scale.x *= ratio;
      camera.scale.y *= ratio;
    }

    previousScale.current = presetScale;
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, invalidate, presetScale]);

  useWheelCapture();
  useCanvasEvent('wheel', ({ sourceEvent, worldPt }) => {
    if (!shouldZoom(sourceEvent) || sourceEvent.deltaY === 0 || presetScale <= 0) return;

    const oldScale = camera.scale.x;
    const nextScale = Math.min(presetScale, oldScale * (sourceEvent.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR));
    const ratio = nextScale / oldScale;
    camera.scale.set(nextScale, nextScale, 1);
    moveCameraTo(worldPt.clone().add(camera.position.clone().sub(worldPt).multiplyScalar(ratio)));
  });

  const canReset = useCameraState(
    ({ scale, position }) =>
      Math.abs(scale.x - presetScale) > presetScale * 1e-6 ||
      Math.abs(scale.y - presetScale) > presetScale * 1e-6 ||
      Math.abs(position.x) > 1e-6 ||
      Math.abs(position.y) > 1e-6,
    [presetScale]
  );

  const resetView = (): void => {
    camera.scale.set(presetScale, presetScale, 1);
    camera.position.x = 0;
    camera.position.y = 0;
    camera.updateMatrixWorld();
    invalidate();
  };

  return (
    <>
      <DefaultInteractions zoom={false} />
      <FloatingControl>
        <button className={resetStyles.btn} type="button" hidden={!canReset} onClick={resetView}>
          <span className={resetStyles.btnLike}>Reset zoom</span>
        </button>
      </FloatingControl>
    </>
  );
}

interface Props {
  dataArray: NdArray<Float32Array>;
  originalWidth: number;
  originalHeight: number;
  viewerSize: ViewerSize;
  domain: Domain;
}

function ImatStackPlot({ dataArray, originalWidth, originalHeight, viewerSize, domain }: Props): React.ReactElement {
  const [rows, cols] = dataArray.shape;
  const imageWidth = Number.isFinite(originalWidth) && originalWidth > 0 ? originalWidth : cols;
  const imageHeight = Number.isFinite(originalHeight) && originalHeight > 0 ? originalHeight : rows;
  const safeDataArray = useTextureSafeNdArray(dataArray);

  // Original pixel coordinates keep axes and pan positions stable when the
  // slider temporarily loads a downsampled frame.
  const abscissaConfig = useMemo<AxisConfig>(() => ({ visDomain: [0, imageWidth], isIndexAxis: true }), [imageWidth]);
  const ordinateConfig = useMemo<AxisConfig>(
    () => ({ visDomain: [0, imageHeight], isIndexAxis: true, flip: true }),
    [imageHeight]
  );

  return (
    <figure
      className={heatmapStyles.root}
      style={{ width: '100%', height: '100%' }}
      aria-label="IMAT stack image"
      data-keep-canvas-colors
    >
      <VisCanvas
        key={`${viewerSize}:${imageWidth}:${imageHeight}`}
        aspect="equal"
        abscissaConfig={abscissaConfig}
        ordinateConfig={ordinateConfig}
      >
        <StackViewControls viewerSize={viewerSize} imageWidth={imageWidth} imageHeight={imageHeight} />
        <TooltipMesh
          guides="both"
          renderTooltip={(x, y) => {
            const xi = Math.max(0, Math.min(cols - 1, Math.floor((x / imageWidth) * cols)));
            const yi = Math.max(0, Math.min(rows - 1, Math.floor((y / imageHeight) * rows)));
            return (
              <>
                {`x=${Math.floor(x)}, y=${Math.floor(y)}`}
                <div className={heatmapStyles.tooltipValue}>
                  <strong>{formatTooltipVal(dataArray.get(yi, xi))}</strong>
                </div>
              </>
            );
          }}
        />
        <HeatmapMesh
          values={safeDataArray}
          domain={domain}
          colorMap="Viridis"
          invertColorMap={false}
          scaleType={ScaleType.Linear}
          scale={[1, -1, 1]}
        />
      </VisCanvas>
      <ColorBar domain={domain} colorMap="Viridis" invertColorMap={false} scaleType={ScaleType.Linear} withBounds />
    </figure>
  );
}

export default ImatStackPlot;
