import ConfigSettingsLOQ from './ConfigSettingsLOQ';
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import { Drawer, useTheme } from '@mui/material';
import React from 'react';
import ConfigSettingsSANS2D from './ConfigSettingsSANS2D';
import ConfigSettingsVESUVIO from './ConfigSettingsVESUVIO';

const InstrumentConfigDrawer: React.FC<{
  selectedInstrument: string;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}> = ({ selectedInstrument, drawerOpen, setDrawerOpen }) => {
  const theme = useTheme();
  return (
    <Drawer
      anchor={'right'}
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: '600px',
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
      ) : (
        <ConfigSettingsGeneral />
      )}
    </Drawer>
  );
};

export default InstrumentConfigDrawer;
