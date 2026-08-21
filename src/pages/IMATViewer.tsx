import '@h5web/lib/styles.css';
import { DomainWidget, HeatmapVis, RgbVis, ScaleType, Toolbar, useSafeDomain } from '@h5web/lib';
import {
  Alert,
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

import ImatStackJobTree from '../components/imat/ImatStackJobTree';
import NavArrows from '../components/navigation/NavArrows';
import { fiaApi, h5Api } from '../lib/api';
import { parseJobOutputs } from '../lib/hooks';

import type { Job } from '../lib/types';
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

const getJobId = (value: string | null): number | null => {
  if (!value || !/^\d+$/.test(value)) return null;
  const jobId = Number(value);
  return Number.isSafeInteger(jobId) && jobId > 0 ? jobId : null;
};

const getImageIndex = (value: string | null): number => {
  const index = Number(value);
  return Number.isSafeInteger(index) && index >= 0 ? index : 0;
};

const isSuccessfulImatJob = (job: Job): boolean =>
  job.state === 'SUCCESSFUL' && job.run?.instrument_name?.toUpperCase() === 'IMAT';

const IMATViewer: React.FC<IMATViewerProps> = ({ mode, showNav = true }) => {
  const theme = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const rawStackJobId = queryParams.get('jobId');
  const stackJobId = getJobId(rawStackJobId);

  // Latest Image state
  const [latestDataset, setLatestDataset] = React.useState<LatestImatImageDataset | null>(null);
  const [latestLoading, setLatestLoading] = React.useState<boolean>(false);
  const [latestError, setLatestError] = React.useState<string | null>(null);

  const history = useHistory();
  const initialImageIndex = getImageIndex(queryParams.get('imageIndex'));
  const viewerSizeParam = queryParams.get('viewerSize');
  const initialViewerSize = isViewerSize(viewerSizeParam) ? viewerSizeParam : 'fit';

  // Stack Viewer state
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);
  const selectedJobRef = React.useRef<Job | null>(null);
  const [selectedJobLoading, setSelectedJobLoading] = React.useState(false);
  const [selectedJobError, setSelectedJobError] = React.useState<string | null>(null);
  const [stackImages, setStackImages] = React.useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(initialImageIndex);
  const [stackDataset, setStackDataset] = React.useState<StackImatImageDataset | null>(null);
  const [stackLoading, setStackLoading] = React.useState(false);
  const [stackError, setStackError] = React.useState<string | null>(null);
  const [directoryPath, setDirectoryPath] = React.useState<string | null>(null);
  const [isSliding, setIsSliding] = React.useState(false);
  const [viewerSize, setViewerSize] = React.useState<ViewerSize>(initialViewerSize);
  const [stackCustomIntensityDomain, setStackCustomIntensityDomain] = React.useState<CustomDomain>([null, null]);
  const locationSearchRef = React.useRef(location.search);
  locationSearchRef.current = location.search;
  selectedJobRef.current = selectedJob;

  const stackIntensityDomain = React.useMemo<Domain>(
    () => [
      stackCustomIntensityDomain[0] ?? STACK_INTENSITY_DOMAIN[0],
      stackCustomIntensityDomain[1] ?? STACK_INTENSITY_DOMAIN[1],
    ],
    [stackCustomIntensityDomain]
  );
  const [safeStackIntensityDomain] = useSafeDomain(stackIntensityDomain, STACK_INTENSITY_DOMAIN, ScaleType.Linear);

  const writeSelectedJobToUrl = React.useCallback(
    (job: Job, replace: boolean, resetImageIndex: boolean): void => {
      const params = new URLSearchParams(history.location.search);
      params.set('jobId', job.id.toString());
      params.set('experiment', job.run.experiment_number.toString());
      params.set('instrument', 'IMAT');
      if (resetImageIndex) params.delete('imageIndex');

      const search = params.toString();
      const nextLocation = {
        pathname: history.location.pathname,
        search: search ? `?${search}` : '',
      };

      if (nextLocation.search === history.location.search) return;
      if (replace) {
        history.replace(nextLocation);
      } else {
        history.push(nextLocation);
      }
    },
    [history]
  );

  const handleSelectJob = React.useCallback(
    (job: Job, replace = false): void => {
      setSelectedJob(job);
      setSelectedJobError(null);
      setCurrentImageIndex(0);
      writeSelectedJobToUrl(job, replace, true);
    },
    [writeSelectedJobToUrl]
  );

  // Hydrate deep-linked jobs and browser history selections that are not already in memory.
  React.useEffect(() => {
    if (mode !== 'stack') return;

    if (rawStackJobId !== null && stackJobId === null) {
      setSelectedJob(null);
      setSelectedJobLoading(false);
      setSelectedJobError('The selected stack job ID is invalid.');
      return;
    }

    if (stackJobId === null) {
      setSelectedJob(null);
      setSelectedJobLoading(false);
      setSelectedJobError(null);
      return;
    }

    if (selectedJobRef.current?.id === stackJobId) {
      setSelectedJobLoading(false);
      setSelectedJobError(null);
      return;
    }

    const controller = new AbortController();
    setSelectedJob(null);
    setSelectedJobLoading(true);
    setSelectedJobError(null);

    const fetchSelectedJob = async (): Promise<void> => {
      try {
        const response = await fiaApi.get<Job>(`/job/${stackJobId}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!isSuccessfulImatJob(response.data)) {
          setSelectedJobError('This job is not an available successful IMAT stack.');
          return;
        }

        setSelectedJob(response.data);
        writeSelectedJobToUrl(response.data, true, false);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setSelectedJobError('The selected IMAT stack could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setSelectedJobLoading(false);
      }
    };

    void fetchSelectedJob();
    return () => controller.abort();
  }, [mode, rawStackJobId, stackJobId, writeSelectedJobToUrl]);

  // Keep viewer controls in sync with browser navigation.
  React.useEffect(() => {
    if (mode !== 'stack') return;
    const params = new URLSearchParams(location.search);
    const nextImageIndex = getImageIndex(params.get('imageIndex'));
    const nextViewerSize = isViewerSize(params.get('viewerSize')) ? (params.get('viewerSize') as ViewerSize) : 'fit';
    setCurrentImageIndex((current) => (current === nextImageIndex ? current : nextImageIndex));
    setViewerSize((current) => (current === nextViewerSize ? current : nextViewerSize));
  }, [location.search, mode]);

  const replaceViewerQueryParam = React.useCallback(
    (name: 'imageIndex' | 'viewerSize', value: string, defaultValue: string): void => {
      const params = new URLSearchParams(locationSearchRef.current);
      if (value === defaultValue) {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      const search = params.toString();
      history.replace({ pathname: history.location.pathname, search: search ? `?${search}` : '' });
    },
    [history]
  );

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

  // Reset all stack-specific state as soon as the selected URL job changes.
  React.useEffect(() => {
    if (mode !== 'stack') return;
    setStackImages([]);
    setStackDataset(null);
    setDirectoryPath(null);
    setStackError(null);
    setIsSliding(false);
    setStackCustomIntensityDomain([null, null]);
  }, [mode, stackJobId]);

  // Resolve the selected job's output directory from authoritative job metadata.
  React.useEffect(() => {
    if (mode !== 'stack' || !selectedJob) return;
    const controller = new AbortController();
    const experimentNumber = selectedJob.run.experiment_number;
    const instrumentName = selectedJob.run.instrument_name;

    const resolvePath = async (): Promise<void> => {
      try {
        setStackLoading(true);
        setStackError(null);

        const filename = selectedJob.run?.filename?.split(/[\\/]/).pop() || '';
        const runNumberMatches = filename.match(/\d+/g);
        const runNumberMatch = runNumberMatches?.[runNumberMatches.length - 1];
        const runNumber = runNumberMatch ? parseInt(runNumberMatch, 10).toString() : '';

        // Try to resolve path via find_file
        try {
          const response = await h5Api.get<string>(
            `/find_file/instrument/${instrumentName}/experiment_number/${experimentNumber}`,
            {
              params: { filename: '.' },
              signal: controller.signal,
            }
          );
          if (controller.signal.aborted) return;
          let path = response.data;
          if (runNumber) path = `${path}/run-${runNumber}`;
          setDirectoryPath(path);
        } catch (err: unknown) {
          if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
          console.warn('find_file failed, falling back to job outputs:', err);
          let path = parseJobOutputs(selectedJob.outputs)[0] || selectedJob.outputs;
          if (path) {
            if (path.toLowerCase().endsWith('.tif') || path.toLowerCase().endsWith('.tiff')) {
              const lastSeparator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
              path = lastSeparator >= 0 ? path.substring(0, lastSeparator) : path;
            }
            if (runNumber && !path.includes(`run-${runNumber}`)) {
              path = `${path}/run-${runNumber}`;
            }
            setDirectoryPath(path);
          } else {
            setStackError('Failed to resolve output directory');
          }
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setStackError('Failed to resolve output directory');
      } finally {
        if (!controller.signal.aborted) setStackLoading(false);
      }
    };
    void resolvePath();
    return () => controller.abort();
  }, [mode, selectedJob]);

  // Fetch stack image list
  React.useEffect(() => {
    if (mode !== 'stack' || !directoryPath) return;
    const controller = new AbortController();

    const fetchList = async (): Promise<void> => {
      try {
        setStackLoading(true);
        setStackError(null);
        const response = await h5Api.get<string[]>('/imat/list-images', {
          params: { path: directoryPath },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const sortedData = [...response.data].sort(
          new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare
        );
        setStackImages(sortedData);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setStackError('Failed to list images in stack');
      } finally {
        if (!controller.signal.aborted) setStackLoading(false);
      }
    };
    void fetchList();
    return () => controller.abort();
  }, [mode, directoryPath]);

  // Fetch individual stack image
  const fetchStackImage = React.useCallback(
    async (index: number, downsample: number, signal: AbortSignal): Promise<void> => {
      if (!directoryPath || !stackImages[index]) return;
      try {
        setStackLoading(true);
        setStackError(null);
        const response = await h5Api.get<ArrayBuffer>('/imat/image', {
          responseType: 'arraybuffer',
          signal,
          params: {
            path: `${directoryPath}/${stackImages[index]}`,
            downsample_factor: downsample,
          },
        });
        if (signal.aborted) return;

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
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setStackError('Failed to load stack image');
      } finally {
        if (!signal.aborted) setStackLoading(false);
      }
    },
    [directoryPath, stackImages]
  );

  React.useEffect(() => {
    if (mode !== 'stack' || stackImages.length === 0 || currentImageIndex < stackImages.length) return;
    const clampedIndex = stackImages.length - 1;
    setCurrentImageIndex(clampedIndex);
    replaceViewerQueryParam('imageIndex', clampedIndex.toString(), '0');
  }, [currentImageIndex, mode, replaceViewerQueryParam, stackImages.length]);

  // Consolidated image fetching with debounce
  React.useEffect(() => {
    if (mode !== 'stack' || stackImages.length === 0) return;
    const controller = new AbortController();

    const delay = isSliding ? 50 : 250;
    const downsample = isSliding ? 8 : 1;

    const timer = setTimeout(() => {
      void fetchStackImage(currentImageIndex, downsample, controller.signal);
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, stackImages, currentImageIndex, isSliding, fetchStackImage]);

  const handleSliderChange = (_event: React.SyntheticEvent | Event, newValue: number | number[]): void => {
    setIsSliding(true);
    const index = newValue as number;
    setCurrentImageIndex(index);
    replaceViewerQueryParam('imageIndex', index.toString(), '0');
  };

  const handleSliderChangeCommitted = (_event: React.SyntheticEvent | Event, newValue: number | number[]): void => {
    setIsSliding(false);
    const index = newValue as number;
    setCurrentImageIndex(index);
    replaceViewerQueryParam('imageIndex', index.toString(), '0');
  };

  const handleViewerSizeChange = (_event: React.MouseEvent<HTMLElement>, value: ViewerSize | null): void => {
    if (!value) return;
    setViewerSize(value);
    replaceViewerQueryParam('viewerSize', value, 'fit');
  };

  const stackDomainWidgetStyles = {
    width: '100%',
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
      <Box
        sx={{
          px: '20px',
          pb: 2,
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          minHeight: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {mode === 'latest' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
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
                    maxHeight: viewerSize === 'fit' ? '100%' : 'none',
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
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              minHeight: 0,
            }}
          >
            <ImatStackJobTree
              autoSelect={rawStackJobId === null}
              selectedJobId={stackJobId}
              selectedJob={selectedJob}
              onSelectJob={handleSelectJob}
            />

            <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedJobError ? (
                <Alert severity="error">{selectedJobError}</Alert>
              ) : selectedJobLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                  <CircularProgress aria-label="Loading selected IMAT stack" />
                </Box>
              ) : !selectedJob ? (
                <Typography sx={{ p: 4, textAlign: 'center' }}>Select a job to view its image stack.</Typography>
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
                        gridTemplateColumns: {
                          xs: 'minmax(0, 1fr)',
                          md: 'minmax(0, 1fr) auto',
                          xl: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                        },
                        gridTemplateAreas: {
                          xs: '"image" "size" "intensity"',
                          md: '"image size" "intensity intensity"',
                          xl: '"image size intensity"',
                        },
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
                          gridArea: 'image',
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
                        onChange={handleViewerSizeChange}
                        size="small"
                        aria-label="viewer size"
                        sx={{
                          gridArea: 'size',
                          justifySelf: { xs: 'stretch', sm: 'start', md: 'end', xl: 'center' },
                          width: { xs: '100%', sm: 'auto' },
                          maxWidth: '100%',
                          '& .MuiToggleButton-root': {
                            width: { xs: 'auto', sm: 76 },
                            flex: { xs: 1, sm: '0 0 auto' },
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

                      <Box
                        sx={{
                          gridArea: 'intensity',
                          justifySelf: { xs: 'stretch', md: 'end' },
                          width: '100%',
                          maxWidth: 500,
                        }}
                      >
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
                        maxHeight: viewerSize === 'fit' ? '100%' : 'none',
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
          </Box>
        )}
      </Box>
    </>
  );
};

export default IMATViewer;
