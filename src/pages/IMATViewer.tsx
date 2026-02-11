import '@h5web/lib/styles.css';
import React from 'react';
import ndarray from 'ndarray';
import { RgbVis, HeatmapVis } from '@h5web/lib';
import NavArrows from '../components/navigation/NavArrows';
import axios from 'axios';
import {
  Box,
  CircularProgress,
  Typography,
  useTheme,
  Slider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { h5Api, fiaApi } from '../lib/api';
import { useLocation, useHistory } from 'react-router-dom';
import { Job } from '../lib/types';

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

  const history = useHistory();
  const initialImageIndex = parseInt(queryParams.get('imageIndex') || '0', 10);
  const initialViewerSize = (queryParams.get('viewerSize') as any) || 'fit';

  // Stack Viewer state
  const [stackJobId] = React.useState<string | null>(initialJobId);
  const [stackImages, setStackImages] = React.useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(initialImageIndex);
  const [stackDataset, setStackDataset] = React.useState<ImatImageDataset | null>(null);
  const [stackLoading, setStackLoading] = React.useState(false);
  const [stackError, setStackError] = React.useState<string | null>(null);
  const [directoryPath, setDirectoryPath] = React.useState<string | null>(null);
  const [isSliding, setIsSliding] = React.useState(false);
  const [viewerSize, setViewerSize] = React.useState<'fit' | 'small' | 'medium' | 'large' | 'full'>(initialViewerSize);

  // Sync state to URL
  React.useEffect(() => {
    if (mode !== 'stack') return;
    const params = new URLSearchParams(location.search);
    let changed = false;

    if (currentImageIndex !== 0) {
      if (params.get('imageIndex') !== currentImageIndex.toString()) {
        params.set('imageIndex', currentImageIndex.toString());
        changed = true;
      }
    } else if (params.has('imageIndex')) {
      params.delete('imageIndex');
      changed = true;
    }

    if (viewerSize !== 'fit') {
      if (params.get('viewerSize') !== viewerSize) {
        params.set('viewerSize', viewerSize);
        changed = true;
      }
    } else if (params.has('viewerSize')) {
      params.delete('viewerSize');
      changed = true;
    }

    if (changed) {
      history.replace({ search: params.toString() });
    }
  }, [mode, currentImageIndex, viewerSize, history, location.search]);

  // Memoized arrays for visualization
  const latestArray = React.useMemo(() => {
    if (!latestDataset) return null;
    return ndarray(latestDataset.data, latestDataset.shape);
  }, [latestDataset]);

  const stackArray = React.useMemo(() => {
    if (!stackDataset) return null;
    return ndarray(stackDataset.data, stackDataset.shape);
  }, [stackDataset]);

  const latestAspectRatio = React.useMemo(() => {
    if (!latestDataset || latestDataset.sampledHeight === 0) return 1;
    return latestDataset.sampledWidth / latestDataset.sampledHeight;
  }, [latestDataset]);

  const stackAspectRatio = React.useMemo(() => {
    if (!stackDataset || stackDataset.sampledHeight === 0) return 1;
    return stackDataset.sampledWidth / stackDataset.sampledHeight;
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
        if (!isMounted || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return;
        setLatestError(err.response?.status === 404 ? 'Latest IMAT image could not be found' : 'Unable to load image');
      } finally {
        if (isMounted) setLatestLoading(false);
      }
    };

    fetchLatestImage();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [mode]);

  // Resolve directory path for stack
  React.useEffect(() => {
    if (mode !== 'stack' || !stackJobId || !initialInstrument || !initialExperiment) return;

    const resolvePath = async () => {
      try {
        setStackLoading(true);
        setStackError(null);

        // Fetch job data to get the run number (from filename)
        if (!initialInstrument || !initialExperiment) {
          throw new Error('Missing instrument or experiment number');
        }
        const jobResponse = await fiaApi.get<Job>(`/job/${stackJobId}`);
        const job = jobResponse.data;
        const filename = job.run?.filename || '';
        const runNumberMatch = filename.match(/\d+/);
        const runNumber = runNumberMatch ? parseInt(runNumberMatch[0], 10).toString() : '';

        // Try to resolve path via find_file
        try {
          const response = await h5Api.get<string>(
            `/find_file/instrument/${initialInstrument}/experiment_number/${initialExperiment}`,
            {
              params: { filename: '.' },
            }
          );
          let path = response.data;
          if (runNumber) path = `${path}/run-${runNumber}`;
          setDirectoryPath(path);
        } catch (err) {
          console.warn('find_file failed, falling back to job outputs:', err);
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
            if (runNumber && !path.includes(`run-${runNumber}`)) {
              path = `${path}/run-${runNumber}`;
            }
            setDirectoryPath(path);
          } else {
            setStackError('Failed to resolve output directory');
          }
        }
      } catch (err) {
        setStackError('Failed to resolve output directory');
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
        const response = await h5Api.get<ArrayBuffer>('/imat/image', {
          responseType: 'arraybuffer',
          params: {
            path: `${directoryPath}/${stackImages[index]}`,
            downsample_factor: downsample,
          },
        });

        // Extract metadata from headers
        const headers = response.headers;
        const sampledWidth = parseInt(headers['x-image-width'] || '0', 10);
        const sampledHeight = parseInt(headers['x-image-height'] || '0', 10);
        const originalWidth = parseInt(headers['x-original-width'] || '0', 10);
        const originalHeight = parseInt(headers['x-original-height'] || '0', 10);

        // Response data is an ArrayBuffer. For 16-bit TIFFs, PIL tobytes() returns 2 bytes per pixel.
        // We create a Uint16Array view and then convert it to Float32Array for ndarray/HeatmapVis
        const buffer = response.data;
        const uint16Data = new Uint16Array(buffer);
        const float32Data = Float32Array.from(uint16Data);

        setStackDataset({
          data: float32Data,
          shape: [sampledHeight, sampledWidth],
          originalWidth,
          originalHeight,
          sampledWidth,
          sampledHeight,
        });
      } catch (err) {
        setStackError('Failed to load stack image');
      } finally {
        setStackLoading(false);
      }
    },
    [directoryPath, stackImages]
  );

  // Consolidated image fetching with debounce
  React.useEffect(() => {
    if (mode !== 'stack' || stackImages.length === 0) return;

    const delay = isSliding ? 50 : 250;
    const downsample = isSliding ? 8 : 1;

    const timer = setTimeout(() => {
      fetchStackImage(currentImageIndex, downsample);
    }, delay);

    return () => clearTimeout(timer);
  }, [mode, stackImages, currentImageIndex, isSliding, fetchStackImage]);

  const handleSliderChange = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    setIsSliding(true);
    const index = newValue as number;
    setCurrentImageIndex(index);
  };

  const handleSliderChangeCommitted = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    setIsSliding(false);
    const index = newValue as number;
    setCurrentImageIndex(index);
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
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  overflow: viewerSize === 'fit' ? 'hidden' : 'auto',
                  flex: 1,
                }}
              >
                <Box
                  sx={{
                    width:
                      viewerSize === 'fit'
                        ? '100%'
                        : viewerSize === 'small'
                          ? latestDataset.sampledWidth * 0.25
                          : viewerSize === 'medium'
                            ? latestDataset.sampledWidth * 0.5
                            : viewerSize === 'large'
                              ? latestDataset.sampledWidth * 0.75
                              : latestDataset.sampledWidth,
                    aspectRatio: latestAspectRatio,
                    maxHeight: viewerSize === 'fit' ? 'calc(100vh - 250px)' : 'none',
                    position: 'relative',
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: 'black',
                    mx: 'auto',
                    flexShrink: 0,
                  }}
                >
                  <RgbVis dataArray={latestArray!} aspect="equal" flipYAxis style={{ height: '100%', width: '100%' }} />
                </Box>
              </Box>
            ) : (
              <Typography color="error">{latestError ?? 'No image available'}</Typography>
            )}
          </Box>
        )}

        {mode === 'stack' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
            {!stackJobId ? (
              <Typography sx={{ p: 4, textAlign: 'center' }}>
                Select a completed job from the Reductions tab to view its image stack.
              </Typography>
            ) : (
              <>
                <Paper sx={{ p: 2 }}>
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body2">
                      Image {currentImageIndex + 1} of {stackImages.length}
                    </Typography>

                    <ToggleButtonGroup
                      value={viewerSize}
                      exclusive
                      onChange={(_e, val) => val && setViewerSize(val)}
                      size="small"
                      aria-label="viewer size"
                    >
                      <ToggleButton value="fit" aria-label="fit">
                        Fit
                      </ToggleButton>
                      <ToggleButton value="small" aria-label="small">
                        Small
                      </ToggleButton>
                      <ToggleButton value="medium" aria-label="medium">
                        Medium
                      </ToggleButton>
                      <ToggleButton value="large" aria-label="large">
                        Large
                      </ToggleButton>
                      <ToggleButton value="full" aria-label="full">
                        Full
                      </ToggleButton>
                    </ToggleButtonGroup>

                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {stackImages[currentImageIndex]}
                    </Typography>
                  </Box>
                </Paper>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    overflow: viewerSize === 'fit' ? 'hidden' : 'auto',
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <Box
                    sx={{
                      width:
                        viewerSize === 'fit'
                          ? '100%'
                          : viewerSize === 'small'
                            ? (stackDataset?.sampledWidth ?? 0) * 0.25
                            : viewerSize === 'medium'
                              ? (stackDataset?.sampledWidth ?? 0) * 0.5
                              : viewerSize === 'large'
                                ? (stackDataset?.sampledWidth ?? 0) * 0.75
                                : stackDataset?.sampledWidth || '100%',
                      aspectRatio: stackAspectRatio,
                      maxHeight: viewerSize === 'fit' ? 'calc(100vh - 350px)' : 'none',
                      position: 'relative',
                      border: '1px solid #ccc',
                      borderRadius: 1,
                      overflow: 'hidden',
                      backgroundColor: 'black',
                      mx: 'auto',
                      flexShrink: 0,
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
                        <Typography color="white">
                          {stackError ??
                            (stackImages.length === 0
                              ? 'No images found in this job stack.'
                              : 'Loading stack images...')}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </>
  );
};

export default IMATViewer;
