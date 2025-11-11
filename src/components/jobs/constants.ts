// Constants related to job pagination
export const JOB_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export type JobRowsPerPage = (typeof JOB_ROWS_PER_PAGE_OPTIONS)[number];

export const isJobRowsPerPage = (value: number): value is JobRowsPerPage =>
  JOB_ROWS_PER_PAGE_OPTIONS.includes(value as JobRowsPerPage);
