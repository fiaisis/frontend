import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Box,
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

interface InstrumentMenuProps {
  id: string;
  labelledBy: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  selectedInstruments: string[];
  onSelectInstrument: (instrument: string) => void;
  multiple?: boolean;
  instrumentOptions?: InstrumentData[];
  allInstrumentsOption?: { value: string; label: string };
  support?: InstrumentSupport;
}

const SELECTOR_MENU_WIDTH = 540;

const InstrumentMenu: React.FC<InstrumentMenuProps> = ({
  id,
  labelledBy,
  anchorEl,
  onClose,
  selectedInstruments,
  onSelectInstrument,
  multiple = false,
  instrumentOptions = allInstruments,
  allInstrumentsOption,
  support,
}) => {
  const theme = useTheme();
  const chrome = getJobTableChromeColors(theme.palette.mode);
  const [hideUnsupported, setHideUnsupported] = React.useState(() => getStoredHideUnsupported(support?.page));
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
  const [searchTerm, setSearchTerm] = React.useState('');
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>(getStoredFavoriteInstrumentIds);

  React.useEffect(() => {
    if (anchorEl) {
      setFavoriteIds(getStoredFavoriteInstrumentIds());
    }
    setHideUnsupported(getStoredHideUnsupported(support?.page));
    setSearchTerm('');
  }, [anchorEl, support?.page]);

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
    <Popover
      id={id}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
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
        aria-labelledby={labelledBy}
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
        <Box sx={{ p: 1.5, flexShrink: 0, backgroundColor: chrome.header, borderBottom: `1px solid ${chrome.border}` }}>
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
          aria-labelledby={labelledBy}
          data-scroll-region
          sx={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 100 }}
        >
          {allInstrumentsOption && searchTerm.trim().length === 0 && (
            <>
              <MenuItem
                component="div"
                role="menuitem"
                selected={selectedInstruments.includes(allInstrumentsOption.value)}
                onClick={() => onSelectInstrument(allInstrumentsOption.value)}
              >
                <ListItemText primary={allInstrumentsOption.label} />
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
                  role={multiple ? 'menuitemcheckbox' : 'menuitem'}
                  aria-checked={multiple ? selectedInstruments.includes(instrument.name) : undefined}
                  key={instrument.id}
                  selected={selectedInstruments.includes(instrument.name)}
                  onClick={() => onSelectInstrument(instrument.name)}
                >
                  {multiple &&
                    (selectedInstruments.includes(instrument.name) ? (
                      <CheckBoxIcon fontSize="small" sx={{ mr: 1.5, color: chrome.accent }} />
                    ) : (
                      <CheckBoxOutlineBlankIcon fontSize="small" sx={{ mr: 1.5, color: alpha(chrome.text, 0.7) }} />
                    ))}
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
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => handleToggleFavorite(event, instrument.id)}
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
  );
};

export default InstrumentMenu;
