import type { NumericType } from '@h5web/app';
import type { DatasetInfo, FileConfig, Job, LinePlotData } from '../lib/types';

interface MockSeries {
  color?: string;
  data: number[];
  errors?: number[];
}

interface Mock2DPreview {
  columns: number;
  datasetPath: string;
  experimentNumber: number;
  instrumentName: string;
  rows: number;
  values: number[];
}

interface MockDatasetDefinition {
  buildLineSeries: (selection?: number) => MockSeries;
  info: DatasetInfo;
  preview?: Mock2DPreview;
}

interface MockFileDefinition {
  datasets: MockDatasetDefinition[];
  defaultDatasetPath: string;
  defaultEnabled: boolean;
  defaultSelection: number[];
  experimentNumber: number;
  filename: string;
  fullPath: string;
  instrumentName: string;
}

export interface MockSearchDefaults {
  experimentNumber: number | null;
  instrument: string | null;
  limit: number;
}

export interface MockDatasetSelection {
  defaultSelection: number[];
  errorPath?: string;
  is2D: boolean;
  path: string;
}

export interface Mock2DPreviewData extends Mock2DPreview {
  filename: string;
  shape: number[];
}

const FLOAT64 = { class: 'Float', size: 8, endianness: undefined } as NumericType;
const INT32 = { class: 'Integer', signed: true, size: 4, endianness: undefined } as NumericType;

const DEFAULT_PREVIEW_SEARCH: MockSearchDefaults = {
  instrument: 'ZOOM',
  experimentNumber: null,
  limit: 10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createDecaySeries(length: number, amplitude: number, phase: number, decay: number, offset = 0.18): number[] {
  return Array.from({ length }, (_, index) => {
    const position = index / Math.max(length - 1, 1);
    const oscillation = 1 + 0.28 * Math.sin(position * 9 + phase) + 0.08 * Math.cos(position * 21 + phase * 0.6);
    const value = offset + amplitude * Math.exp(-position * decay) * oscillation;
    return Number(Math.max(value, 0.02).toFixed(4));
  });
}

function createSliceSeries(length: number, slice: number, amplitude: number, phase: number, offset = 0.16): number[] {
  return Array.from({ length }, (_, index) => {
    const position = index / Math.max(length - 1, 1);
    const band = 0.72 + Math.sin(position * 7.5 + slice * 0.4 + phase) * 0.18;
    const peak = Math.exp(-Math.pow(position - 0.34 - slice * 0.01, 2) / 0.014) * amplitude;
    const shoulder = Math.exp(-Math.pow(position - 0.68, 2) / 0.026) * amplitude * 0.38;
    return Number(Math.max(offset + band + peak + shoulder, 0.02).toFixed(4));
  });
}

function createErrorSeries(data: number[], scale: number): number[] {
  return data.map((value, index) => Number(Math.max(value * scale + 0.008 + (index % 5) * 0.0015, 0.004).toFixed(4)));
}

function createHeatmap(rows: number, columns: number, seed: number): number[] {
  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const ridgeA = Math.exp(-((row - rows * 0.35) ** 2 + (column - columns * 0.28) ** 2) / (columns * 0.8));
    const ridgeB = Math.exp(-((row - rows * 0.7) ** 2 + (column - columns * 0.72) ** 2) / (columns * 1.2));
    const wave = Math.sin((row + seed) / 2.2) * 0.12 + Math.cos((column - seed) / 3.4) * 0.1;
    return Number(clamp(0.18 + ridgeA * 0.64 + ridgeB * 0.48 + wave, 0, 1).toFixed(3));
  });
}

function buildMockJob({
  experimentNumber,
  filename,
  id,
  instrumentName,
  outputs,
  title,
}: {
  experimentNumber: number;
  filename: string;
  id: number;
  instrumentName: string;
  outputs: string[];
  title: string;
}): Job {
  const outputString = outputs.join(', ');

  return {
    id,
    start: '2026-04-15T09:15:00Z',
    end: '2026-04-15T09:24:00Z',
    state: 'SUCCESSFUL',
    status_message: 'Reduction completed successfully',
    runner_image: 'mantid:latest',
    type: 'reduction',
    inputs: {
      experiment_number: experimentNumber,
      instrument: instrumentName,
      transmission: 'auto',
    },
    outputs: outputString,
    stacktrace: '',
    script: {
      value: '# preview reduction script',
    },
    run: {
      experiment_number: experimentNumber,
      filename,
      run_start: '2026-04-15T08:58:00Z',
      run_end: '2026-04-15T09:11:00Z',
      title,
      users: 'Frontend Preview',
      good_frames: 113245,
      raw_frames: 115008,
      instrument_name: instrumentName,
    },
  };
}

