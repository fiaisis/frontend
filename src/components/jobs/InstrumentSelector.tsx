import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { Box, Button, Divider, ListItemText, Menu, MenuItem, MenuList, Paper, Popper, Typography } from '@mui/material';
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
  variant?: 'default' | 'breadcrumb';
}> = ({ selectedInstrument, handleInstrumentChange, variant = 'default' }) => {
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [instrumentMenuAnchorEl, setInstrumentMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [activeInstrumentType, setActiveInstrumentType] = React.useState<string | null>(null);
  const isBreadcrumbVariant = variant === 'breadcrumb';
  const selectorLabel = getInstrumentSelectorLabel(selectedInstrument);
  const buttonLabel = isBreadcrumbVariant && selectedInstrument === 'ALL' ? 'Select an instrument' : selectorLabel;

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

  const openInstrumentMenu = (anchorElement: HTMLElement, instrumentType: string): void => {
    setInstrumentMenuAnchorEl(anchorElement);
    setActiveInstrumentType(instrumentType);
  };

  const closeInstrumentMenu = (): void => {
    setInstrumentMenuAnchorEl(null);
    setActiveInstrumentType(null);
  };

  return (
    <>
      <Button
        id="instrument-selector-button"
        className={isBreadcrumbVariant ? 'breadcrumb-control' : undefined}
        variant={isBreadcrumbVariant ? 'text' : 'outlined'}
        aria-haspopup="menu"
        aria-controls={typeMenuOpen ? 'instrument-type-menu' : undefined}
        aria-expanded={typeMenuOpen ? 'true' : undefined}
        aria-label={isBreadcrumbVariant ? `Instrument: ${buttonLabel}` : undefined}
        endIcon={<ArrowDropDown />}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => setTypeMenuAnchorEl(event.currentTarget)}
        sx={
          isBreadcrumbVariant
            ? {
                minWidth: 0,
                border: 0,
                borderRadius: 0,
                boxShadow: 'none',
                font: 'inherit',
                textTransform: 'none',
                '& .MuiButton-endIcon': { ml: 0.75, mr: 0, color: 'inherit' },
              }
            : {
                width: 240,
                height: 56,
                justifyContent: 'space-between',
                px: 1.75,
                textAlign: 'left',
                textTransform: 'none',
                color: 'text.primary',
                '& .MuiButton-endIcon': { ml: 'auto' },
              }
        }
      >
        {isBreadcrumbVariant ? (
          <Box component="span">{buttonLabel}</Box>
        ) : (
          <Box
            component="span"
            sx={{ display: 'flex', minWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <Typography component="span" variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              Instrument
            </Typography>
            <Typography
              component="span"
              variant="body1"
              color="text.primary"
              sx={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {selectorLabel}
            </Typography>
          </Box>
        )}
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
        <MenuItem
          selected={selectedInstrument === 'ALL'}
          onMouseEnter={closeInstrumentMenu}
          onFocus={closeInstrumentMenu}
          onClick={() => selectInstrument('ALL')}
        >
          View all reductions
        </MenuItem>
        <Divider component="li" />
        {instrumentsByType.map((instrumentGroup, index) => (
          <React.Fragment key={instrumentGroup.type}>
            <MenuItem
              selected={instrumentGroup.instruments.some((instrument) => instrument.name === selectedInstrument)}
              aria-haspopup="menu"
              aria-expanded={activeInstrumentType === instrumentGroup.type && instrumentMenuOpen ? 'true' : undefined}
              onMouseEnter={(event: React.MouseEvent<HTMLElement>) =>
                openInstrumentMenu(event.currentTarget, instrumentGroup.type)
              }
              onFocus={(event: React.FocusEvent<HTMLElement>) =>
                openInstrumentMenu(event.currentTarget, instrumentGroup.type)
              }
              onClick={(event: React.MouseEvent<HTMLElement>) =>
                openInstrumentMenu(event.currentTarget, instrumentGroup.type)
              }
            >
              <ListItemText primary={instrumentGroup.type} />
              <ChevronRight fontSize="small" sx={{ ml: 2, color: 'action.active' }} />
            </MenuItem>
            {index < instrumentsByType.length - 1 ? <Divider component="li" /> : null}
          </React.Fragment>
        ))}
      </Menu>
      <Popper
        id="instrument-options-menu"
        anchorEl={instrumentMenuAnchorEl}
        open={instrumentMenuOpen}
        placement="right-start"
        sx={(theme) => ({ zIndex: theme.zIndex.modal + 1 })}
      >
        <Paper elevation={8}>
          <MenuList
            aria-label={activeInstrumentType ? `${activeInstrumentType} instruments` : 'Instrument options'}
            sx={{ minWidth: 160 }}
            onKeyDown={(event: React.KeyboardEvent<HTMLUListElement>) => {
              if (event.key === 'Escape') {
                closeInstrumentMenu();
              }
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
          </MenuList>
        </Paper>
      </Popper>
    </>
  );
};

export default InstrumentSelector;
