import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import * as React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import NavArrows from '../components/navigation/NavArrows';
import { instruments } from '../lib/instrumentData';

const ALL_TYPES = 'All';

const getStoredFavoriteIds = (): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const storedFavorites = localStorage.getItem('favoriteInstruments');
  if (!storedFavorites) {
    return [];
  }

  try {
    const parsedFavorites: unknown = JSON.parse(storedFavorites);
    return Array.isArray(parsedFavorites)
      ? parsedFavorites.filter((favoriteId): favoriteId is number => Number.isInteger(favoriteId))
      : [];
  } catch {
    return [];
  }
};

const Instruments: React.FC = () => {
  const theme = useTheme();
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>(getStoredFavoriteIds);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedType, setSelectedType] = React.useState(ALL_TYPES);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const instrumentActionColor = theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main;
  const instrumentActionHoverColor = theme.palette.mode === 'dark' ? '#b7d1ff' : theme.palette.primary.dark;

  React.useEffect(() => {
    localStorage.setItem('favoriteInstruments', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const instrumentTypes = React.useMemo(
    () =>
      Array.from(new Set(instruments.map((instrument) => instrument.type))).sort((typeA, typeB) =>
        typeA.localeCompare(typeB)
      ),
    []
  );

  const instrumentCountByType = React.useMemo(
    () =>
      instruments.reduce<Map<string, number>>((countByType, instrument) => {
        countByType.set(instrument.type, (countByType.get(instrument.type) ?? 0) + 1);
        return countByType;
      }, new Map<string, number>()),
    []
  );

  const favoriteIdSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const filteredInstruments = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return instruments
      .filter((instrument) => {
        const searchableValues = [instrument.name, instrument.type, instrument.description, ...instrument.scientists];
        const matchesSearch =
          normalizedSearch.length === 0 ||
          searchableValues.some((searchableValue) => searchableValue.toLowerCase().includes(normalizedSearch));
        const matchesType = selectedType === ALL_TYPES || instrument.type === selectedType;
        const matchesFavorite = !showFavoritesOnly || favoriteIdSet.has(instrument.id);

        return matchesSearch && matchesType && matchesFavorite;
      })
      .sort((instrumentA, instrumentB) => {
        const favoriteSort = Number(favoriteIdSet.has(instrumentB.id)) - Number(favoriteIdSet.has(instrumentA.id));
        return favoriteSort || instrumentA.name.localeCompare(instrumentB.name);
      });
  }, [favoriteIdSet, searchTerm, selectedType, showFavoritesOnly]);

  const handleToggleFavorite = (id: number): void => {
    setFavoriteIds((prevFavoriteIds) =>
      prevFavoriteIds.includes(id)
        ? prevFavoriteIds.filter((favoriteId) => favoriteId !== id)
        : [...prevFavoriteIds, id]
    );
  };

  const handleClearFilters = (): void => {
    setSearchTerm('');
    setSelectedType(ALL_TYPES);
    setShowFavoritesOnly(false);
  };

  const resultLabel = `${filteredInstruments.length} instrument${filteredInstruments.length === 1 ? '' : 's'}`;

  return (
    <>
      <NavArrows />
      <Box className="tour-instruments" sx={{ px: { xs: 2, md: 3 }, py: 2, pb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            justifyContent: 'space-between',
            gap: 1,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h3" component="h1" sx={{ color: 'text.primary' }}>
              ISIS instruments
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {instruments.length} instruments across {instrumentTypes.length} techniques
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {resultLabel}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 1, backgroundColor: 'background.paper' }}>
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Instrument, technique or scientist"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label={`All (${instruments.length})`}
                clickable
                color={selectedType === ALL_TYPES && !showFavoritesOnly ? 'primary' : 'default'}
                variant={selectedType === ALL_TYPES && !showFavoritesOnly ? 'filled' : 'outlined'}
                onClick={() => {
                  setSelectedType(ALL_TYPES);
                  setShowFavoritesOnly(false);
                }}
              />
              <Chip
                label={`Favourites (${favoriteIds.length})`}
                clickable
                color={showFavoritesOnly ? 'primary' : 'default'}
                variant={showFavoritesOnly ? 'filled' : 'outlined'}
                onClick={() => setShowFavoritesOnly((currentValue) => !currentValue)}
              />
              {instrumentTypes.map((instrumentType) => (
                <Chip
                  key={instrumentType}
                  label={`${instrumentType} (${instrumentCountByType.get(instrumentType) ?? 0})`}
                  clickable
                  color={selectedType === instrumentType ? 'primary' : 'default'}
                  variant={selectedType === instrumentType ? 'filled' : 'outlined'}
                  onClick={() => setSelectedType(instrumentType)}
                />
              ))}
            </Box>
          </Stack>
        </Paper>

        {filteredInstruments.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              No instruments found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Try another search term or filter.
            </Typography>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              sx={{
                color: instrumentActionColor,
                borderColor: alpha(instrumentActionColor, theme.palette.mode === 'dark' ? 0.72 : 0.5),
                '&:hover': {
                  color: instrumentActionHoverColor,
                  borderColor: instrumentActionHoverColor,
                  backgroundColor: alpha(instrumentActionColor, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                },
              }}
            >
              Clear filters
            </Button>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
              alignItems: 'start',
            }}
          >
            {filteredInstruments.map((instrument) => {
              const favourite = favoriteIdSet.has(instrument.id);

              return (
                <Paper
                  key={instrument.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    minWidth: 0,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: 'divider',
                    backgroundColor: favourite ? theme.palette.action.hover : 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{ color: instrumentActionColor, fontWeight: 700, lineHeight: 1.2 }}
                      >
                        {instrument.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={instrument.type}
                        sx={{
                          mt: 1,
                          maxWidth: '100%',
                          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                        }}
                      />
                    </Box>
                    <IconButton
                      aria-label={`${favourite ? 'Remove' : 'Add'} ${instrument.name} ${
                        favourite ? 'from favourites' : 'to favourites'
                      }`}
                      onClick={() => handleToggleFavorite(instrument.id)}
                      sx={{ color: favourite ? 'warning.main' : 'action.active' }}
                    >
                      {favourite ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1.5,
                      flexGrow: 1,
                    }}
                  >
                    {instrument.description}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
                      Scientists
                    </Typography>
                    {instrument.scientists.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {instrument.scientists.map((scientist) => (
                          <Chip key={scientist} size="small" label={scientist} />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No scientists listed by ISIS.
                      </Typography>
                    )}
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to={`/reduction-history/${instrument.name.toUpperCase()}`}
                      startIcon={<HistoryIcon />}
                    >
                      Reduction history
                    </Button>
                    <Button
                      variant="outlined"
                      href={instrument.infoPage}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<OpenInNewIcon />}
                      sx={{
                        color: instrumentActionColor,
                        borderColor: alpha(instrumentActionColor, theme.palette.mode === 'dark' ? 0.72 : 0.5),
                        '&:hover': {
                          color: instrumentActionHoverColor,
                          borderColor: instrumentActionHoverColor,
                          backgroundColor: alpha(instrumentActionColor, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                        },
                      }}
                    >
                      ISIS page
                    </Button>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </>
  );
};

export default Instruments;