const mockFileDefinitions: Record<string, MockFileDefinition> = {
  'zoom_102934_diagnostics.h5': {
    filename: 'zoom_102934_diagnostics.h5',
    fullPath: '/mock/ZOOM/102934/zoom_102934_diagnostics.h5',
    instrumentName: 'ZOOM',
    experimentNumber: 102934,
    defaultEnabled: true,
    defaultDatasetPath: '/entry/detector/bank_0',
    defaultSelection: [5, 11],
    datasets: [
      {
        info: {
          path: '/entry/detector/bank_0',
          shape: [18, 48],
          dtype: INT32,
          errorPath: '/entry/detector/bank_0_errors',
          is1D: false,
          is2D: true,
          isPrimary: true,
        },
        buildLineSeries: (selection = 0) => {
          const data = createSliceSeries(80, selection, 1.35, 0.55);

          return {
            data,
            errors: createErrorSeries(data, 0.06),
            color: '#c084fc',
          };
        },
        preview: {
          instrumentName: 'ZOOM',
          experimentNumber: 102934,
          datasetPath: '/entry/detector/bank_0',
          rows: 18,
          columns: 48,
          values: createHeatmap(18, 48, 7),
        },
      },
      {
        info: {
          path: '/entry/detector/monitor_counts',
          shape: [80],
          dtype: FLOAT64,
          is1D: true,
          is2D: false,
        },
        buildLineSeries: () => ({
          data: createDecaySeries(80, 0.94, 1.15, 1.2, 0.08),
          color: '#f97316',
        }),
      },
    ],
  },
  'zoom_102934_reduced.nxs': {
    filename: 'zoom_102934_reduced.nxs',
    fullPath: '/mock/ZOOM/102934/zoom_102934_reduced.nxs',
    instrumentName: 'ZOOM',
    experimentNumber: 102934,
    defaultEnabled: true,
    defaultDatasetPath: '/entry/reduced/I(Q)',
    defaultSelection: [],
    datasets: [
      {
        info: {
          path: '/entry/reduced/I(Q)',
          shape: [96],
          dtype: FLOAT64,
          errorPath: '/entry/reduced/I(Q)_stddev',
          is1D: true,
          is2D: false,
          isPrimary: true,
        },
        buildLineSeries: () => {
          const data = createDecaySeries(96, 1.74, 0.35, 1.75);

          return {
            data,
            errors: createErrorSeries(data, 0.035),
            color: '#2563eb',
          };
        },
      },
      {
        info: {
          path: '/entry/reduced/transmission',
          shape: [96],
          dtype: FLOAT64,
          is1D: true,
          is2D: false,
        },
        buildLineSeries: () => ({
          data: createDecaySeries(96, 0.58, 1.75, 0.8, 0.36),
          color: '#10b981',
        }),
      },
    ],
  },
  'zoom_102947_merged.h5': {
    filename: 'zoom_102947_merged.h5',
    fullPath: '/mock/ZOOM/102947/zoom_102947_merged.h5',
    instrumentName: 'ZOOM',
    experimentNumber: 102947,
    defaultEnabled: false,
    defaultDatasetPath: '/entry/result/iq_azimuthal',
    defaultSelection: [],
    datasets: [
      {
        info: {
          path: '/entry/result/iq_azimuthal',
          shape: [72],
          dtype: FLOAT64,
          errorPath: '/entry/result/iq_azimuthal_errors',
          is1D: true,
          is2D: false,
          isPrimary: true,
        },
        buildLineSeries: () => {
          const data = createDecaySeries(72, 1.28, 0.92, 1.55, 0.22);

          return {
            data,
            errors: createErrorSeries(data, 0.042),
            color: '#dc2626',
          };
        },
      },
      {
        info: {
          path: '/entry/result/background',
          shape: [72],
          dtype: FLOAT64,
          is1D: true,
          is2D: false,
        },
        buildLineSeries: () => ({
          data: createDecaySeries(72, 0.24, 2.4, 0.55, 0.11),
          color: '#64748b',
        }),
      },
    ],
  },
  'larmor_88123_detector.h5': {
    filename: 'larmor_88123_detector.h5',
    fullPath: '/mock/LARMOR/88123/larmor_88123_detector.h5',
    instrumentName: 'LARMOR',
    experimentNumber: 88123,
    defaultEnabled: true,
    defaultDatasetPath: '/entry/detector/main_bank',
    defaultSelection: [4, 9],
    datasets: [
      {
        info: {
          path: '/entry/detector/main_bank',
          shape: [20, 42],
          dtype: INT32,
          errorPath: '/entry/detector/main_bank_errors',
          is1D: false,
          is2D: true,
          isPrimary: true,
        },
        buildLineSeries: (selection = 0) => {
          const data = createSliceSeries(84, selection, 1.15, 1.3, 0.12);

          return {
            data,
            errors: createErrorSeries(data, 0.052),
            color: '#8b5cf6',
          };
        },
        preview: {
          instrumentName: 'LARMOR',
          experimentNumber: 88123,
          datasetPath: '/entry/detector/main_bank',
          rows: 20,
          columns: 42,
          values: createHeatmap(20, 42, 12),
        },
      },
      {
        info: {
          path: '/entry/diagnostics/frame_sums',
          shape: [84],
          dtype: FLOAT64,
          is1D: true,
          is2D: false,
        },
        buildLineSeries: () => ({
          data: createDecaySeries(84, 0.62, 0.7, 1.05, 0.2),
          color: '#fb7185',
        }),
      },
    ],
  },
  'larmor_88123_iq.nxs': {
    filename: 'larmor_88123_iq.nxs',
    fullPath: '/mock/LARMOR/88123/larmor_88123_iq.nxs',
    instrumentName: 'LARMOR',
    experimentNumber: 88123,
    defaultEnabled: true,
    defaultDatasetPath: '/entry/result/I(Q)',
    defaultSelection: [],
    datasets: [
      {
        info: {
          path: '/entry/result/I(Q)',
          shape: [88],
          dtype: FLOAT64,
          errorPath: '/entry/result/I(Q)_errors',
          is1D: true,
          is2D: false,
          isPrimary: true,
        },
        buildLineSeries: () => {
          const data = createDecaySeries(88, 1.44, 0.42, 1.42, 0.19);

          return {
            data,
            errors: createErrorSeries(data, 0.032),
            color: '#0891b2',
          };
        },
      },
      {
        info: {
          path: '/entry/result/polarisation',
          shape: [88],
          dtype: FLOAT64,
          is1D: true,
          is2D: false,
        },
        buildLineSeries: () => ({
          data: createDecaySeries(88, 0.34, 2.05, 0.48, 0.42),
          color: '#16a34a',
        }),
      },
    ],
  },
};

