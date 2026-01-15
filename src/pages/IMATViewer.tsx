import '@h5web/lib/styles.css';
import React from 'react';
import ndarray from 'ndarray';
import { RgbVis } from '@h5web/lib';
import NavArrows from '../components/navigation/NavArrows';
import axios from 'axios';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { h5Api } from '../lib/api';

type ImatImagePayload = {
  data: number[];
  shape: [number, number, number];
  originalWidth: number;
  originalHeight: number;
  sampledWidth: number;
  sampledHeight: number;
  downsampleFactor: number;
};

type ImatImageDataset = {
  data: Uint8Array;
  shape: [number, number, number];
  originalWidth: number;
  originalHeight: number;
  sampledWidth: number;
  sampledHeight: number;
};

type IMATViewerProps = {
  showNav?: boolean;
};

const IMATViewer: React.FC<IMATViewerProps> = ({ showNav = true }) => {
  const theme = useTheme();
  const [dataset, setDataset] = React.useState<ImatImageDataset | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const imageArray = React.useMemo(() => {
    if (!dataset) return null;
    return ndarray(dataset.data, dataset.shape);
  }, [dataset]);

  const imageAspectRatio = React.useMemo(() => {
    if (!dataset || dataset.sampledHeight === 0) return 1;
    return Math.max(dataset.sampledWidth / dataset.sampledHeight, 1e-6);
  }, [dataset]);

  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchLatestImage = async (): Promise<void> => {
      const baseUrl = import.meta.env.VITE_FIA_PLOTTING_API_URL;
      if (!baseUrl) {
        setError('Plotting API is not configured');
        setDataset(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await h5Api.get<ImatImagePayload>('/imat/latest-image', {
          signal: controller.signal,
          params: { downsample_factor: 1 },
        });

        if (!isMounted) return;

        const payload = response.data;
        const { data, shape } = payload;

        if (!Array.isArray(data) || !Array.isArray(shape) || shape.length !== 3 || shape[2] !== 3) {
          setError('Latest IMAT image could not be generated');
          return;
        }

        const expectedLength = shape[0] * shape[1] * shape[2];
        if (data.length !== expectedLength) {
          setError('Latest IMAT image could not be generated');
          return;
        }

        const typedData = Uint8Array.from(data);

        setDataset({
          data: typedData,
          shape: [shape[0], shape[1], shape[2]],
          originalWidth: payload.originalWidth,
          originalHeight: payload.originalHeight,
          sampledWidth: payload.sampledWidth,
          sampledHeight: payload.sampledHeight,
        });
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
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLatestImage();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  if (loading && !dataset) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 640,
          width: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {showNav ? <NavArrows /> : null}
      <Box
        sx={{
          padding: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: 640,
            width: '100%',
          }}
        >
          {dataset ? (
            <>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    maxHeight: '100%',
                    maxWidth: '100%',
                    width: 'auto',
                    aspectRatio: imageAspectRatio,
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    position: 'relative',
                  }}
                >
                  {imageArray ? (
                    <RgbVis dataArray={imageArray} aspect="equal" flipYAxis style={{ height: '100%', width: '100%' }} />
                  ) : null}
                  {loading ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.15)',
                      }}
                    >
                      <CircularProgress size={48} />
                    </Box>
                  ) : null}
                </Box>
              </Box>
              {error ? (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              ) : null}
            </>
          ) : (
            <Typography variant="h6" color={theme.palette.text.primary}>
              {error ?? 'Latest IMAT image could not be loaded.'}
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
};

export default IMATViewer;
