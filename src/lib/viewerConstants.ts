export const COLOR_PALETTES = {
  viridis: ['#440154', '#414487', '#2a788e', '#22a784', '#7ad151', '#fde725'],
  turbo: ['#30123b', '#4145ad', '#4fb5dd', '#67e08f', '#f9fb34', '#f99d1c', '#d43d2a'],
  magma: ['#000004', '#1c1044', '#4f127b', '#82206c', '#b63655', '#ed6925', '#fbdf72'],
  inferno: ['#000004', '#1f0c48', '#4b0f6b', '#781c6d', '#a52c60', '#cf4446', '#f98c0a'],
  cividis: ['#00224e', '#343f8e', '#5a5ba7', '#8184b0', '#abaea5', '#d7d77f', '#fde545'],
} as const;

export type PaletteKey = keyof typeof COLOR_PALETTES;

export const PALETTE_OPTIONS = Object.keys(COLOR_PALETTES) as PaletteKey[];

export const LUMINANCE_BUCKETS = 256;
export const RANGE_CLIP_PERCENTAGE = 0.005;

export const DOWNSAMPLE_OPTIONS = [
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
  { label: '8x', value: 8 },
  { label: '16x', value: 16 },
  { label: '32x', value: 32 },
];

export const DEFAULT_DOWNSAMPLE_FACTOR = 8;
