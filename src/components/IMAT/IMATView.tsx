import React from 'react';
import axios from 'axios';
import { Box, CircularProgress, FormControl, InputLabel, MenuItem, Select, Typography, useTheme } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import UTIF from 'utif';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import type { TooltipComponentOption } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { plottingApi } from '../../lib/api';

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const MAX_HEATMAP_DIMENSION = 256;

const COLOR_PALETTES = {
  turbo: ['#30123b', '#4145ad', '#4fb5dd', '#67e08f', '#f9fb34', '#f99d1c', '#d43d2a'],
  viridis: ['#440154', '#414487', '#2a788e', '#22a784', '#7ad151', '#fde725'],
  magma: ['#000004', '#1c1044', '#4f127b', '#82206c', '#b63655', '#ed6925', '#fbdf72'],
  inferno: ['#000004', '#1f0c48', '#4b0f6b', '#781c6d', '#a52c60', '#cf4446', '#f98c0a'],
  cividis: ['#00224e', '#343f8e', '#5a5ba7', '#8184b0', '#abaea5', '#d7d77f', '#fde545'],
} as const;

type PaletteKey = keyof typeof COLOR_PALETTES;

const PALETTE_OPTIONS = Object.keys(COLOR_PALETTES) as PaletteKey[];

type HeatmapDataset = {
  data: Array<[number, number, number]>;
  xCategories: number[];
  yCategories: number[];
  sampledWidth: number;
  sampledHeight: number;
  originalWidth: number;
  originalHeight: number;
  minValue: number;
  maxValue: number;
};

const getSampleDimensions = (width: number, height: number): { width: number; height: number } => {
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid image dimensions');
  }

  const scale = Math.min(MAX_HEATMAP_DIMENSION / width, MAX_HEATMAP_DIMENSION / height, 1);
  const sampledWidth = Math.max(1, Math.round(width * scale));
  const sampledHeight = Math.max(1, Math.round(height * scale));

  return { width: sampledWidth, height: sampledHeight };
};

const computeHeatmapFromImageData = (
  imageData: ImageData,
  originalWidth: number,
  originalHeight: number
): HeatmapDataset => {
  const { width, height, data } = imageData;

  const heatmapData: Array<[number, number, number]> = new Array(width * height);
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
    }
  }

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    throw new Error('Unable to compute heatmap range');
  }

  if (Math.abs(maxValue - minValue) < 1e-6) {
    maxValue = minValue + 1;
  }

  return {
    data: heatmapData,
    xCategories: Array.from({ length: width }, (_, index) => index),
    yCategories: Array.from({ length: height }, (_, index) => index),
    sampledWidth: width,
    sampledHeight: height,
    originalWidth,
    originalHeight,
    minValue,
    maxValue,
  };
};

const convertTiffBlobToHeatmap = async (blob: Blob): Promise<HeatmapDataset> => {
  const arrayBuffer = await blob.arrayBuffer();
  const ifds = UTIF.decode(arrayBuffer);
  if (!Array.isArray(ifds) || ifds.length === 0) {
    throw new Error('No image data found in TIFF');
  }

  UTIF.decodeImages(arrayBuffer, ifds);

  const image = ifds[0] as { width?: number; height?: number };
  if (!image?.width || !image?.height) {
    throw new Error('TIFF image is missing dimensions');
  }

  const rgba = UTIF.toRGBA8(ifds[0]);
  const { width: targetWidth, height: targetHeight } = getSampleDimensions(image.width, image.height);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) {
    throw new Error('Unable to obtain 2D canvas context');
  }

  const clampedRgba = rgba instanceof Uint8ClampedArray ? rgba : new Uint8ClampedArray(rgba);
  const sourceImageData = new ImageData(clampedRgba, image.width, image.height);
  sourceContext.putImageData(sourceImageData, 0, 0);

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = targetWidth;
  sampleCanvas.height = targetHeight;
  const sampleContext = sampleCanvas.getContext('2d');
  if (!sampleContext) {
    throw new Error('Unable to obtain 2D canvas context');
  }

  sampleContext.imageSmoothingEnabled = true;
  sampleContext.imageSmoothingQuality = 'high';
  sampleContext.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  const sampledImageData = sampleContext.getImageData(0, 0, targetWidth, targetHeight);
  return computeHeatmapFromImageData(sampledImageData, image.width, image.height);
};

const convertImageBlobToHeatmap = async (blob: Blob): Promise<HeatmapDataset> => {
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

    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    const { width: targetWidth, height: targetHeight } = getSampleDimensions(originalWidth, originalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to obtain 2D canvas context');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
    return computeHeatmapFromImageData(imageData, originalWidth, originalHeight);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const IMATView: React.FC = () => {
  const theme = useTheme();
  const [dataset, setDataset] = React.useState<HeatmapDataset | null>(null);
  const [selectedPalette, setSelectedPalette] = React.useState<PaletteKey>('turbo');
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
        type: 'category',
        data: dataset.xCategories,
        axisLabel: { show: false },
        axisTick: { show: false },
        splitArea: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: dataset.yCategories,
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

  const handlePaletteChange = (event: SelectChangeEvent) => {
    const nextPalette = event.target.value as PaletteKey;
    setSelectedPalette(nextPalette);
  };

  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchLatestImage = async (): Promise<void> => {
      const baseUrl = import.meta.env.VITE_PLOTTING_API_URL;
      if (!baseUrl) {
        setError('Plotting API is not configured');
        setDataset(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setDataset(null);

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
        const isTiffMimeType = /^image\/tiff?$/i.test(blob.type);
        const shouldConvertTiff = isTiffMimeType || (!isImageBlob && hasImageExtension);

        if (!isImageBlob && !hasImageExtension) {
          setDataset(null);
          setError('Latest IMAT heatmap could not be generated');
          return;
        }

        const heatmapResult = shouldConvertTiff
          ? await convertTiffBlobToHeatmap(blob)
          : await convertImageBlobToHeatmap(blob);

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
        setDataset(null);
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

  if (loading) {
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
              justifyContent: 'flex-end',
            }}
          >
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
            </Box>
          </Box>
          <Typography variant="caption" color={theme.palette.text.secondary}>
            Displaying {dataset.sampledWidth}x{dataset.sampledHeight} heatmap derived from original{' '}
            {dataset.originalWidth}x{dataset.originalHeight} image.
          </Typography>
        </>
      ) : (
        <Typography variant="h6" color={theme.palette.text.primary}>
          {error ?? 'Latest IMAT heatmap could not be generated.'}
        </Typography>
      )}
    </Box>
  );
};

export default IMATView;