const mockJobs: Job[] = [
  buildMockJob({
    id: 41021,
    instrumentName: 'ZOOM',
    experimentNumber: 102934,
    filename: 'ZOOM000102934.nxs',
    title: 'Micellar contrast sweep',
    outputs: ['zoom_102934_reduced.nxs', 'zoom_102934_diagnostics.h5'],
  }),
  buildMockJob({
    id: 41022,
    instrumentName: 'ZOOM',
    experimentNumber: 102947,
    filename: 'ZOOM000102947.nxs',
    title: 'Silica sol aging',
    outputs: ['zoom_102947_merged.h5'],
  }),
  buildMockJob({
    id: 41023,
    instrumentName: 'ZOOM',
    experimentNumber: 102951,
    filename: 'ZOOM000102951.nxs',
    title: 'Transmission reference',
    outputs: [],
  }),
  buildMockJob({
    id: 52110,
    instrumentName: 'LARMOR',
    experimentNumber: 88123,
    filename: 'LARMOR00088123.nxs',
    title: 'Protein assembly run',
    outputs: ['larmor_88123_iq.nxs', 'larmor_88123_detector.h5'],
  }),
];

function getOutputFilenames(job: Job): string[] {
  if (!job.outputs.trim()) {
    return [];
  }

  return job.outputs
    .split(',')
    .map((output) => output.trim())
    .filter((output) => output.length > 0);
}

