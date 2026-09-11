import { Box } from '@mui/material';
import React, { useCallback, useState, useSyncExternalStore } from 'react';

import ViewerToolbarFallback from './ViewerToolbarFallback';
import { useDataContext } from '../../h5web/packages/app/src/providers/DataProvider';
import { useActiveVis } from '../../h5web/packages/app/src/visualizer/hooks';
import { resolvePath } from '../../h5web/packages/app/src/visualizer/utils';
import VisSelector from '../../h5web/packages/app/src/visualizer/VisSelector';
import styles from '../../h5web/packages/app/src/visualizer/Visualizer.module.css';

type ResolvedVisualization = NonNullable<ReturnType<typeof resolvePath>>;

const useHasToolbar = (container: HTMLDivElement | null): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!container) return () => undefined;

      // H5Web mounts its controls through a portal. Suspense may either remove
      // those controls or hide them in place while the next dataset loads.
      const observer = new MutationObserver(onChange);
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'hidden'],
      });
      return () => observer.disconnect();
    },
    [container]
  );
  const getSnapshot = useCallback(
    () =>
      Array.from(container?.children ?? []).some(
        (child) => child instanceof HTMLElement && !child.hidden && child.style.display !== 'none'
      ),
    [container]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

const DatasetVisualization: React.FC<ResolvedVisualization> = ({ entity, supportedVis, primaryVis }) => {
  const [activeVis, setActiveVis] = useActiveVis(supportedVis, primaryVis);
  const [toolbarContainer, setToolbarContainer] = useState<HTMLDivElement | null>(null);
  const hasToolbar = useHasToolbar(toolbarContainer);
  const { valuesStore } = useDataContext();
  const { Container } = activeVis;

  if (!('ResizeObserver' in globalThis)) {
    throw new Error("Your browser's version is not supported. Please upgrade to the latest version.");
  }

  return (
    <div className={styles.visManager}>
      <div className={styles.visBar}>
        <VisSelector
          activeVis={activeVis}
          choices={supportedVis}
          onChange={(index) => {
            setActiveVis(index);
            valuesStore.abortAll('visualization changed', true);
          }}
        />
        <Box ref={setToolbarContainer} sx={{ display: 'contents' }} />
        {!hasToolbar && <ViewerToolbarFallback vis={activeVis} />}
      </div>
      <div className={styles.visArea}>
        <Container entity={entity} toolbarContainer={toolbarContainer ?? undefined} />
      </div>
    </div>
  );
};

// Keep FIA's persistent toolbar behaviour here, alongside the unchanged H5Web
// providers, visualization definitions and plot components that it uses.
const DatasetVisualizer: React.FC<{ path: string }> = ({ path }) => {
  const { entitiesStore, attrValuesStore } = useDataContext();
  const resolution = resolvePath(path, entitiesStore, attrValuesStore);

  if (!resolution) {
    return (
      <>
        <ViewerToolbarFallback />
        <div className={styles.fallback}>
          <p>Nothing to display</p>
          <p className={styles.fallbackHint}>Please select another entity in the sidebar.</p>
        </div>
      </>
    );
  }

  // Reset the selected visualization when changing the resolved entity.
  return <DatasetVisualization key={resolution.entity.path} {...resolution} />;
};

export default DatasetVisualizer;
