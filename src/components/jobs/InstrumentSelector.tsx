import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import { getJobTableChromeColors } from './constants';
import InstrumentMenu from './InstrumentMenu';
import { instruments as allInstruments, type InstrumentData } from '../../lib/instrumentData';
import { type InstrumentSupport } from '../../lib/instrumentSupport';
import { getPageHeaderControlSx } from '../navigation/pageHeaderStyles';

const ALL_INSTRUMENTS_VALUE = 'ALL';

const getInstrumentSelectorLabel = (
  instrument: string,
  allInstrumentsValue: string,
  allInstrumentsLabel: string
): string => (instrument === allInstrumentsValue ? allInstrumentsLabel : instrument);

const InstrumentSelector: React.FC<{
  selectedInstrument: string;
  handleInstrumentChange: (instrument: string) => void;
  variant?: 'default' | 'compact';
  instrumentOptions?: InstrumentData[];
  allInstrumentsValue?: string;
  allInstrumentsLabel?: string;
  compactAllInstrumentsLabel?: string;
  compactLabel?: string;
  showAllInstrumentsOption?: boolean;
  disabled?: boolean;
  support?: InstrumentSupport;
}> = ({
  selectedInstrument,
  handleInstrumentChange,
  variant = 'default',
  instrumentOptions = allInstruments,
  allInstrumentsValue = ALL_INSTRUMENTS_VALUE,
  allInstrumentsLabel = 'View all reductions',
  compactAllInstrumentsLabel = 'Select an instrument',
  compactLabel,
  showAllInstrumentsOption = true,
  disabled = false,
  support,
}) => {
  const theme = useTheme();
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const isCompactVariant = variant === 'compact';
  const selectorLabel = getInstrumentSelectorLabel(selectedInstrument, allInstrumentsValue, allInstrumentsLabel);
  const buttonLabel =
    isCompactVariant && compactLabel
      ? compactLabel
      : isCompactVariant && selectedInstrument === allInstrumentsValue
        ? compactAllInstrumentsLabel
        : selectorLabel;
  const showAllInstrumentsListOption =
    showAllInstrumentsOption && !isCompactVariant && selectedInstrument === allInstrumentsValue;

  const typeMenuOpen = Boolean(typeMenuAnchorEl);
  const closeMenus = (): void => {
    setTypeMenuAnchorEl(null);
  };

  const selectInstrument = (instrument: string): void => {
    handleInstrumentChange(instrument);
    closeMenus();
  };

  return (
    <>
      <Button
        id="instrument-selector-button"
        variant={isCompactVariant ? 'text' : 'outlined'}
        aria-haspopup="menu"
        aria-controls={typeMenuOpen ? 'instrument-type-menu' : undefined}
        aria-expanded={typeMenuOpen ? 'true' : undefined}
        aria-label={isCompactVariant ? `Instrument: ${buttonLabel}` : undefined}
        disabled={disabled}
        endIcon={<ArrowDropDown />}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => setTypeMenuAnchorEl(event.currentTarget)}
        sx={
          isCompactVariant
            ? getPageHeaderControlSx
            : {
                ...getPageHeaderControlSx(theme),
                border: `1px solid ${getJobTableChromeColors(theme.palette.mode).border}`,
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
        {isCompactVariant ? (
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
      <InstrumentMenu
        id="instrument-type-menu"
        labelledBy="instrument-selector-button"
        anchorEl={typeMenuAnchorEl}
        onClose={closeMenus}
        selectedInstruments={[selectedInstrument]}
        onSelectInstrument={selectInstrument}
        instrumentOptions={instrumentOptions}
        allInstrumentsOption={
          showAllInstrumentsListOption ? { value: allInstrumentsValue, label: allInstrumentsLabel } : undefined
        }
        support={support}
      />
    </>
  );
};

export default InstrumentSelector;
