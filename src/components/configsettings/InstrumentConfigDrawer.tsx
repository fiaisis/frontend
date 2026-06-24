import Settings from '@mui/icons-material/Settings';
import { Box, Button, Drawer, useTheme } from '@mui/material';
import React from 'react';

import ConfigSettingsENGINX from './ConfigSettingsENGINX';
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import ConfigSettingsIRIS from './ConfigSettingsIRIS';
import ConfigSettingsLOQ from './ConfigSettingsLOQ';
import ConfigSettingsOSIRIS from './ConfigSettingsOSIRIS';
import ConfigSettingsSANS2D from './ConfigSettingsSANS2D';
import ConfigSettingsVESUVIO from './ConfigSettingsVESUVIO';

const CONFIG_DRAWER_WIDTH = 600;
const CONFIG_TAB_WIDTH = 48;
const CONFIG_TAB_HEIGHT = 96;
const CONFIG_TAB_TOP = 84;
const CONFIG_DRAWER_MOBILE_WIDTH = `calc(100vw - ${CONFIG_TAB_WIDTH}px)`;

const InstrumentConfigDrawer: React.FC<{
  selectedInstrument: string;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  disabled?: boolean;
}> = ({ selectedInstrument, drawerOpen, setDrawerOpen, disabled = false }) => {
  const theme = useTheme();
  const tabDisabled = disabled && !drawerOpen;

  return (
    <>
      <Button
        type="button"
        variant="contained"
        color="primary"
        aria-label={drawerOpen ? 'Close instrument config' : 'Open instrument config'}
        aria-controls="instrument-config-drawer"
        aria-expanded={drawerOpen}
        disabled={tabDisabled}
        onClick={() => setDrawerOpen(!drawerOpen)}
        sx={{
          position: 'fixed',
          top: CONFIG_TAB_TOP,
          right: drawerOpen ? { xs: CONFIG_DRAWER_MOBILE_WIDTH, sm: `${CONFIG_DRAWER_WIDTH}px` } : 0,
          zIndex: theme.zIndex.drawer + 1,
          width: CONFIG_TAB_WIDTH,
          minWidth: CONFIG_TAB_WIDTH,
          height: CONFIG_TAB_HEIGHT,
          p: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          boxShadow: theme.shadows[6],
          textTransform: 'none',
          transition: theme.transitions.create('right', {
            duration: theme.transitions.duration.enteringScreen,
            easing: theme.transitions.easing.easeOut,
          }),
          '&.Mui-disabled': {
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[300],
            opacity: 1,
          },
        }}
      >
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            lineHeight: 1,
            transform: 'rotate(-90deg)',
            whiteSpace: 'nowrap',
          }}
        >
          <Settings fontSize="small" />
          Config
        </Box>
      </Button>
      <Drawer
        anchor={'right'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ id: 'instrument-config-drawer' }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: CONFIG_DRAWER_MOBILE_WIDTH, sm: `${CONFIG_DRAWER_WIDTH}px` },
            maxWidth: `calc(100vw - ${CONFIG_TAB_WIDTH}px)`,
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
