import '@h5web/lib/styles.css';
import { DomainWidget, HeatmapVis, RgbVis, ScaleType, Toolbar, useSafeDomain } from '@h5web/lib';
import {
  Box,
  CircularProgress,
  Paper,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import axios from 'axios';
import ndarray from 'ndarray';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import NavArrows from '../components/navigation/NavArrows';
import { fiaApi, h5Api } from '../lib/api';
import { Job } from '../lib/types';

import type { CustomDomain, Domain } from '@h5web/lib';

type ImatImagePayload = {
  data: number[];
  shape: [number, number, number];
};

type LatestImatImageDataset = {
  data: Uint8Array;
  shape: [number, number, number];
};

type StackImatImageDataset = {
  data: Float32Array;
  shape: [number, number];
  originalWidth: number;
  originalHeight: number;
  sampledWidth: number;
  sampledHeight: number;
};

type IMATViewerProps = {
  mode: 'latest' | 'stack';
  showNav?: boolean;
};

type ViewerSize = 'fit' | 'small' | 'medium' | 'large' | 'full';

const VIEWER_SIZES: readonly ViewerSize[] = ['fit', 'small', 'medium', 'large', 'full'];
const STACK_INTENSITY_DOMAIN: Domain = [0, 65535];

const isViewerSize = (value: string | null): value is ViewerSize =>
  value !== null && VIEWER_SIZES.includes(value as ViewerSize);

const IMATViewer: React.FC<IMATViewerProps> = ({ mode, showNav = true }) => {
  const theme = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialJobId = queryParams.get('jobId');
  const initialInstrument = queryParams.get('instrument');
  const initialExperiment = queryParams.get('experiment');

  // Latest Image state
  const [latestDataset, setLatestDataset] = React.useState<LatestImatImageDataset | null>(null);
  const [latestLoading, setLatestLoading] = React.useState<boolean>(false);
  const [latestError, setLatestError] = React.useState<string | null>(null);

  const history = useHistory();
  const initialImageIndex = parseInt(queryParams.get('imageIndex') || '0', 10);
  const viewerSizeParam = queryParams.get('viewerSize');
  const initialViewerSize = isViewerSize(viewerSizeParam) ? viewerSizeParam : 'fit';

  // Stack Viewer state
  const [stackJobId] = React.useState<string | null>(initialJobId);
  const [stackImages, setStackImages] = React.useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(initialImageIndex);
  const [stackDataset, setStackDataset] = React.useState<StackImatImageDataset | null>(null);
  const [stackLoading, setStackLoading] = React.useState(false);
  const [stackError, setStackError] = React.useState<string | null>(null);
  const [directoryPath, setDirectoryPath] = React.useState<string | null>(null);
  const [isSliding, setIsSliding] = React.useState(false);
  const [viewerSize, setViewerSize] = React.useState<'fit' | 'small' | 'medium' | 'large' | 'full'>(initialViewerSize);
  const [stackCustomIntensityDomain, setStackCustomIntensityDomain] = React.useState<CustomDomain>([null, null]);

  const stackIntensityDomain = React.useMemo<Domain>(
    () => [
      stackCustomIntensityDomain[0] ?? STACK_INTENSITY_DOMAIN[0],
      stackCustomIntensityDomain[1] ?? STACK_INTENSITY_DOMAIN[1],
    ],
    [stackCustomIntensityDomain]
  );
  const [safeStackIntensityDomain] = useSafeDomain(stackIntensityDomain, STACK_INTENSITY_DOMAIN, ScaleType.Linear);

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

  const latestImageHeight = latestDataset?.shape[0] ?? 0;
  const latestImageWidth = latestDataset?.shape[1] ?? 0;

  const latestAspectRatio = React.useMemo(() => {
    if (latestImageHeight === 0) return 1;
    return latestImageWidth / latestImageHeight;
  }, [latestImageHeight, latestImageWidth]);

  const stackDisplayWidth = stackDataset?.originalWidth || stackDataset?.sampledWidth || 0;
  const stackDisplayHeight = stackDataset?.originalHeight || stackDataset?.sampledHeight || 0;

  const stackAspectRatio = React.useMemo(() => {
    if (stackDisplayHeight === 0) return 1;
    return stackDisplayWidth / stackDisplayHeight;
  }, [stackDisplayHeight, stackDisplayWidth]);

  // Fetch Latest Image
  React.useEffect(() => {
    if (mode !== 'latest') return;
    let isMounted = true;
    const controller = new AbortController();

    const fetchLatestImage = async (): Promise<void> => {
      try {
        setLatestLoading(true);
        setLatestError(null);
        const response = await h5Api.get<ImatImagePayload>('/imat/latest-image', { signal: controller.signal });

        if (!isMounted) return;
        const payload = response.data;
        const typedData = Uint8Array.from(payload.data);
        setLatestDataset({
          data: typedData,
          shape: payload.shape,
        });
      } catch (err: unknown) {
        if (!isMounted || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return;
        setLatestError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? 'Latest IMAT image could not be found'
            : 'Unable to load image'
        );
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

    const resolvePath = async (): Promise<void> => {
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
            } catch {
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
      } catch {
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

    const fetchList = async (): Promise<void> => {
      try {
        const response = await h5Api.get<string[]>('/imat/list-images', {
          params: { path: directoryPath },
        });
        const sortedData = response.data.sort(
          new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare
        );
        setStackImages(sortedData);
      } catch {
        setStackError('Failed to list images in stack');
      }
    };
    fetchList();
  }, [mode, directoryPath]);

  // Fetch individual stack image
  const fetchStackImage = React.useCallback(
    async (index: number, downsample: number = 1): Promise<void> => {
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
      } catch {
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

  const handleSliderChange = (_event: React.SyntheticEvent | Event, newValue: number | number[]): void => {
    setIsSliding(true);
    const index = newValue as number;
    setCurrentImageIndex(index);
  };

  const handleSliderChangeCommitted = (_event: React.SyntheticEvent | Event, newValue: number | number[]): void => {
    setIsSliding(false);
    const index = newValue as number;
    setCurrentImageIndex(index);
  };

  const stackDomainWidgetStyles = {
    width: { xs: '100%', sm: 500 },
    maxWidth: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    pl: 1.25,
    pr: 0.5,
    color: 'text.primary',
    backgroundColor: 'background.paper',
    border: '1px solid',
    borderColor:
      theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.28) : alpha(theme.palette.text.primary, 0.16),
    borderRadius: 1,
    overflow: 'visible',
    boxShadow: theme.palette.mode === 'dark' ? `0 0 0 1px ${alpha(theme.palette.common.black, 0.18)}` : undefined,
    '--h5w-toolbar--height': '2.25rem',
    '--h5w-toolbar--bgColor': theme.palette.background.paper,
    '--h5w-toolbar-label--color': theme.palette.text.secondary,
    '--h5w-toolbar-separator--color': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.22 : 0.14),
    '--h5w-toolbar-popup--bgColor': theme.palette.background.paper,
    '--h5w-toolbar-input-focus--shadowColor': theme.palette.primary.main,
    '--h5w-btn-hover--bgColor': theme.palette.action.hover,
    '--h5w-btn-hover--shadowColor': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.32 : 0.16),
    '--h5w-btnRaised--bgColor': theme.palette.background.default,
    '--h5w-btnRaised--shadowColor': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.34 : 0.18),
    '--h5w-btnRaised-hover--shadowColor': alpha(
      theme.palette.text.primary,
      theme.palette.mode === 'dark' ? 0.46 : 0.24
    ),
    '--h5w-btnPressed--bgColor': alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.34 : 0.18),
    '--h5w-btnPressed--shadowColor': alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.54 : 0.32),
    '--h5w-btnPressed-hover--shadowColor': alpha(
      theme.palette.primary.main,
      theme.palette.mode === 'dark' ? 0.64 : 0.4
    ),
    '--h5w-domainWidget-popup--bgColor': theme.palette.background.paper,
    '--h5w-domainControls--colorAlt': theme.palette.text.primary,
    '--h5w-domainControls-boundInput--shadowColor': alpha(
      theme.palette.text.primary,
      theme.palette.mode === 'dark' ? 0.34 : 0.16
    ),
    '--h5w-domainControls-boundInput-focus--shadowColor': theme.palette.primary.main,
    '--h5w-domainControls-boundInput-editing--bgColor': theme.palette.background.default,
    '--h5w-domainControls-boundInput-editing--borderColor': theme.palette.primary.main,
    '--h5w-domainSlider-track--bgColor': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.24 : 0.18),
    '--h5w-domainSlider-track--shadowColor': alpha(
      theme.palette.common.black,
      theme.palette.mode === 'dark' ? 0.68 : 0.22
    ),
    '--h5w-domainSlider-dataTrack--bgColor':
      theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
    '--h5w-domainSlider-dataTrack--shadowColor': alpha(
      theme.palette.primary.main,
      theme.palette.mode === 'dark' ? 0.72 : 0.36
    ),
    '--h5w-domainSlider-thumb--bgColor':
      theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
    '--h5w-domainSlider-thumb-auto--bgColor':
      theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.background.paper,
    '& input[name="bound"]': {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.1) : alpha('#ffffff', 0.72),
      borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.24 : 0.12),
    },
    '& button:disabled': {
      color: alpha(theme.palette.text.primary, 0.36),
    },
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
                          ? latestImageWidth * 0.25
                          : viewerSize === 'medium'
                            ? latestImageWidth * 0.5
                            : viewerSize === 'large'
                              ? latestImageWidth * 0.75
                              : latestImageWidth,
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

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
                      alignItems: 'center',
                      gap: 2,
                      mt: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                        minWidth: 0,
                      }}
                    >
                      <Typography variant="body2" sx={{ flexShrink: 0 }}>
                        Image {currentImageIndex + 1} of {stackImages.length}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stackImages[currentImageIndex]}
                      </Typography>
                    </Box>

                    <ToggleButtonGroup
                      value={viewerSize}
                      exclusive
                      onChange={(_e, val) => val && setViewerSize(val)}
                      size="small"
                      aria-label="viewer size"
                      sx={{
                        justifySelf: { xs: 'start', lg: 'center' },
                        '& .MuiToggleButton-root': {
                          width: 76,
                          px: 0,
                        },
                      }}
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

                    <Box sx={{ justifySelf: { xs: 'stretch', lg: 'end' }, width: { xs: '100%', sm: 'auto' } }}>
                      <Box sx={stackDomainWidgetStyles}>
                        <Typography variant="body2" sx={{ fontWeight: 500, flexShrink: 0 }}>
                          Colourbar intensity
                        </Typography>
                        <Toolbar>
                          <DomainWidget
                            dataDomain={STACK_INTENSITY_DOMAIN}
                            customDomain={stackCustomIntensityDomain}
                            scaleType={ScaleType.Linear}
                            disabled={!stackDataset}
                            onCustomDomainChange={setStackCustomIntensityDomain}
                          />
                        </Toolbar>
                      </Box>
                    </Box>
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
                            ? stackDisplayWidth > 0
                              ? stackDisplayWidth * 0.25
                              : '100%'
                            : viewerSize === 'medium'
                              ? stackDisplayWidth > 0
                                ? stackDisplayWidth * 0.5
                                : '100%'
                              : viewerSize === 'large'
                                ? stackDisplayWidth > 0
                                  ? stackDisplayWidth * 0.75
                                  : '100%'
                                : stackDisplayWidth || '100%',
                      aspectRatio: stackAspectRatio,
                      maxHeight: viewerSize === 'fit' ? 'calc(100vh - 350px)' : 'none',
                      position: 'relative',
                      border: '1px solid #ccc',
                      borderRadius: 1,
                      overflow: 'hidden',
                      backgroundColor: 'black',
                      color: 'rgba(255, 255, 255, 0.92)',
                      '--h5w-colorBar-bounds--color': 'rgba(255, 255, 255, 0.92)',
                      '--h5w-colorBar-tickLabels--color': 'rgba(255, 255, 255, 0.86)',
                      '--h5w-colorBar-ticks--color': 'rgba(255, 255, 255, 0.72)',
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
                        domain={safeStackIntensityDomain}
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
