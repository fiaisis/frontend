import Close from '@mui/icons-material/Close';
import Settings from '@mui/icons-material/Settings';
import { Box, Button, Drawer, IconButton, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import ConfigSettingsENGINX from './ConfigSettingsENGINX';
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import ConfigSettingsIRIS from './ConfigSettingsIRIS';
import ConfigSettingsLOQ from './ConfigSettingsLOQ';
import ConfigSettingsOSIRIS from './ConfigSettingsOSIRIS';
import ConfigSettingsSANS2D from './ConfigSettingsSANS2D';
import ConfigSettingsVESUVIO from './ConfigSettingsVESUVIO';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

const CONFIG_DRAWER_WIDTH = 600;
const CONFIG_DRAWER_EDGE_OFFSET = 32;
const CONFIG_DRAWER_MAX_WIDTH = `calc(100vw - ${CONFIG_DRAWER_EDGE_OFFSET}px)`;

const InstrumentConfigDrawer: React.FC<{
  selectedInstrument: string;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  disabled?: boolean;
  buttonPlacement?: 'page' | 'toolbar';
}> = ({ selectedInstrument, drawerOpen, setDrawerOpen, disabled = false, buttonPlacement = 'page' }) => {
  const theme = useTheme();
  const configChrome = getJobTableChromeColors(theme.palette.mode);
  const buttonDisabled = disabled && !drawerOpen;
  const isToolbarButton = buttonPlacement === 'toolbar';

  return (
    <>
      <Button
        type="button"
        variant={isToolbarButton ? 'text' : 'outlined'}
        aria-label={drawerOpen ? 'Close instrument config' : 'Open instrument config'}
        aria-controls="instrument-config-drawer"
        aria-expanded={drawerOpen}
        disabled={buttonDisabled}
        onClick={() => setDrawerOpen(!drawerOpen)}
        startIcon={<Settings fontSize="small" />}
        sx={{
          minWidth: 0,
          height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
          boxSizing: 'border-box',
          mt: isToolbarButton ? 0 : 2,
          px: isToolbarButton ? 1.5 : 2,
          borderRadius: 0,
          flexShrink: 0,
          borderColor: configChrome.border,
          color: isToolbarButton ? configChrome.text : configChrome.accent,
          boxShadow: 'none',
          textTransform: 'none',
          whiteSpace: 'nowrap',
          '&:hover': {
            borderColor: configChrome.accent,
            backgroundColor: configChrome.hover,
            boxShadow: 'none',
          },
          '&:focus-visible': { outline: `2px solid ${configChrome.accent}`, outlineOffset: -2 },
          '&.Mui-disabled': {
            color: alpha(configChrome.text, 0.42),
            borderColor: configChrome.border,
            boxShadow: 'none',
          },
        }}
      >
        Edit config
      </Button>
      <Drawer
        anchor={'right'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          id: 'instrument-config-drawer',
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': 'instrument-config-title',
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: CONFIG_DRAWER_MAX_WIDTH, sm: `${CONFIG_DRAWER_WIDTH}px` },
            maxWidth: CONFIG_DRAWER_MAX_WIDTH,
            boxSizing: 'border-box',
            borderRadius: 0,
            borderLeft: `1px solid ${configChrome.border}`,
            backgroundColor: configChrome.surface,
            backgroundImage: 'none',
            color: configChrome.text,
            overflow: 'hidden',
            '& .MuiButton-root': {
              minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
              borderRadius: 0,
              boxShadow: 'none',
              textTransform: 'none',
              '&:hover': { boxShadow: 'none' },
              '&:focus-visible': { outline: `2px solid ${configChrome.accent}`, outlineOffset: -2 },
              '&.Mui-disabled': { color: alpha(configChrome.text, 0.42), borderColor: configChrome.border },
            },
            '& .MuiIconButton-root': {
              borderRadius: 0,
              color: configChrome.accent,
              '&:hover': { backgroundColor: configChrome.hover },
              '&:focus-visible': { outline: `2px solid ${configChrome.accent}`, outlineOffset: -2 },
            },
            '& .MuiOutlinedInput-root': {
              minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
              borderRadius: 0,
              fontSize: '0.875rem',
              backgroundColor: configChrome.surface,
              color: configChrome.text,
              '&:not(.Mui-error) fieldset': { borderColor: configChrome.border },
              '&:not(.Mui-error):hover fieldset, &.Mui-focused:not(.Mui-error) fieldset': {
                borderColor: configChrome.accent,
              },
            },
            '& .MuiInputLabel-root:not(.Mui-error)': {
              color: alpha(configChrome.text, 0.75),
              '&.Mui-focused': { color: configChrome.accent },
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
            backgroundColor: configChrome.header,
            borderBottom: `1px solid ${configChrome.border}`,
          }}
        >
          <Typography
            id="instrument-config-title"
            component="h2"
            variant="subtitle1"
            sx={{ flex: 1, minWidth: 0, px: 2, py: 1, fontWeight: 700 }}
          >
            {selectedInstrument} config settings
          </Typography>
          <IconButton
            aria-label="Close instrument config"
            onClick={() => setDrawerOpen(false)}
            sx={{
              alignSelf: 'stretch',
              width: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
              borderLeft: `1px solid ${configChrome.border}`,
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
        {selectedInstrument === 'LOQ' ? (
          <ConfigSettingsLOQ />
        ) : selectedInstrument === 'SANS2D' ? (
          <ConfigSettingsSANS2D />
        ) : selectedInstrument === 'VESUVIO' ? (
          <ConfigSettingsVESUVIO />
        ) : selectedInstrument === 'OSIRIS' ? (
          <ConfigSettingsOSIRIS />
        ) : selectedInstrument === 'IRIS' ? (
          <ConfigSettingsIRIS />
        ) : selectedInstrument === 'ENGINX' ? (
          <ConfigSettingsENGINX />
        ) : (
          <ConfigSettingsGeneral />
        )}
      </Drawer>
    </>
  );
};

export default InstrumentConfigDrawer;
