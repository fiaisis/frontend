import '@h5web/app/styles.css';
import React, { useMemo } from 'react';
import { App, H5GroveProvider } from '@h5web/app';
import axios from 'axios';
import { Box, Typography } from '@mui/material';

interface Viewer2DProps {
  filepath: string | null;
  plottingApiUrl: string;
  authToken: string | null;
  onError?: (error: string) => void;
}

const Viewer2D: React.FC<Viewer2DProps> = ({ filepath, plottingApiUrl, authToken, onError }): JSX.Element => {
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
        <App sidebarOpen={false} disableDarkMode={true} />
      </H5GroveProvider>
    </Box>
  );
};

export default Viewer2D;
