import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import React from 'react';

import { instruments as allInstruments, type InstrumentData } from '../../lib/instrumentData';
import { getStoredFavoriteInstrumentIds, setStoredFavoriteInstrumentIds } from '../../lib/instrumentFavorites';

const ALL_INSTRUMENTS_VALUE = 'ALL';

const getInstrumentSelectorLabel = (
  instrument: string,
  allInstrumentsValue: string,
  allInstrumentsLabel: string
): string => (instrument === allInstrumentsValue ? allInstrumentsLabel : instrument);

export const ALL_FILTER = 'All';
export const FAVORITES_FILTER = 'Favourites';
export const SELECTOR_MENU_WIDTH = 540;

const getFilterButtonSx =
  (active: boolean): SxProps<Theme> =>
  (theme) => {
    const darkMode = theme.palette.mode === 'dark';
    const accentColor = darkMode ? theme.palette.primary.light : theme.palette.primary.main;
    const inactiveBorderColor = darkMode ? alpha(theme.palette.common.white, 0.28) : theme.palette.divider;
    const inactiveBackgroundColor = darkMode ? alpha(theme.palette.common.white, 0.06) : 'transparent';
    const inactiveHoverBackgroundColor = darkMode
      ? alpha(theme.palette.common.white, 0.1)
      : alpha(theme.palette.primary.main, 0.04);
    const activeBackgroundColor = darkMode ? alpha(accentColor, 0.18) : alpha(accentColor, 0.08);
    const activeHoverBackgroundColor = darkMode ? alpha(accentColor, 0.24) : alpha(accentColor, 0.12);

    return {
      minWidth: 0,
      height: 62,
      justifyContent: 'flex-start',
      alignItems: 'center',
      borderRadius: 1,
      px: 1.25,
      py: 0.75,
      borderColor: active ? alpha(accentColor, darkMode ? 0.9 : 0.72) : inactiveBorderColor,
      boxShadow: active ? `inset 3px 0 0 ${accentColor}` : 'none',
      color: active ? (darkMode ? theme.palette.common.white : accentColor) : theme.palette.text.primary,
      backgroundColor: active ? activeBackgroundColor : inactiveBackgroundColor,
      fontWeight: active ? 700 : 500,
      textAlign: 'left',
      textTransform: 'none',
      whiteSpace: 'normal',
      lineHeight: 1.15,
      '&:hover': {
        borderColor: active ? accentColor : alpha(accentColor, darkMode ? 0.64 : 0.42),
        backgroundColor: active ? activeHoverBackgroundColor : inactiveHoverBackgroundColor,
      },
    };
  };

