import React from 'react';
import NavArrows from '../components/navigation/NavArrows';
import axios from 'axios';
import { Box, CircularProgress, FormControl, InputLabel, MenuItem, Select, Typography, useTheme } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import type { TooltipComponentOption } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { plottingApi } from '../lib/api';
import {
  COLOR_PALETTES,
  DEFAULT_DOWNSAMPLE_FACTOR,
  DOWNSAMPLE_OPTIONS,
  LUMINANCE_BUCKETS,
  PALETTE_OPTIONS,
  RANGE_CLIP_PERCENTAGE,
} from '../lib/viewerConstants';
import type { PaletteKey } from '../lib/viewerConstants';

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

type HeatmapDataset = {
  data: Array<[number, number, number]>;
  sampledWidth: number;
  sampledHeight: number;
  originalWidth: number;
  originalHeight: number;
  downsampleFactor: number;
  minValue: number;
  maxValue: number;
};

type DatasetOverrides = Partial<
  Pick<
    HeatmapDataset,
    'sampledWidth' | 'sampledHeight' | 'originalWidth' | 'originalHeight' | 'downsampleFactor' | 'minValue' | 'maxValue'
  >
>;

const computeHeatmapFromImageData = (imageData: ImageData) => {
  const { width, height, data } = imageData;

  const heatmapData: Array<[number, number, number]> = new Array(width * height);
  const histogram = new Array<number>(LUMINANCE_BUCKETS).fill(0);
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;
  let dataIndex = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1, dataIndex += 1) {
      const rgbaIndex = (y * width + x) * 4;
      const r = data[rgbaIndex];
      const g = data[rgbaIndex + 1];
      const b = data[rgbaIndex + 2];
      const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;

      heatmapData[dataIndex] = [x, y, value];
      const bucketIndex = Math.min(LUMINANCE_BUCKETS - 1, Math.max(0, Math.round(value)));
      histogram[bucketIndex] += 1;
    }
  }

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    throw new Error('Unable to compute heatmap range');
  }

  if (Math.abs(maxValue - minValue) < 1e-6) {
    maxValue = minValue + 1;
  }

  let clippedMin = minValue;
  let clippedMax = maxValue;
  const totalSamples = width * height;
  const clipThreshold = Math.max(1, Math.floor(totalSamples * RANGE_CLIP_PERCENTAGE));

  if (clipThreshold * 2 < totalSamples) {
    let cumulative = 0;
    let lowerIndex = 0;
    for (let i = 0; i < histogram.length; i += 1) {
      cumulative += histogram[i];
      if (cumulative >= clipThreshold) {
        lowerIndex = i;
        break;
      }
    }

    cumulative = 0;
    let upperIndex = histogram.length - 1;
    for (let i = histogram.length - 1; i >= 0; i -= 1) {
      cumulative += histogram[i];
      if (cumulative >= clipThreshold) {
        upperIndex = i;
        break;
      }
    }

    if (lowerIndex < upperIndex) {
      clippedMin = Math.max(minValue, lowerIndex);
      clippedMax = Math.min(maxValue, upperIndex);
      if (clippedMin >= clippedMax) {
        clippedMin = minValue;
        clippedMax = maxValue;
      }
    }
  }

  return {
    data: heatmapData,
    minValue: clippedMin,
    maxValue: clippedMax,
    width,
    height,
  };
};

