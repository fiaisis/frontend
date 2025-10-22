import React from 'react';
import axios from 'axios';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { plottingApi } from '../../lib/api';

const IMATView: React.FC = () => {
  const theme = useTheme();
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    let objectUrl: string | null = null;

    const fetchLatestImage = async (): Promise<void> => {
      const baseUrl = import.meta.env.VITE_PLOTTING_API_URL;
      if (!baseUrl) {
        setError('Plotting API is not configured');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await plottingApi.get('/imat/latest-image', {
          responseType: 'blob',
          signal: controller.signal,
        });

        if (!isMounted) return;

        const blob: Blob = response.data;
        const contentDisposition = response.headers['content-disposition'] as string | undefined;

        const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
        const filename = filenameMatch ? filenameMatch[1].replace(/['"]/g, '') : undefined;
        const hasImageExtension = filename ? /\.(tiff?|tif)$/i.test(filename) : false;
        const isImageBlob = blob.type.startsWith('image/');

        if (!isImageBlob && !hasImageExtension) {
          setImageUrl(null);
          setError('Latest IMAT image could not be found');
          return;
        }

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        if (!isMounted) return;

        if (axios.isAxiosError(err)) {
          if (err.code === 'ERR_CANCELED') return;

          if (err.response?.status === 404) {
            setError('Latest IMAT image could not be found');
          } else {
            setError('Unable to load the latest IMAT image');
          }
        } else {
          setError('Unable to load the latest IMAT image');
        }
        setImageUrl(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLatestImage();

    return () => {
      isMounted = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 2,
        height: 640,
        width: '100%',
      }}
    >
      {loading ? (
        <CircularProgress />
      ) : imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt="Latest IMAT reduction"
          sx={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          }}
        />
      ) : (
        <Typography variant="h6" color={theme.palette.text.primary}>
          {error ?? 'Latest IMAT image could not be found.'}
        </Typography>
      )}
    </Box>
  );
};

export default IMATView;
