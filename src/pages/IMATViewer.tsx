import '@h5web/lib/styles.css';
import React from 'react';
import ndarray from 'ndarray';
import { RgbVis, HeatmapVis } from '@h5web/lib';
import NavArrows from '../components/navigation/NavArrows';
import axios from 'axios';
import { Box, CircularProgress, Typography, useTheme, Slider, Paper } from '@mui/material';
import { h5Api, fiaApi } from '../lib/api';
import { useLocation } from 'react-router-dom';

type ImatImagePayload = {
  data: number[];
  shape: [number, number] | [number, number, number];
  originalWidth: number;
  originalHeight: number;
  sampledWidth: number;
  sampledHeight: number;
  downsampleFactor: number;
};

type ImatImageDataset = {
  data: Uint8Array | Float32Array;
  shape: [number, number] | [number, number, number];
  originalWidth: number;
  originalHeight: number;
  sampledWidth: number;
  sampledHeight: number;
};

type IMATViewerProps = {
  mode: 'latest' | 'stack';
  showNav?: boolean;
};

const IMATViewer: React.FC<IMATViewerProps> = ({ mode, showNav = true }) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialJobId = queryParams.get('jobId');
  const initialInstrument = queryParams.get('instrument');
  const initialExperiment = queryParams.get('experiment');

  // Latest Image state
  const [latestDataset, setLatestDataset] = React.useState<ImatImageDataset | null>(null);
  const [latestLoading, setLatestLoading] = React.useState<boolean>(false);
  const [latestError, setLatestError] = React.useState<string | null>(null);

  // Stack Viewer state
  const [stackJobId] = React.useState<string | null>(initialJobId);
  const [stackImages, setStackImages] = React.useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [stackDataset, setStackDataset] = React.useState<ImatImageDataset | null>(null);
  const [stackLoading, setStackLoading] = React.useState(false);
  const [stackError, setStackError] = React.useState<string | null>(null);
  const [directoryPath, setDirectoryPath] = React.useState<string | null>(null);
  const [isSliding, setIsSliding] = React.useState(false);

  // Memoized arrays for visualization
  const latestArray = React.useMemo(() => {
    if (!latestDataset) return null;
    return ndarray(latestDataset.data, latestDataset.shape);
  }, [latestDataset]);

  const stackArray = React.useMemo(() => {
    if (!stackDataset) return null;
    return ndarray(stackDataset.data, stackDataset.shape);
  }, [stackDataset]);

  // Fetch Latest Image
  React.useEffect(() => {
    if (mode !== 'latest') return;
    let isMounted = true;
    const controller = new AbortController();

    const fetchLatestImage = async (): Promise<void> => {
      try {
        setLatestLoading(true);
        setLatestError(null);
        const response = await h5Api.get<ImatImagePayload>('/imat/latest-image', {
          signal: controller.signal,
          params: { downsample_factor: 1 },
        });

        if (!isMounted) return;
        const payload = response.data;
        const typedData = Uint8Array.from(payload.data);
        setLatestDataset({
          data: typedData,
          shape: payload.shape as [number, number, number],
          originalWidth: payload.originalWidth,
          originalHeight: payload.originalHeight,
          sampledWidth: payload.sampledWidth,
          sampledHeight: payload.sampledHeight,
        });
      } catch (err: any) {
        if (!isMounted || axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setLatestError(err.response?.status === 404 ? 'Latest IMAT image could not be found' : 'Unable to load image');
      } finally {
        if (isMounted) setLatestLoading(false);
      }
    };

    fetchLatestImage();
    return () => { isMounted = false; controller.abort(); };
  }, [mode]);

  // Resolve directory path for stack
  React.useEffect(() => {
    if (mode !== 'stack' || !stackJobId || !initialInstrument || !initialExperiment) return;

    const resolvePath = async () => {
      try {
        setStackLoading(true);
        // Reverting to find_file logic as requested, using relative paths
        const response = await h5Api.get<string>(`/find_file/instrument/${initialInstrument}/experiment_number/${initialExperiment}`, {
          params: { filename: '.' }
        });
        setDirectoryPath(response.data);
      } catch (err) {
        console.warn('find_file failed, falling back to job outputs:', err);
        // Fallback to job outputs if find_file fails
        try {
          const response = await fiaApi.get(`/job/${stackJobId}`);
          const job = response.data;
          let path = job.outputs;
          if (path && path.startsWith('[')) {
            try {
              const outputs = JSON.parse(path);
              path = Array.isArray(outputs) ? outputs[0] : path;
            } catch (e) {
              /* ignore */
            }
          }
          if (path) {
            if (path.toLowerCase().endsWith('.tif') || path.toLowerCase().endsWith('.tiff')) {
              path = path.substring(0, path.lastIndexOf('/'));
            }
            // Note: This fallback might still be absolute, but backend handles relative to CEPH_DIR better
            setDirectoryPath(path);
          } else {
            setStackError('Failed to resolve output directory');
          }
        } catch (fallbackErr) {
          setStackError('Failed to resolve output directory');
        }
      } finally {
        setStackLoading(false);
      }
    };
    resolvePath();
  }, [mode, stackJobId, initialInstrument, initialExperiment]);

  // Fetch stack image list
  React.useEffect(() => {
    if (mode !== 'stack' || !directoryPath) return;

    const fetchList = async () => {
      try {
        const response = await h5Api.get<string[]>('/imat/list-images', {
          params: { path: directoryPath },
        });
        setStackImages(response.data);
      } catch (err) {
        setStackError('Failed to list images in stack');
      }
    };
    fetchList();
  }, [mode, directoryPath]);

  // Fetch individual stack image
  const fetchStackImage = React.useCallback(
    async (index: number, downsample: number = 1) => {
      if (!directoryPath || !stackImages[index]) return;
      try {
        setStackLoading(true);
        const response = await h5Api.get<ImatImagePayload>('/imat/image', {
          params: {
            path: `${directoryPath}/${stackImages[index]}`,
            downsample_factor: downsample,
          },
        });
        const payload = response.data;
        // For 16-bit TIFFs, we use Float32Array to preserve precision in HeatmapVis
        const typedData = Float32Array.from(payload.data);
        setStackDataset({
          data: typedData,
          shape: payload.shape as [number, number],
          originalWidth: payload.originalWidth,
          originalHeight: payload.originalHeight,
          sampledWidth: payload.sampledWidth,
          sampledHeight: payload.sampledHeight,
        });
      } catch (err) {
        setStackError('Failed to load stack image');
      } finally {
        setStackLoading(false);
      }
    },
    [directoryPath, stackImages]
  );

  // Load first image or respond to index changes
  React.useEffect(() => {
    if (mode === 'stack' && stackImages.length > 0 && !isSliding) {
      fetchStackImage(currentImageIndex, 1);
    }
  }, [mode, stackImages, currentImageIndex, isSliding, fetchStackImage]);

  const handleSliderChange = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    setIsSliding(true);
    const index = newValue as number;
    setCurrentImageIndex(index);
    // Fetch low-res preview while sliding
    fetchStackImage(index, 8);
  };

  const handleSliderChangeCommitted = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    setIsSliding(false);
    const index = newValue as number;
    fetchStackImage(index, 1);
  };

  return (
    <>
      {showNav && <NavArrows />}
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {mode === 'latest' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {latestLoading && !latestDataset ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                <CircularProgress />
              </Box>
            ) : latestDataset ? (
              <Box
                sx={{ flex: 1, position: 'relative', border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}
              >
                <RgbVis dataArray={latestArray!} aspect="equal" flipYAxis style={{ height: '100%', width: '100%' }} />
              </Box>
            ) : (
              <Typography color="error">{latestError ?? 'No image available'}</Typography>
            )}
          </Box>
        )}

        {mode === 'stack' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!stackJobId ? (
              <Typography sx={{ p: 4, textAlign: 'center' }}>
                Select a completed job from the Reductions tab to view its image stack.
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2">
                    Image {currentImageIndex + 1} of {stackImages.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {stackImages[currentImageIndex]}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    position: 'relative',
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    overflow: 'hidden',
                    minHeight: 400,
                  }}
                >
                  {stackDataset ? (
                    <HeatmapVis
                      dataArray={stackArray!}
                      aspect="equal"
                      flipYAxis
                      style={{ height: '100%', width: '100%' }}
                      domain={[0, 65535]}
                    />
                  ) : stackLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography>
                        {stackError ??
                          (stackImages.length === 0 ? 'No images found in this job stack.' : 'Loading stack images...')}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Paper sx={{ p: 2, mt: 2 }}>
                  <Slider
                    disabled={stackImages.length === 0}
                    value={currentImageIndex}
                    min={0}
                    max={Math.max(0, stackImages.length - 1)}
                    onChange={handleSliderChange}
                    onChangeCommitted={handleSliderChangeCommitted}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v: number) => `Index: ${v}`}
                  />
                  <Typography variant="caption" align="center" display="block">
                    Use the slider to rapidly scroll through the image stack.
                  </Typography>
                </Paper>
              </>
            )}
          </Box>
        )}
      </Box>
    </>
  );
};

export default IMATViewer;