const convertImageBlobToHeatmap = async (blob: Blob, overrides?: DatasetOverrides): Promise<HeatmapDataset> => {
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        img.onload = null;
        img.onerror = null;
        resolve(img);
      };
      img.onerror = () => {
        img.onload = null;
        img.onerror = null;
        reject(new Error('Unable to load image blob'));
      };
      img.src = imageUrl;
    });

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to obtain 2D canvas context');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const computed = computeHeatmapFromImageData(imageData);

    return {
      data: computed.data,
      sampledWidth: overrides?.sampledWidth ?? computed.width,
      sampledHeight: overrides?.sampledHeight ?? computed.height,
      originalWidth: overrides?.originalWidth ?? computed.width,
      originalHeight: overrides?.originalHeight ?? computed.height,
      downsampleFactor: overrides?.downsampleFactor ?? 1,
      minValue: overrides?.minValue ?? computed.minValue,
      maxValue: overrides?.maxValue ?? computed.maxValue,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const parseNumericHeader = (
  headers: Record<string, string | string[] | undefined>,
  key: string
): number | undefined => {
  const rawValue = headers[key];
  const headerValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (typeof headerValue !== 'string') return undefined;

  const parsed = Number(headerValue);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const IMATViewer: React.FC = () => {
  const theme = useTheme();
  const [dataset, setDataset] = React.useState<HeatmapDataset | null>(null);
  const [selectedPalette, setSelectedPalette] = React.useState<PaletteKey>('viridis');
  const [downsampleFactor, setDownsampleFactor] = React.useState<number>(DEFAULT_DOWNSAMPLE_FACTOR);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const chartAspectRatio = React.useMemo(() => {
    if (!dataset || dataset.originalHeight === 0) return 1;
    return Math.max(dataset.originalWidth / dataset.originalHeight, 1e-6);
  }, [dataset]);

  const heatmapOption = React.useMemo<EChartsOption | undefined>(() => {
    if (!dataset) return undefined;

    const tooltipFormatter: TooltipComponentOption['formatter'] = (params) => {
      const single = Array.isArray(params) ? params[0] : params;
      if (!single) return '';
      const rawValue = single.value;
      const displayValue = Array.isArray(rawValue) ? rawValue[2] : rawValue;
      return typeof displayValue === 'number' ? `Value: ${displayValue.toFixed(2)}` : '';
    };

    const progressive = Math.max(Math.floor(dataset.data.length / 50), 200);
    const progressiveThreshold = Math.max(Math.floor(dataset.data.length / 20), 800);

    return {
      tooltip: {
        position: 'top',
        triggerOn: 'mousemove|click',
        formatter: tooltipFormatter,
      },
      animation: false,
      grid: { top: 0, right: 48, bottom: 0, left: 0 },
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.max(dataset.sampledWidth - 1, 0),
        axisLabel: { show: false },
        axisTick: { show: false },
        splitArea: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: Math.max(dataset.sampledHeight - 1, 0),
        axisLabel: { show: false },
        axisTick: { show: false },
        splitArea: { show: false },
        splitLine: { show: false },
        inverse: true,
      },
      visualMap: {
        min: Math.floor(dataset.minValue),
        max: Math.ceil(dataset.maxValue),
        calculable: true,
        realtime: true,
        orient: 'vertical',
        right: 8,
        top: 'center',
        inRange: {
          color: COLOR_PALETTES[selectedPalette],
        },
      },
      series: [
        {
          type: 'heatmap',
          data: dataset.data,
          progressive,
          progressiveThreshold,
          emphasis: {
            disabled: true,
          },
        },
      ],
    };
  }, [dataset, selectedPalette]);

  const handlePaletteChange = (event: SelectChangeEvent): void => {
    const nextPalette = event.target.value as PaletteKey;
    setSelectedPalette(nextPalette);
  };

  const handleDownsampleChange = (event: SelectChangeEvent): void => {
    const nextFactor = Number(event.target.value);
    if (Number.isFinite(nextFactor)) {
      setDownsampleFactor(nextFactor);
    }
  };

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

        const response = await plottingApi.get('/imat/latest-image', {
          responseType: 'blob',
          signal: controller.signal,
          params: { downsample_factor: downsampleFactor },
        });

        if (!isMounted) return;

        const blob: Blob = response.data;
        if (!blob.type.startsWith('image/')) {
          setError('Latest IMAT heatmap could not be generated');
          return;
        }

        const headers = response.headers as Record<string, string | string[] | undefined>;
        const overrides: DatasetOverrides = {
          originalWidth: parseNumericHeader(headers, 'x-original-width'),
          originalHeight: parseNumericHeader(headers, 'x-original-height'),
          sampledWidth: parseNumericHeader(headers, 'x-sampled-width'),
          sampledHeight: parseNumericHeader(headers, 'x-sampled-height'),
          downsampleFactor: parseNumericHeader(headers, 'x-downsample-factor') ?? downsampleFactor,
          minValue: parseNumericHeader(headers, 'x-min-value'),
          maxValue: parseNumericHeader(headers, 'x-max-value'),
        };

        const heatmapResult = await convertImageBlobToHeatmap(blob, overrides);

        if (!isMounted) return;
        setDataset(heatmapResult);
      } catch (err) {
        if (!isMounted) return;

        if (axios.isAxiosError(err)) {
          if (err.code === 'ERR_CANCELED') return;

          if (err.response?.status === 404) {
            setError('Latest IMAT heatmap could not be found');
          } else {
            setError('Unable to generate the latest IMAT heatmap');
          }
        } else {
          setError('Unable to generate the latest IMAT heatmap');
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
  }, [downsampleFactor]);

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
      <NavArrows />
      <Box
        sx={{
          padding: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h3" component="h1" sx={{ color: theme.palette.text.primary }}>
          IMAT viewer
        </Typography>
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                }}
              >
                <FormControl size="small" sx={{ minWidth: 200 }} disabled={loading} variant="outlined">
                  <InputLabel id="imat-downsample-select-label">Downsampling</InputLabel>
                  <Select
                    labelId="imat-downsample-select-label"
                    id="imat-downsample-select"
                    value={downsampleFactor.toString()}
                    label="Downsampling"
                    onChange={handleDownsampleChange}
                  >
                    {DOWNSAMPLE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }} disabled={!dataset} variant="outlined">
                  <InputLabel id="imat-palette-select-label">Palette</InputLabel>
                  <Select
                    labelId="imat-palette-select-label"
                    id="imat-palette-select"
                    value={selectedPalette}
                    label="Palette"
                    onChange={handlePaletteChange}
                  >
                    {PALETTE_OPTIONS.map((paletteKey) => (
                      <MenuItem key={paletteKey} value={paletteKey}>
                        {paletteKey.charAt(0).toUpperCase() + paletteKey.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
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
                    aspectRatio: chartAspectRatio,
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
                  {heatmapOption ? (
                    <ReactEChartsCore
                      echarts={echarts}
                      option={heatmapOption}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
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
              {error ?? 'Latest IMAT heatmap could not be generated.'}
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
};

export default IMATViewer;
