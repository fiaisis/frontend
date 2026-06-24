// Constants related to job pagination
export const JOB_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export const JOB_TABLE_HEADER_BORDER_COLOR = '#1f4996';

export type JobRowsPerPage = (typeof JOB_ROWS_PER_PAGE_OPTIONS)[number];

export const isJobRowsPerPage = (value: number): value is JobRowsPerPage =>
  JOB_ROWS_PER_PAGE_OPTIONS.includes(value as JobRowsPerPage);
