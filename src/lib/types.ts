export const reductionStates = ['ERROR', 'UNSUCCESSFUL', 'SUCCESSFUL', 'NOT_STARTED'] as const;

export type ReductionState = (typeof reductionStates)[number];

export interface Job {
  id: number;
  start: string;
  end: string;
  state: ReductionState;
  status_message: string;
  runner_image: string;
  type: string;
  inputs: {
    [key: string]: string | number | boolean | null;
  };
  outputs: string;
  stacktrace: string;
  script: {
    value: string;
  };
  run: {
    experiment_number: number;
    filename: string;
    run_start: string;
    run_end: string;
    title: string;
    users: string;
    good_frames: number;
    raw_frames: number;
    instrument_name: string;
  };
}

export interface JobQueryFilters {
  experiment_number_in?: number[];
  title?: string;
  job_state_in?: string[];
  filename?: string;
  instrument_in?: string[];
  job_start_before?: string;
  job_start_after?: string;
  job_end_before?: string;
  job_end_after?: string;
  run_start_before?: string;
  run_start_after?: string;
  run_end_before?: string;
  run_end_after?: string;
  experiment_number_after?: number;
  experiment_number_before?: number;
}

export type MantidVersionMap = Record<string, string>;

// ============= H5 Viewer Types =============
// Types for HDF5 data visualization

import type { DType } from '@h5web/app';

// Discovered dataset information from H5 files
export interface DatasetInfo {
  path: string;
  shape: number[];
  dtype: DType;
  errorPath?: string;
  is1D: boolean;
  is2D: boolean;
  isPrimary?: boolean; // Whether this dataset has a 'signal' attribute (primary data)
}

// File configuration for H5 data fetching and visualization
export interface FileConfig {
  filename: string;
  fullPath?: string; // Full path from the plotting API
  path?: string; // Selected dataset path (undefined until user selects)
  errorPath?: string; // Path to error dataset if available
  color?: string; // For multi-line plotting
  enabled: boolean; // Whether this file is selected for discovery
  selection?: number; // Selection index for slicing (for 2D→1D plots)

  // Discovered datasets from h5grove
  discoveredDatasets?: DatasetInfo[]; // All numeric datasets found in the file
  isDiscovered?: boolean; // Whether datasets have been discovered
  selectedDatasetIs2D?: boolean; // Whether the selected dataset is 2D (for slice support)
}

// API response types for H5 data
export type DataArray1D = number[];

// Data point for line plotting
export interface LinePlotData {
  filename: string;
  data: DataArray1D;
  errors?: DataArray1D;
  color?: string;
}

// API request parameters for H5 data fetching
export interface DataRequestParams {
  file: string;
  path: string;
  selection?: number;
}
