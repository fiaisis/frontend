import { type ElementType } from 'react';

import FiaNxHeatmapContainer from './FiaNxHeatmapContainer';
import FiaNxLineContainer from './FiaNxLineContainer';
import { type VisContainerProps, type VisDef } from '../../h5web/packages/app/src/vis-packs/models';
import { NX_DATA_VIS, NxDataVis } from '../../h5web/packages/app/src/vis-packs/nexus/visualizations';
import { resolvePath } from '../../h5web/packages/app/src/visualizer/utils';

type ResolvedVisualization = NonNullable<ReturnType<typeof resolvePath>>;

/**
 * H5Web containers to use in place of the vendored ones, keyed by the original definition object.
 *
 * Only the NeXus visualizations that show a dimension mapper are replaced — those are the ones that
 * label dimensions `D<index>`. Both heatmap and line are needed because a 4D signal is offered as a
 * line too (one axis plus three slice sliders). Keyed by identity rather than by `name` because H5Web
 * gives `NX Complex Line` the same `name` as `NX Line`.
 */
const FIA_CONTAINERS = new Map<VisDef, ElementType<VisContainerProps>>([
  [NX_DATA_VIS[NxDataVis.NxHeatmap], FiaNxHeatmapContainer],
  [NX_DATA_VIS[NxDataVis.NxLine], FiaNxLineContainer],
]);

/**
 * Swap in the FIA containers of any supported visualization, leaving everything else H5Web does
 * alone. `VisConfigProvider` builds its toolbar config contexts from H5Web's own visualization
 * definitions rather than from what is rendered here, and the preferred visualization is persisted by
 * name, so replacing `Container` is enough.
 */
export function withFiaContainers(resolution: ResolvedVisualization): ResolvedVisualization {
  const { supportedVis, primaryVis } = resolution;

  const withContainers = supportedVis.map((vis) => {
    const Container = FIA_CONTAINERS.get(vis);
    return Container ? { ...vis, Container } : vis;
  });

  const primaryIndex = primaryVis ? supportedVis.indexOf(primaryVis) : -1;

  return {
    ...resolution,
    supportedVis: withContainers,
    primaryVis: primaryIndex >= 0 ? withContainers[primaryIndex] : primaryVis,
  };
}
