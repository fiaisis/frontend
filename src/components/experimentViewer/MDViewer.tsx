import '@h5web/app/styles.css';
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import H5GroveProvider from '../../h5web/packages/app/src/providers/h5grove/H5GroveProvider';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '../../h5web/packages/app/src/ErrorFallback';
import { createAxiosFetcher } from '@h5web/app';
import { h5Api, isDev } from '../../lib/api';
import MDViewerInner from './MDViewerInner';
import { DiscoveredDataset, discoverFileStructure } from '../../lib/plottingServiceAPI';

interface MDViewerProps {
  filepath: string | null;
}

const MDViewer: React.FC<MDViewerProps> = ({ filepath }): JSX.Element => {
  const fetcher = createAxiosFetcher(h5Api);
  const apiBase = isDev ? '/plottingapi' : import.meta.env.VITE_FIA_PLOTTING_API_URL;

  const [datasets, setDatasets] = useState<DiscoveredDataset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filepath) return;
    
    const fetchStructure = async () => {
      setLoading(true);
      setError(null);
      try {
        const filename = filepath.split('/').pop() || filepath;
        const structure = await discoverFileStructure(filename, filepath);
        setDatasets(structure.datasets);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch file structure');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStructure();
  }, [filepath]);

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
            Select a file to view Multi-Dimensional Data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a file from the File tree to visualize HDF5 datasets with N-D slicing
          </Typography>
        </Box>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">Error loading file structure: {error}</Typography>
      </Box>
    );
  }

  // Find a good default dataset to show (first primary, or just first available)
  const initialDataset = datasets.find(d => d.isPrimary) || (datasets.length > 0 ? datasets[0] : undefined);

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <H5GroveProvider
        url={''}
        filepath={filepath}
        fetcher={fetcher}
        getExportURL={() => {
          return new URL(apiBase, window.location.origin);
        }}
      >
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <MDViewerInner filepath={filepath} datasets={datasets} initialDataset={initialDataset} />
        </ErrorBoundary>
      </H5GroveProvider>
    </Box>
  );
};

export default MDViewer;