export const TechniqueFilterButton: React.FC<{
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <Button
    color="primary"
    variant="outlined"
    aria-label={`${label} (${count})`}
    onClick={onClick}
    sx={getFilterButtonSx(active)}
  >
    <Box
      component="span"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 2.5rem',
        alignItems: 'center',
        columnGap: 1,
        width: '100%',
      }}
    >
      <Typography
        component="span"
        variant="body2"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'normal',
          lineHeight: 1.15,
          fontWeight: 'inherit',
        }}
      >
        {label}
      </Typography>
      <Typography
        component="span"
        variant="body2"
        sx={{
          justifySelf: 'end',
          minWidth: 0,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {count}
      </Typography>
    </Box>
  </Button>
);

const InstrumentSelector: React.FC<{
  selectedInstrument: string;
  handleInstrumentChange: (instrument: string) => void;
  variant?: 'default' | 'breadcrumb';
  instrumentOptions?: InstrumentData[];
  allInstrumentsValue?: string;
  allInstrumentsLabel?: string;
  breadcrumbAllInstrumentsLabel?: string;
  showAllInstrumentsOption?: boolean;
  disabled?: boolean;
}> = ({
  selectedInstrument,
  handleInstrumentChange,
  variant = 'default',
  instrumentOptions = allInstruments,
  allInstrumentsValue = ALL_INSTRUMENTS_VALUE,
  allInstrumentsLabel = 'View all reductions',
  breadcrumbAllInstrumentsLabel = 'Select an instrument',
  showAllInstrumentsOption = true,
  disabled = false,
}) => {
  const [typeMenuAnchorEl, setTypeMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<string>(ALL_FILTER);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>(getStoredFavoriteInstrumentIds);
  const isBreadcrumbVariant = variant === 'breadcrumb';
  const selectorLabel = getInstrumentSelectorLabel(selectedInstrument, allInstrumentsValue, allInstrumentsLabel);
  const buttonLabel =
    isBreadcrumbVariant && selectedInstrument === allInstrumentsValue ? breadcrumbAllInstrumentsLabel : selectorLabel;
  const showAllInstrumentsSelection =
    showAllInstrumentsOption && (!isBreadcrumbVariant || selectedInstrument !== allInstrumentsValue);
  const showAllInstrumentsHeaderAction = showAllInstrumentsOption && selectedInstrument !== allInstrumentsValue;
  const showAllInstrumentsListOption = showAllInstrumentsSelection && !showAllInstrumentsHeaderAction;

  const typeMenuOpen = Boolean(typeMenuAnchorEl);
  const favoriteIdSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const instrumentsByType = React.useMemo(
    () =>
      Array.from(new Set(instrumentOptions.map((instrument) => instrument.type)))
        .sort((typeA, typeB) => typeA.localeCompare(typeB))
        .map((type) => ({
          type,
          instruments: instrumentOptions
            .filter((instrument) => instrument.type === type)
            .sort((instrumentA, instrumentB) => instrumentA.name.localeCompare(instrumentB.name)),
        })),
    [instrumentOptions]
  );
  const favoriteInstruments = React.useMemo(() => {
    return instrumentOptions
      .filter((instrument) => favoriteIdSet.has(instrument.id))
      .sort((instrumentA, instrumentB) => instrumentA.name.localeCompare(instrumentB.name));
  }, [favoriteIdSet, instrumentOptions]);
  const filteredInstruments = React.useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return instrumentOptions
      .filter((instrument) => {
        const matchesFilter =
          activeFilter === ALL_FILTER ||
          (activeFilter === FAVORITES_FILTER && favoriteIdSet.has(instrument.id)) ||
          instrument.type === activeFilter;
        const matchesSearch =
          normalizedSearchTerm.length === 0 ||
          [instrument.name, instrument.type].some((value) => value.toLowerCase().includes(normalizedSearchTerm));

        return matchesFilter && matchesSearch;
      })
      .sort((instrumentA, instrumentB) => instrumentA.name.localeCompare(instrumentB.name));
  }, [activeFilter, favoriteIdSet, instrumentOptions, searchTerm]);

  const openTypeMenu = (anchorElement: HTMLElement): void => {
    setFavoriteIds(getStoredFavoriteInstrumentIds());
    setSearchTerm('');
    setActiveFilter(
      selectedInstrument === allInstrumentsValue
        ? ALL_FILTER
        : (instrumentOptions.find((instrument) => instrument.name === selectedInstrument)?.type ?? ALL_FILTER)
    );
    setTypeMenuAnchorEl(anchorElement);
  };

  const closeMenus = (): void => {
    setTypeMenuAnchorEl(null);
    setActiveFilter(ALL_FILTER);
    setSearchTerm('');
  };

  const selectInstrument = (instrument: string): void => {
    handleInstrumentChange(instrument);
    closeMenus();
  };

  const handleFilterChange = (filter: string): void => {
    setActiveFilter(filter);
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
        className={isBreadcrumbVariant ? 'breadcrumb-control' : undefined}
        variant={isBreadcrumbVariant ? 'text' : 'outlined'}
        aria-haspopup="menu"
        aria-controls={typeMenuOpen ? 'instrument-type-menu' : undefined}
        aria-expanded={typeMenuOpen ? 'true' : undefined}
        aria-label={isBreadcrumbVariant ? `Instrument: ${buttonLabel}` : undefined}
        disabled={disabled}
        endIcon={<ArrowDropDown />}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => openTypeMenu(event.currentTarget)}
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
      <Popover
        id="instrument-type-menu"
        anchorEl={typeMenuAnchorEl}
        open={typeMenuOpen}
        onClose={closeMenus}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: { width: SELECTOR_MENU_WIDTH, maxWidth: 'calc(100vw - 32px)' },
          },
        }}
      >
        <Box
          aria-labelledby="instrument-selector-button"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(620px, calc(100vh - 96px))',
          }}
        >
          <Box sx={{ p: 1.5, pb: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search instruments"
                sx={{ minWidth: 0, flex: '1 1 auto' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              {showAllInstrumentsHeaderAction && (
                <Button
                  variant="contained"
                  size="medium"
                  onClick={() => selectInstrument(allInstrumentsValue)}
                  sx={{ flex: '0 0 auto', height: 40, whiteSpace: 'nowrap', textTransform: 'none' }}
                >
                  {allInstrumentsLabel}
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.75, mt: 1 }}>
              <TechniqueFilterButton
                label={ALL_FILTER}
                count={instrumentOptions.length}
                active={activeFilter === ALL_FILTER}
                onClick={() => handleFilterChange(ALL_FILTER)}
              />
              <TechniqueFilterButton
                label={FAVORITES_FILTER}
                count={favoriteInstruments.length}
                active={activeFilter === FAVORITES_FILTER}
                onClick={() => handleFilterChange(FAVORITES_FILTER)}
              />
              {instrumentsByType.map((instrumentGroup) => (
                <TechniqueFilterButton
                  key={instrumentGroup.type}
                  label={instrumentGroup.type}
                  count={instrumentGroup.instruments.length}
                  active={activeFilter === instrumentGroup.type}
                  onClick={() => handleFilterChange(instrumentGroup.type)}
                />
              ))}
            </Box>
          </Box>
          <Divider />
          <Box role="menu" aria-labelledby="instrument-selector-button" sx={{ overflowY: 'auto', py: 0.5 }}>
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
                      secondary={instrument.type}
                      secondaryTypographyProps={{ noWrap: true }}
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
                      sx={{ flex: '0 0 auto', color: favourite ? 'warning.main' : 'action.active' }}
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
