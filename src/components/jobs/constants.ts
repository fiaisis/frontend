// Constants related to job pagination
export const JOB_ROWS_PER_PAGE_OPTIONS = [25, 50, 100] as const;

export const JOB_TABLE_MIN_WIDTH = 1040;
export const JOB_TABLE_CHROME_CONTROL_HEIGHT = 32;
export const JOB_TABLE_CHROME_ROW_MIN_HEIGHT = 40;
export const JOB_TABLE_HEADER_HEIGHT = 42;
export const JOB_TABLE_ROW_HEIGHT = 44;
export const JOB_TABLE_SCROLLBAR_WIDTH = 12;

interface JobTableChromeColors {
  surface: string;
  header: string;
  border: string;
  text: string;
  accent: string;
  accentContrast: string;
  hover: string;
}

export const getJobTableChromeColors = (mode: 'light' | 'dark'): JobTableChromeColors =>
  mode === 'dark'
    ? {
        surface: '#1f252b',
        header: '#29313a',
        border: '#46515c',
        text: '#f5f7fa',
        accent: '#90caf9',
        accentContrast: '#102a43',
        hover: '#34404c',
      }
    : {
        surface: '#ffffff',
        header: '#f4f6f8',
        border: '#c7ced6',
        text: '#263238',
        accent: '#1565c0',
        accentContrast: '#ffffff',
        hover: '#eef1f4',
      };

export type JobRowsPerPage = (typeof JOB_ROWS_PER_PAGE_OPTIONS)[number];

export const isJobRowsPerPage = (value: number): value is JobRowsPerPage =>
  JOB_ROWS_PER_PAGE_OPTIONS.includes(value as JobRowsPerPage);
