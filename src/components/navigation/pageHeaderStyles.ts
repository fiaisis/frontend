import { alpha, type Theme } from '@mui/material/styles';

import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

import type { SystemStyleObject } from '@mui/system';

export const getPageHeaderControlSx = (theme: Theme): SystemStyleObject<Theme> => {
  const chrome = getJobTableChromeColors(theme.palette.mode);

  return {
    display: 'inline-flex',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
    boxSizing: 'border-box',
    px: 1.5,
    py: 0.5,
    gap: 0.75,
    border: 0,
    borderRadius: 0,
    boxShadow: 'none',
    backgroundColor: chrome.surface,
    color: chrome.accent,
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.25,
    textAlign: 'left',
    textTransform: 'none',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    '&:hover': { backgroundColor: chrome.hover, color: chrome.accent, textDecoration: 'none', boxShadow: 'none' },
    '&:active': { backgroundColor: chrome.header },
    '&:focus-visible': { outline: `2px solid ${chrome.accent}`, outlineOffset: -2 },
    '&.Mui-disabled': { color: alpha(chrome.text, 0.42) },
    '& .MuiButton-endIcon': { ml: 0, mr: 0, color: 'inherit' },
  };
};
