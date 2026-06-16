import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { Box, Button, Divider, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import React from 'react';

import { instruments } from '../../lib/instrumentData';

const getInstrumentSelectorLabel = (instrument: string): string =>
  instrument === 'ALL' ? 'View all reductions' : instrument;

const instrumentsByType = Array.from(new Set(instruments.map((instrument) => instrument.type)))
  .sort((typeA, typeB) => typeA.localeCompare(typeB))
  .map((type) => ({
    type,
    instruments: instruments
      .filter((instrument) => instrument.type === type)
      .sort((instrumentA, instrumentB) => instrumentA.name.localeCompare(instrumentB.name)),
  }));

const InstrumentSelector: React.FC<{
  selectedInstrument: string;
  handleInstrumentChange: (instrument: string) => void;
}> = ({ selectedInstrument, handleInstrumentChange }) => {
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [instrumentMenuAnchorEl, setInstrumentMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [activeInstrumentType, setActiveInstrumentType] = React.useState<string | null>(null);

  const typeMenuOpen = Boolean(typeMenuAnchorEl);
  const instrumentMenuOpen = Boolean(instrumentMenuAnchorEl);
  const activeInstrumentGroup = instrumentsByType.find(
    (instrumentGroup) => instrumentGroup.type === activeInstrumentType
  );

  const closeMenus = (): void => {
    setTypeMenuAnchorEl(null);
    setInstrumentMenuAnchorEl(null);
    setActiveInstrumentType(null);
  };

  const selectInstrument = (instrument: string): void => {
    handleInstrumentChange(instrument);
    closeMenus();
  };

  const openInstrumentMenu = (event: React.MouseEvent<HTMLElement>, instrumentType: string): void => {
    setInstrumentMenuAnchorEl(event.currentTarget);
    setActiveInstrumentType(instrumentType);
  };

  return (
    <>
      <Button
        id="instrument-selector-button"
        variant="outlined"
        aria-haspopup="menu"
        aria-controls={typeMenuOpen ? 'instrument-type-menu' : undefined}
        aria-expanded={typeMenuOpen ? 'true' : undefined}
        endIcon={<ArrowDropDown />}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => setTypeMenuAnchorEl(event.currentTarget)}
        sx={{
          width: 240,
          height: 56,
          justifyContent: 'space-between',
          px: 1.75,
          textAlign: 'left',
          textTransform: 'none',
          color: 'text.primary',
          '& .MuiButton-endIcon': { ml: 'auto' },
        }}
      >
        <Box component="span" sx={{ display: 'flex', minWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
            Instrument
          </Typography>
          <Typography
            component="span"
            variant="body1"
            color="text.primary"
            sx={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {getInstrumentSelectorLabel(selectedInstrument)}
          </Typography>
        </Box>
      </Button>
      <Menu
        id="instrument-type-menu"
        anchorEl={typeMenuAnchorEl}
        open={typeMenuOpen}
        onClose={closeMenus}
        MenuListProps={{
          'aria-labelledby': 'instrument-selector-button',
          sx: { minWidth: 240 },
        }}
      >
        <MenuItem selected={selectedInstrument === 'ALL'} onClick={() => selectInstrument('ALL')}>
          View all reductions
        </MenuItem>
        <Divider component="li" />
        {instrumentsByType.map((instrumentGroup, index) => (
          <React.Fragment key={instrumentGroup.type}>
            <MenuItem
              selected={instrumentGroup.instruments.some((instrument) => instrument.name === selectedInstrument)}
              aria-haspopup="menu"
              aria-expanded={activeInstrumentType === instrumentGroup.type && instrumentMenuOpen ? 'true' : undefined}
              onClick={(event: React.MouseEvent<HTMLElement>) => openInstrumentMenu(event, instrumentGroup.type)}
            >
              <ListItemText primary={instrumentGroup.type} />
              <ChevronRight fontSize="small" sx={{ ml: 2, color: 'action.active' }} />
            </MenuItem>
            {index < instrumentsByType.length - 1 ? <Divider component="li" /> : null}
          </React.Fragment>
        ))}
      </Menu>
      <Menu
        id="instrument-options-menu"
        anchorEl={instrumentMenuAnchorEl}
        open={instrumentMenuOpen}
        onClose={() => {
          setInstrumentMenuAnchorEl(null);
          setActiveInstrumentType(null);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        MenuListProps={{
          'aria-label': activeInstrumentType ? `${activeInstrumentType} instruments` : 'Instrument options',
          sx: { minWidth: 160 },
        }}
      >
        {activeInstrumentGroup?.instruments.map((instrument, index) => (
          <React.Fragment key={instrument.name}>
            <MenuItem
              selected={instrument.name === selectedInstrument}
              onClick={() => selectInstrument(instrument.name)}
            >
              {instrument.name}
            </MenuItem>
            {index < activeInstrumentGroup.instruments.length - 1 ? <Divider component="li" /> : null}
          </React.Fragment>
        ))}
      </Menu>
    </>
  );
};

export default InstrumentSelector;
