import { Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

import { getJobTableChromeColors } from '../jobs/constants';

const SnackbarAlert = styled(Alert)(({ theme, severity = 'success' }) => {
  const chrome = getJobTableChromeColors(theme.palette.mode);
  const statusColor = theme.palette[severity][theme.palette.mode === 'dark' ? 'light' : 'dark'];

  return {
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: 600,
    minWidth: 0,
    padding: '12px 14px',
    alignItems: 'flex-start',
    border: `1px solid ${chrome.border}`,
    borderLeft: `3px solid ${statusColor}`,
    borderRadius: 0,
    boxShadow: 'none',
    backgroundColor: chrome.surface,
    backgroundImage: 'none',
    color: chrome.text,
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
    '& .MuiAlert-icon': {
      padding: 0,
      marginTop: 2,
      marginRight: 10,
      fontSize: 20,
      opacity: 1,
      color: statusColor,
    },
    '& .MuiAlert-message': {
      minWidth: 0,
      padding: '2px 0',
      overflowWrap: 'anywhere',
    },
    '& .MuiAlert-action': {
      padding: 0,
      marginLeft: 12,
      marginRight: 0,
      alignItems: 'flex-start',
    },
    '& .MuiIconButton-root': {
      width: 28,
      height: 28,
      padding: 4,
      borderRadius: 0,
      color: chrome.text,
      '&:hover': { backgroundColor: chrome.hover },
      '&:focus-visible': { outline: `2px solid ${chrome.accent}`, outlineOffset: 2 },
      '& .MuiSvgIcon-root': { fontSize: 18 },
    },
    '& .MuiLink-root': {
      color: chrome.accent,
      fontWeight: 600,
      textDecorationColor: 'currentColor',
      textUnderlineOffset: '3px',
      '&:hover': { textDecorationThickness: '2px' },
      '&:focus-visible': { outline: `2px solid ${chrome.accent}`, outlineOffset: 2 },
    },
  };
});

export default SnackbarAlert;