function getFileDefinition(filename: string): MockFileDefinition | undefined {
  return mockFileDefinitions[filename];
}

function getDefaultDataset(
  definition: MockFileDefinition,
  autoSelectPrimary: boolean
): MockDatasetDefinition | undefined {
  if (autoSelectPrimary) {
    return definition.datasets.find((dataset) => dataset.info.isPrimary) ?? definition.datasets[0];
  }

  return undefined;
}

export const DEFAULT_MOCK_SEARCH = DEFAULT_PREVIEW_SEARCH;

export function getMockJobs(instrument: string | null, experimentNumber: number | null, limit: number): Job[] {
  return mockJobs
    .filter((job) => {
      const instrumentMatches = instrument ? job.run.instrument_name === instrument : true;
      const experimentMatches = experimentNumber !== null ? job.run.experiment_number === experimentNumber : true;

      return instrumentMatches && experimentMatches;
    })
    .slice(0, limit);
}

export function buildMockFiles(jobs: Job[]): FileConfig[] {
  const filenames = Array.from(new Set(jobs.flatMap(getOutputFilenames)));

  return filenames.flatMap((filename) => {
    const definition = getFileDefinition(filename);

    if (!definition) {
      return [];
    }

    const defaultDataset = definition.datasets.find((dataset) => dataset.info.path === definition.defaultDatasetPath);

    return {
      filename,
      fullPath: definition.fullPath,
      path: definition.defaultEnabled ? defaultDataset?.info.path : undefined,
      errorPath: definition.defaultEnabled ? defaultDataset?.info.errorPath : undefined,
      enabled: definition.defaultEnabled,
      selection: definition.defaultEnabled && defaultDataset?.info.is2D ? [...definition.defaultSelection] : [],
      selectionInputMode: 'text',
      discoveredDatasets: definition.datasets.map((dataset) => dataset.info),
      isDiscovered: true,
      selectedDatasetIs2D: definition.defaultEnabled ? defaultDataset?.info.is2D : undefined,
    };
  });
}

export function getMockDatasetSelection(filename: string, autoSelectPrimary: boolean): MockDatasetSelection | null {
  const definition = getFileDefinition(filename);

  if (!definition) {
    return null;
  }

  const dataset = getDefaultDataset(definition, autoSelectPrimary);

  if (!dataset) {
    return null;
  }

  return {
    path: dataset.info.path,
    errorPath: dataset.info.errorPath,
    is2D: dataset.info.is2D,
    defaultSelection: dataset.info.is2D ? [...definition.defaultSelection] : [],
  };
}

export function buildMockLinePlotData(files: FileConfig[]): LinePlotData[] {
  return files.flatMap((file) => {
    if (!file.enabled || !file.path) {
      return [];
    }

    const definition = getFileDefinition(file.filename);
    const dataset = definition?.datasets.find((candidate) => candidate.info.path === file.path);

    if (!dataset) {
      return [];
    }

    if (!dataset.info.is2D) {
      const series = dataset.buildLineSeries();

      return {
        filename: file.filename,
        data: series.data,
        errors: series.errors,
        color: series.color,
      };
    }

    const selections = file.selection && file.selection.length > 0 ? file.selection : [0];

    return selections.map((selection) => {
      const series = dataset.buildLineSeries(selection);

      return {
        filename: `${file.filename} [slice ${selection}]`,
        data: series.data,
        errors: series.errors,
        color: series.color,
      };
    });
  });
}

export function getDefaultMock2DFile(jobs: Job[]): string | null {
  const filenames = jobs.flatMap(getOutputFilenames);

  return (
    filenames.find((filename) => {
      const definition = getFileDefinition(filename);
      return definition?.datasets.some((dataset) => dataset.info.is2D);
    }) ?? null
  );
}

export function getMock2DPreview(filename: string | null): Mock2DPreviewData | null {
  if (!filename) {
    return null;
  }

  const definition = getFileDefinition(filename);
  const dataset = definition?.datasets.find((candidate) => candidate.preview);

  if (!definition || !dataset || !dataset.preview) {
    return null;
  }

  return {
    filename,
    shape: dataset.info.shape,
    ...dataset.preview,
  };
}
