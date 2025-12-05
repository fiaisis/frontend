import '@h5web/app/styles.css';
import React, { Suspense, useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Typography } from '@mui/material';
import H5GroveProvider from '../../h5web/packages/app/src/providers/h5grove/H5GroveProvider';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '../../h5web/packages/app/src/ErrorFallback';
import { ReflexContainer, ReflexElement } from 'react-reflex';
import styles from '../../h5web/packages/app/src/App.module.css';
import VisConfigProvider from '../../h5web/packages/app/src/VisConfigProvider';
import { DimMappingProvider } from '../../h5web/packages/app/src/dim-mapping-store';
import EntityLoader from '../../h5web/packages/app/src/EntityLoader';
import Visualizer from '../../h5web/packages/app/src/visualizer/Visualizer';

interface Viewer2DProps {
  filepath: string | null;
  plottingApiUrl: string;
  authToken: string | null;
  onError?: (error: string) => void;
}

const Viewer2D: React.FC<Viewer2DProps> = ({ filepath, plottingApiUrl, authToken, onError }): JSX.Element => {
  const [selectedPath] = useState<string>('/');

  // Create authenticated axios instance for h5web
  const axiosInstance = useMemo(() => {
    return axios.create({
      baseURL: plottingApiUrl,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      timeout: 30000,
    });
  }, [plottingApiUrl, authToken]);

  // Empty state when no file is selected
  if (!filepath) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 500, p: 4 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Select a file to view 2D data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a file from the File Tree to visualize HDF5 datasets in 2D
          </Typography>
        </Box>
      </Box>
    );
  }

  // Render h5web App with H5GroveProvider
  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <H5GroveProvider
        url={plottingApiUrl}
        filepath={filepath}
        axiosConfig={{
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }}
      >
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onError={(err) => {
            throw err;
          }}
        >
          <ReflexContainer
            className={styles.root}
            data-fullscreen-root
            data-allow-dark-mode={''}
            orientation="vertical"
          >
            <ReflexElement className={styles.mainArea} flex={75} minSize={500}>
              <VisConfigProvider>
                <DimMappingProvider>
                  <ErrorBoundary resetKeys={[selectedPath]} FallbackComponent={ErrorFallback}>
                    <Suspense fallback={<EntityLoader isInspecting={false} />}>
                      <Visualizer path={selectedPath} />
                    </Suspense>
                  </ErrorBoundary>
                </DimMappingProvider>
              </VisConfigProvider>
            </ReflexElement>
          </ReflexContainer>
        </ErrorBoundary>
      </H5GroveProvider>
    </Box>
  );
};

export default Viewer2D;
