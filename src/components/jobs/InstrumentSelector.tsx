import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';

import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from './constants';
import {
  formatInstrumentTechniques,
  getInstrumentTechniques,
  instruments as allInstruments,
  type InstrumentData,
} from '../../lib/instrumentData';
import { getStoredFavoriteInstrumentIds, setStoredFavoriteInstrumentIds } from '../../lib/instrumentFavorites';
import {
  getStoredHideUnsupported,
  setStoredHideUnsupported,
  type InstrumentSupport,
} from '../../lib/instrumentSupport';
import { getPageHeaderControlSx } from '../navigation/pageHeaderStyles';

const ALL_INSTRUMENTS_VALUE = 'ALL';

const getInstrumentSelectorLabel = (
  instrument: string,
  allInstrumentsValue: string,
  allInstrumentsLabel: string
): string => (instrument === allInstrumentsValue ? allInstrumentsLabel : instrument);

const SELECTOR_MENU_WIDTH = 540;

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
  const chrome = getJobTableChromeColors(theme.palette.mode);
  const [hideUnsupported, setHideUnsupported] = React.useState(() => getStoredHideUnsupported(support?.page));
  React.useEffect(() => setHideUnsupported(getStoredHideUnsupported(support?.page)), [support?.page]);
  const supportInstruments = support?.instruments;
  const supportedNames = React.useMemo(
    () => supportInstruments && new Set(supportInstruments.map((name) => name.toUpperCase())),
    [supportInstruments]
  );
  const availableInstruments = React.useMemo(
    () =>
      hideUnsupported && supportedNames
        ? instrumentOptions.filter((instrument) => supportedNames.has(instrument.name.toUpperCase()))
        : instrumentOptions,
    [hideUnsupported, instrumentOptions, supportedNames]
  );
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>(getStoredFavoriteInstrumentIds);
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
  const favoriteIdSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const filteredInstruments = React.useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return availableInstruments
      .filter(
        (instrument) =>
          normalizedSearchTerm.length === 0 ||
          [instrument.name, ...getInstrumentTechniques(instrument)].some((value) =>
            value.toLowerCase().includes(normalizedSearchTerm)
          )
      )
      .sort(
        (instrumentA, instrumentB) =>
          Number(favoriteIdSet.has(instrumentB.id)) - Number(favoriteIdSet.has(instrumentA.id)) ||
          instrumentA.name.localeCompare(instrumentB.name)
      );
  }, [availableInstruments, favoriteIdSet, searchTerm]);

  const toggleHideUnsupported = (checked: boolean): void => {
    setHideUnsupported(checked);
    if (support) setStoredHideUnsupported(support.page, checked);
  };

  const openTypeMenu = (anchorElement: HTMLElement): void => {
    setFavoriteIds(getStoredFavoriteInstrumentIds());
    setHideUnsupported(getStoredHideUnsupported(support?.page));
    setSearchTerm('');
    setTypeMenuAnchorEl(anchorElement);
  };

  const closeMenus = (): void => {
    setTypeMenuAnchorEl(null);
    setSearchTerm('');
  };

  const selectInstrument = (instrument: string): void => {
    handleInstrumentChange(instrument);
    closeMenus();
  };

  const handleToggleFavorite = (event: React.MouseEvent<HTMLButtonElement>, instrumentId: number): void => {
    event.stopPropagation();

    setFavoriteIds((prevFavoriteIds) => {
      const nextFavoriteIds = prevFavoriteIds.includes(instrumentId)
        ? prevFavoriteIds.filter((favoriteId) => favoriteId !== instrumentId)
        : [...prevFavoriteIds, instrumentId];

      setStoredFavoriteInstrumentIds(nextFavoriteIds);
      return nextFavoriteIds;
    });
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
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => openTypeMenu(event.currentTarget)}
        sx={
          isCompactVariant
            ? getPageHeaderControlSx
            : {
                ...getPageHeaderControlSx(theme),
                border: `1px solid ${chrome.border}`,
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
      <Popover
        id="instrument-type-menu"
        anchorEl={typeMenuAnchorEl}
        open={typeMenuOpen}
        onClose={closeMenus}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: SELECTOR_MENU_WIDTH,
              maxWidth: 'calc(100vw - 32px)',
              border: `1px solid ${chrome.border}`,
              borderRadius: 0,
              backgroundColor: chrome.surface,
              backgroundImage: 'none',
              color: chrome.text,
              boxShadow: 'none',
              overflow: 'hidden',
              '& .MuiDivider-root': { borderColor: chrome.border },
              '& .MuiButton-root, & .MuiIconButton-root': { borderRadius: 0 },
              '& .MuiButton-root:focus-visible, & .MuiIconButton-root:focus-visible': {
                outline: `2px solid ${chrome.accent}`,
                outlineOffset: -2,
              },
              '& .MuiMenuItem-root': {
                minHeight: 56,
                px: 1.5,
                borderBottom: `1px solid ${chrome.border}`,
                whiteSpace: 'normal',
                '&:last-child': { borderBottom: 0 },
                '&:hover, &.Mui-focusVisible': { backgroundColor: chrome.hover },
                '&.Mui-selected': {
                  color: chrome.accent,
                  backgroundColor: alpha(chrome.accent, 0.12),
                  boxShadow: `inset 3px 0 0 ${chrome.accent}`,
                },
                '&.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
                  backgroundColor: alpha(chrome.accent, 0.18),
                },
                '&:focus-visible': { outline: `2px solid ${chrome.accent}`, outlineOffset: -2 },
              },
            },
          },
        }}
      >
        <Box
          aria-labelledby="instrument-selector-button"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(620px, calc(100dvh - 32px))',
            minHeight: 0,
            '& [data-scroll-region]': {
              scrollbarWidth: 'thin',
              scrollbarColor: `${chrome.border} ${chrome.header}`,
              overscrollBehavior: 'contain',
            },
          }}
        >
          <Box
            sx={{ p: 1.5, flexShrink: 0, backgroundColor: chrome.header, borderBottom: `1px solid ${chrome.border}` }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search for instrument"
                inputProps={{ 'aria-label': 'Search for instrument' }}
                sx={{
                  minWidth: 0,
                  flex: '1 1 200px',
                  maxWidth: '100%',
                  '& .MuiOutlinedInput-root': {
                    height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                    borderRadius: 0,
                    backgroundColor: chrome.surface,
                    color: chrome.text,
                    fontSize: '0.875rem',
                    '& fieldset': { borderColor: chrome.border },
                    '&:hover fieldset, &.Mui-focused fieldset': { borderColor: chrome.accent },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: chrome.accent }} />
                    </InputAdornment>
                  ),
                }}
              />
              {support && (
                <FormControlLabel
                  label="Hide unsupported instruments"
                  sx={{
                    m: 0,
                    flex: '0 0 auto',
                    maxWidth: '100%',
                    minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                    '& .MuiFormControlLabel-label': { fontSize: '0.875rem' },
                  }}
                  control={
                    <Checkbox
                      size="small"
                      checked={hideUnsupported}
                      onChange={(_event, checked) => toggleHideUnsupported(checked)}
                      sx={{
                        color: chrome.text,
                        '&.Mui-checked': { color: chrome.accent },
                        '&.Mui-focusVisible': { outline: `2px solid ${chrome.accent}`, outlineOffset: -2 },
                      }}
                    />
                  }
                />
              )}
            </Box>
          </Box>
          <Box
            role="menu"
            aria-labelledby="instrument-selector-button"
            data-scroll-region
            sx={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 100 }}
          >
            {showAllInstrumentsListOption && searchTerm.trim().length === 0 && (
              <>
                <MenuItem
                  component="div"
                  role="menuitem"
                  selected={selectedInstrument === allInstrumentsValue}
                  onClick={() => selectInstrument(allInstrumentsValue)}
                >
                  <ListItemText primary={allInstrumentsLabel} />
                </MenuItem>
                <Divider component="div" />
              </>
            )}
            {filteredInstruments.length > 0 ? (
              filteredInstruments.map((instrument) => {
                const favourite = favoriteIdSet.has(instrument.id);

                return (
                  <MenuItem
                    component="div"
                    role="menuitem"
                    key={instrument.id}
                    selected={instrument.name === selectedInstrument}
                    onClick={() => selectInstrument(instrument.name)}
                  >
                    <ListItemText
                      primary={instrument.name}
                      secondary={formatInstrumentTechniques(instrument)}
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem', color: alpha(chrome.text, 0.75) }}
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      aria-label={`${favourite ? 'Remove' : 'Add'} ${instrument.name} ${
                        favourite ? 'from favourites' : 'to favourites'
                      }`}
                      size="small"
                      onClick={(event: React.MouseEvent<HTMLButtonElement>) =>
                        handleToggleFavorite(event, instrument.id)
                      }
                      sx={{
                        flex: '0 0 auto',
                        width: 32,
                        height: 32,
                        border: `1px solid ${chrome.border}`,
                        color: favourite ? 'warning.main' : chrome.text,
                        backgroundColor: chrome.surface,
                        '&:hover': { backgroundColor: chrome.hover },
                      }}
                    >
                      {favourite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </MenuItem>
                );
              })
            ) : (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No instruments found
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default InstrumentSelector;
