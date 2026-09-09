import '@h5web/app/styles.css';
import { createAxiosFetcher } from '@h5web/app';
import { Box, CircularProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ReflexContainer, ReflexElement } from 'react-reflex';

import DatasetVisualizer from './DatasetVisualizer';
import { getViewerPlotSx } from './styles';
import ViewerToolbarFallback from './ViewerToolbarFallback';
import styles from '../../h5web/packages/app/src/App.module.css';
import { DimMappingProvider } from '../../h5web/packages/app/src/dim-mapping-store';
import ErrorFallback from '../../h5web/packages/app/src/ErrorFallback';
import H5GroveProvider from '../../h5web/packages/app/src/providers/h5grove/H5GroveProvider';
import VisConfigProvider from '../../h5web/packages/app/src/VisConfigProvider';
import visualizerStyles from '../../h5web/packages/app/src/visualizer/Visualizer.module.css';
import { h5Api, isDev } from '../../lib/api';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

interface Viewer2DProps {
  filepath: string | null;
  refreshKey?: number;
  emptyTitle?: string;
  emptyMessage?: string;
}

const fetcher = createAxiosFetcher(h5Api);
const getExportURL = (): URL =>
  new URL(isDev ? '/plottingapi' : import.meta.env.VITE_FIA_PLOTTING_API_URL, window.location.origin);

const ViewerState: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
    <Box sx={{ display: 'flex', flexShrink: 0 }}>
      <ViewerToolbarFallback />
    </Box>
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', p: 3 }}>
      {children}
    </Box>
  </Box>
);

const Viewer2D: React.FC<Viewer2DProps> = ({
  filepath,
  refreshKey = 0,
  emptyTitle = 'Select a file to view 2D data',
  emptyMessage = 'Choose a file from the File tree to visualize HDF5 datasets in 2D',
}): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);

  // Render h5web App with H5GroveProvider
  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
        [`& .${styles.root}`]: {
          ...getViewerPlotSx(theme),
          fontFamily: theme.typography.fontFamily,
          '--toolbar-height': `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px`,
          '--primary': viewerChrome.accent,
          '--primary-light': viewerChrome.hover,
          '--primary-lighter': viewerChrome.header,
          '--primary-dark': viewerChrome.text,
          '--primary-bg': viewerChrome.header,
          '--primary-light-bg': viewerChrome.surface,
          '--primary-dark-bg': viewerChrome.border,
          '--secondary': viewerChrome.accent,
          '--secondary-light': alpha(viewerChrome.accent, 0.12),
          '--secondary-lighter': viewerChrome.hover,
          '--secondary-dark': viewerChrome.accent,
          '--secondary-dark-15': alpha(viewerChrome.accent, 0.15),
          '--secondary-darker': viewerChrome.text,
          '--secondary-bg': viewerChrome.header,
          '--secondary-light-bg': viewerChrome.header,
        },
        [`& .${visualizerStyles.visBar}`]: {
          borderBottom: `1px solid ${viewerChrome.border}`,
          '& button[aria-selected="true"]': {
            color: viewerChrome.accent,
            backgroundColor: alpha(viewerChrome.accent, 0.12),
          },
        },
      }}
    >
      <VisConfigProvider>
        <DimMappingProvider>
          <ReflexContainer className={styles.root} data-fullscreen-root orientation="vertical">
            <ReflexElement className={styles.mainArea} flex={75} minSize={0}>
              {filepath ? (
                <ErrorBoundary
                  resetKeys={[filepath, refreshKey]}
                  fallbackRender={(props) => (
                    <ViewerState>
                      <ErrorFallback {...props} />
                    </ViewerState>
                  )}
                >
                  <H5GroveProvider
                    key={filepath}
                    url=""
                    filepath={filepath}
                    resetKeys={[refreshKey]}
                    fetcher={fetcher}
                    getExportURL={getExportURL}
                  >
                    <Suspense
                      fallback={
                        <ViewerState>
                          <CircularProgress aria-label="Loading viewer data" />
                        </ViewerState>
                      }
                    >
                      <DatasetVisualizer path="/" />
                    </Suspense>
                  </H5GroveProvider>
                </ErrorBoundary>
              ) : (
                <ViewerState>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      {emptyTitle}
                    </Typography>
                    <Typography variant="body2" sx={{ color: alpha(viewerChrome.text, 0.75) }}>
                      {emptyMessage}
                    </Typography>
                  </Box>
                </ViewerState>
              )}
            </ReflexElement>
          </ReflexContainer>
        </DimMappingProvider>
      </VisConfigProvider>
    </Box>
  );
};

export default Viewer2D;
