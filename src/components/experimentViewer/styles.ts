import { alpha, type Theme } from '@mui/material/styles';
import { type SystemStyleObject } from '@mui/system';

import resetZoomButtonStyles from '../../h5web/packages/lib/src/toolbar/floating/ResetZoomButton.module.css';
import toolbarStyles from '../../h5web/packages/lib/src/toolbar/Toolbar.module.css';
import toolbarControlStyles from '../../h5web/packages/lib/src/toolbar/utils.module.css';
import tooltipStyles from '../../h5web/packages/lib/src/vis/shared/Tooltip.module.css';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

// Composed CSS modules export multiple class names; selectors need the local class.
const toolbarButtonSelector = `.${toolbarControlStyles.btn.split(' ')[0]}`;
const resetZoomButtonSelector = `.${resetZoomButtonStyles.btn.split(' ')[0]}`;
const resetZoomLabelSelector = `.${resetZoomButtonStyles.btnLike.split(' ')[0]}`;

export const getViewerControlsSx = (theme: Theme): SystemStyleObject<Theme> => {
  const chrome = getJobTableChromeColors(theme.palette.mode);

  return {
    color: chrome.text,
    '& .MuiOutlinedInput-root': {
      borderRadius: 0,
      backgroundColor: chrome.surface,
      color: chrome.text,
      '& .MuiOutlinedInput-notchedOutline': { borderColor: chrome.border },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: chrome.accent },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: chrome.accent },
    },
    '& .MuiInputLabel-root': { color: alpha(chrome.text, 0.75) },
    '& .MuiInputLabel-root.Mui-focused': { color: chrome.accent },
    '& .MuiFormHelperText-root': { color: alpha(chrome.text, 0.75) },
    '& .MuiSelect-icon': { color: chrome.text },
    '& .MuiCheckbox-root, & .MuiRadio-root': {
      color: alpha(chrome.text, 0.75),
      '&.Mui-checked': { color: chrome.accent },
      '&:hover': { backgroundColor: chrome.hover },
    },
    '& .MuiChip-root': {
      borderRadius: 0,
      border: `1px solid ${chrome.border}`,
      backgroundColor: chrome.header,
      color: chrome.text,
      '& .MuiChip-deleteIcon': { color: alpha(chrome.text, 0.75) },
    },
    '& .MuiButton-root': {
      height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
      borderRadius: 0,
      borderColor: chrome.border,
      boxShadow: 'none',
      color: chrome.accent,
      textTransform: 'none',
      '&:hover': { backgroundColor: chrome.hover, borderColor: chrome.accent, boxShadow: 'none' },
      '&:focus-visible': { outline: `2px solid ${chrome.accent}`, outlineOffset: -2 },
      '&.Mui-disabled': { color: alpha(chrome.text, 0.42) },
    },
    '& .MuiMenuItem-root': {
      '&:hover, &.Mui-focusVisible': { backgroundColor: chrome.hover },
      '&.Mui-selected': { color: chrome.accent, backgroundColor: alpha(chrome.accent, 0.12) },
      '&.Mui-selected:hover': { backgroundColor: alpha(chrome.accent, 0.18) },
    },
  };
};

