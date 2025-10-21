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

export type RunnerVersionMap = Record<string, string>;
