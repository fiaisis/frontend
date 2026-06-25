import Settings from '@mui/icons-material/Settings';
import { Button, Drawer, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React from 'react';

import ConfigSettingsENGINX from './ConfigSettingsENGINX';
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import ConfigSettingsIRIS from './ConfigSettingsIRIS';
import ConfigSettingsLOQ from './ConfigSettingsLOQ';
import ConfigSettingsOSIRIS from './ConfigSettingsOSIRIS';
import ConfigSettingsSANS2D from './ConfigSettingsSANS2D';
import ConfigSettingsVESUVIO from './ConfigSettingsVESUVIO';

const CONFIG_DRAWER_WIDTH = 600;
const CONFIG_DRAWER_EDGE_OFFSET = 32;
const CONFIG_DRAWER_MAX_WIDTH = `calc(100vw - ${CONFIG_DRAWER_EDGE_OFFSET}px)`;

const InstrumentConfigDrawer: React.FC<{
  selectedInstrument: string;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  disabled?: boolean;
}> = ({ selectedInstrument, drawerOpen, setDrawerOpen, disabled = false }) => {
  const theme = useTheme();
  const buttonDisabled = disabled && !drawerOpen;

  return (
    <>
      <Button
        type="button"
        variant="contained"
        color="primary"
        aria-label={drawerOpen ? 'Close instrument config' : 'Open instrument config'}
        aria-controls="instrument-config-drawer"
        aria-expanded={drawerOpen}
        disabled={buttonDisabled}
        onClick={() => setDrawerOpen(!drawerOpen)}
        startIcon={<Settings fontSize="small" />}
        sx={{
          minWidth: 0,
          height: 40,
          boxSizing: 'border-box',
          mt: 2,
          px: 2,
          borderRadius: 1,
          flexShrink: 0,
          boxShadow: theme.shadows[4],
          textTransform: 'none',
          whiteSpace: 'nowrap',
          transition: theme.transitions.create(['box-shadow', 'background-color'], {
            duration: theme.transitions.duration.enteringScreen,
            easing: theme.transitions.easing.easeOut,
          }),
          '&:hover': {
            boxShadow: theme.shadows[6],
          },
          '&.Mui-disabled': {
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[300],
            boxShadow: `${theme.shadows[1]}, 0 0 0 1px ${alpha(theme.palette.text.primary, 0.12)}`,
            opacity: 1,
          },
        }}
      >
        Edit config
      </Button>
      <Drawer
        anchor={'right'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ id: 'instrument-config-drawer' }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: CONFIG_DRAWER_MAX_WIDTH, sm: `${CONFIG_DRAWER_WIDTH}px` },
            maxWidth: CONFIG_DRAWER_MAX_WIDTH,
            boxSizing: 'border-box',
            padding: '16px',
            backgroundColor: theme.palette.background.default,
          },
        }}
      >
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