// Both the standalone 1D toolbar and the embedded MD viewer use H5Web controls.
export const getViewerPlotSx = (theme: Theme): SystemStyleObject<Theme> => {
  const chrome = getJobTableChromeColors(theme.palette.mode);

  return {
    color: chrome.text,
    backgroundColor: chrome.surface,
    '--h5w-toolbar--height': `${JOB_TABLE_TOOLBAR_CONTROL_HEIGHT}px`,
    '--h5w-toolbar--bgColor': chrome.header,
    '--h5w-toolbar-label--color': chrome.text,
    '--h5w-toolbar-separator--color': chrome.border,
    '--h5w-toolbar-popup--bgColor': chrome.surface,
    '--h5w-toolbar-input-focus--shadowColor': chrome.accent,
    '--h5w-btn-hover--bgColor': chrome.hover,
    '--h5w-btn-hover--shadowColor': 'transparent',
    '--h5w-btnRaised--bgColor': chrome.surface,
    '--h5w-btnRaised--shadowColor': 'transparent',
    '--h5w-btnRaised-hover--shadowColor': 'transparent',
    '--h5w-btnPressed--bgColor': alpha(chrome.accent, 0.12),
    '--h5w-btnPressed--shadowColor': 'transparent',
    '--h5w-btnPressed-hover--shadowColor': 'transparent',
    '--h5w-selector-arrowIcon--color': chrome.text,
    '--h5w-selector-label--color': chrome.text,
    '--h5w-selector-groupLabel--color': chrome.text,
    '--h5w-selector-menu--bgColor': chrome.surface,
    '--h5w-selector-option-hover--bgColor': chrome.hover,
    '--h5w-selector-option-selected--bgColor': alpha(chrome.accent, 0.12),
    '--h5w-selector-option-focus--outlineColor': chrome.accent,
    '--h5w-domainWidget-popup--bgColor': chrome.surface,
    '--h5w-domainControls--colorAlt': chrome.text,
    '--h5w-domainControls-boundInput--shadowColor': chrome.border,
    '--h5w-domainControls-boundInput-focus--shadowColor': chrome.accent,
    '--h5w-domainControls-boundInput-editing--bgColor': chrome.header,
    '--h5w-domainControls-boundInput-editing--borderColor': chrome.accent,
    '--h5w-domainSlider-track--bgColor': chrome.border,
    '--h5w-domainSlider-track--shadowColor': 'transparent',
    '--h5w-domainSlider-dataTrack--bgColor': chrome.accent,
    '--h5w-domainSlider-dataTrack--shadowColor': 'transparent',
    '--h5w-domainSlider-thumb--bgColor': chrome.accent,
    '--h5w-domainSlider-thumb-auto--bgColor': chrome.surface,
    '--h5w-ticks--color': alpha(chrome.text, 0.65),
    '--h5w-tickLabels--color': chrome.text,
    '--h5w-axisLabels--color': chrome.text,
    '--h5w-colorBar-bounds--color': chrome.text,
    '--h5w-grid--color': chrome.text,
    '--h5w-tooltip-guide--color': chrome.accent,
    '--h5w-tooltip--bgColor': chrome.surface,
    '--h5w-tooltip--color': chrome.text,
    '--h5w-error--color': theme.palette.error.main,
    ...(theme.palette.mode === 'dark' && {
      '--h5w-line--color': chrome.accent,
      '--h5w-line--colorAux': 'orange, lightgreen, red, violet, gold',
    }),
    [`& .${toolbarStyles.toolbar}`]: { borderBottom: `1px solid ${chrome.border}`, boxSizing: 'border-box' },
    [`& .${toolbarControlStyles.btnLike}`]: { borderRadius: 0 },
    [`& ${toolbarButtonSelector}[data-raised] > .${toolbarControlStyles.btnLike}`]: {
      border: `1px solid ${chrome.border}`,
    },
    [`& ${toolbarButtonSelector}[aria-pressed='true'] > .${toolbarControlStyles.btnLike}, & ${toolbarButtonSelector}[aria-checked='true'] > .${toolbarControlStyles.btnLike}, & ${toolbarButtonSelector}[aria-expanded='true'] > .${toolbarControlStyles.btnLike}`]:
      {
        color: chrome.accent,
        boxShadow: `inset 0 -2px 0 ${chrome.accent}`,
      },
    [`& .${toolbarControlStyles.popup}, & .${toolbarControlStyles.menu}, & [role='dialog'] > div`]: {
      border: `1px solid ${chrome.border}`,
      borderRadius: 0,
      boxShadow: 'none',
    },
    '& button': { borderRadius: 0 },
    '& button:focus-visible': { outline: `2px solid ${chrome.accent}`, outlineOffset: -2 },
    '& input': { borderRadius: 0, color: chrome.text, backgroundColor: chrome.surface, accentColor: chrome.accent },
    '& button:disabled': { color: alpha(chrome.text, 0.42) },
    [`& .${tooltipStyles.tooltip}`]: { borderRadius: 0, border: `1px solid ${chrome.border}`, boxShadow: 'none' },
    [`& ${resetZoomLabelSelector}`]: {
      color: chrome.accent,
      backgroundColor: chrome.surface,
      border: `1px solid ${chrome.border}`,
      boxShadow: 'none',
    },
    [`& ${resetZoomButtonSelector}:hover > ${resetZoomLabelSelector}`]: {
      backgroundColor: chrome.hover,
      borderColor: chrome.accent,
    },
  };
};
