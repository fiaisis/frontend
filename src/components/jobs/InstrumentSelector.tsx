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

import { instruments } from '../../lib/instrumentData';
import { getStoredFavoriteInstrumentIds, setStoredFavoriteInstrumentIds } from '../../lib/instrumentFavorites';

const getInstrumentSelectorLabel = (instrument: string): string =>
  instrument === 'ALL' ? 'View all reductions' : instrument;

const ALL_FILTER = 'All';
const FAVORITES_FILTER = 'Favourites';
const SELECTOR_MENU_WIDTH = 540;
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
      height: 54,
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
  const [activeFilter, setActiveFilter] = React.useState<string>(ALL_FILTER);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>(getStoredFavoriteInstrumentIds);
  const isBreadcrumbVariant = variant === 'breadcrumb';
  const selectorLabel = getInstrumentSelectorLabel(selectedInstrument);
  const buttonLabel = isBreadcrumbVariant && selectedInstrument === 'ALL' ? 'Select an instrument' : selectorLabel;
  const showViewAllReductionsOption = !isBreadcrumbVariant || selectedInstrument !== 'ALL';
  const showViewAllReductionsHeaderAction = selectedInstrument !== 'ALL';
  const showViewAllReductionsListOption = showViewAllReductionsOption && !showViewAllReductionsHeaderAction;

  const typeMenuOpen = Boolean(typeMenuAnchorEl);
  const favoriteIdSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const favoriteInstruments = React.useMemo(() => {
    return instruments
      .filter((instrument) => favoriteIdSet.has(instrument.id))
      .sort((instrumentA, instrumentB) => instrumentA.name.localeCompare(instrumentB.name));
  }, [favoriteIdSet]);
  const filteredInstruments = React.useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return instruments
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
      .sort((instrumentA, instrumentB) => {
        const favoriteSort = Number(favoriteIdSet.has(instrumentB.id)) - Number(favoriteIdSet.has(instrumentA.id));
        return favoriteSort || instrumentA.name.localeCompare(instrumentB.name);
      });
  }, [activeFilter, favoriteIdSet, searchTerm]);

  const openTypeMenu = (anchorElement: HTMLElement): void => {
    setFavoriteIds(getStoredFavoriteInstrumentIds());
    setSearchTerm('');
    setActiveFilter(
      selectedInstrument === 'ALL'
        ? ALL_FILTER
        : (instruments.find((instrument) => instrument.name === selectedInstrument)?.type ?? ALL_FILTER)
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
              {showViewAllReductionsHeaderAction && (
                <Button
                  variant="contained"
                  size="medium"
                  onClick={() => selectInstrument('ALL')}
                  sx={{ flex: '0 0 auto', height: 40, whiteSpace: 'nowrap', textTransform: 'none' }}
                >
                  View all reductions
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.75, mt: 1 }}>
              <Button
                color="primary"
                variant="outlined"
                onClick={() => handleFilterChange(ALL_FILTER)}
                sx={getFilterButtonSx(activeFilter === ALL_FILTER)}
              >
                {`All (${instruments.length})`}
              </Button>
              {favoriteInstruments.length > 0 && (
                <Button
                  color="primary"
                  variant="outlined"
                  onClick={() => handleFilterChange(FAVORITES_FILTER)}
                  sx={getFilterButtonSx(activeFilter === FAVORITES_FILTER)}
                >
                  {`Favourites (${favoriteInstruments.length})`}
                </Button>
              )}
              {instrumentsByType.map((instrumentGroup) => (
                <Button
                  key={instrumentGroup.type}
                  color="primary"
                  variant="outlined"
                  onClick={() => handleFilterChange(instrumentGroup.type)}
                  sx={getFilterButtonSx(activeFilter === instrumentGroup.type)}
                >
                  {`${instrumentGroup.type} (${instrumentGroup.instruments.length})`}
                </Button>
              ))}
            </Box>
          </Box>
          <Divider />
          <Box role="menu" aria-labelledby="instrument-selector-button" sx={{ overflowY: 'auto', py: 0.5 }}>
            {showViewAllReductionsListOption && searchTerm.trim().length === 0 && (
              <>
                <MenuItem
                  component="div"
                  role="menuitem"
                  selected={selectedInstrument === 'ALL'}
                  onClick={() => selectInstrument('ALL')}
                >
                  <ListItemText primary="View all reductions" />
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
                      onClick={(event) => handleToggleFavorite(event, instrument.id)}
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
