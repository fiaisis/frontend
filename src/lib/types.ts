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
