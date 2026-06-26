import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Paper,
  Popover,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import * as React from 'react';
import { Link as RouterLink, useHistory, useLocation, useParams } from 'react-router-dom';

import {
  ALL_FILTER,
  FAVORITES_FILTER,
  SELECTOR_MENU_WIDTH,
  TechniqueFilterButton,
} from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import {
  formatInstrumentTechniques,
  getInstrumentTechniques,
  getUniqueInstrumentTechniques,
  instrumentHasTechnique,
  instruments,
  type InstrumentData,
} from '../lib/instrumentData';
import { getStoredFavoriteInstrumentIds, setStoredFavoriteInstrumentIds } from '../lib/instrumentFavorites';

const INSTRUMENT_SEARCH_LABEL = 'Search for instrument';

const getTechniqueSlug = (instrumentType: string): string =>
  instrumentType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getTechniqueRoute = (instrumentType: string): string =>
  instrumentType === ALL_FILTER ? '/isis-instruments' : `/isis-instruments/${getTechniqueSlug(instrumentType)}`;

const getInstrumentRoute = (instrument: InstrumentData): string =>
  `/isis-instruments/${encodeURIComponent(instrument.name.toUpperCase())}`;

const getDecodedRouteParam = (routeParam: string | undefined): string | undefined => {
  if (!routeParam) {
    return undefined;
  }

  try {
    return decodeURIComponent(routeParam);
  } catch {
    return routeParam;
  }
};

const getInstrumentFromRouteParam = (routeParam: string | undefined): InstrumentData | null => {
  const decodedRouteParam = getDecodedRouteParam(routeParam);

  if (!decodedRouteParam) {
    return null;
  }

  const normalizedInstrument = decodedRouteParam.trim().toLowerCase();

  return instruments.find((instrument) => instrument.name.toLowerCase() === normalizedInstrument) ?? null;
};

const getTechniqueFromRouteParam = (routeTechnique: string | undefined, instrumentTypes: string[]): string => {
  const decodedTechnique = getDecodedRouteParam(routeTechnique);

  if (!decodedTechnique) {
    return ALL_FILTER;
  }

  const normalizedTechnique = decodedTechnique.trim().toLowerCase();

  return (
    instrumentTypes.find(
      (instrumentType) =>
        instrumentType.toLowerCase() === normalizedTechnique || getTechniqueSlug(instrumentType) === normalizedTechnique
    ) ?? ALL_FILTER
  );
};

const InstrumentSearchBreadcrumb: React.FC<{
  searchTerm: string;
  selectedType: string;
  selectedInstrumentName: string | null;
  showFavoritesOnly: boolean;
  favoriteIds: number[];
  favoriteIdSet: Set<number>;
  instrumentTypes: string[];
  instrumentCountByType: Map<string, number>;
  filteredInstruments: InstrumentData[];
  onSearchTermChange: (searchTerm: string) => void;
  onSelectedTypeChange: (instrumentType: string) => void;
  onSelectFavorites: () => void;
  onShowAllTypes: () => void;
  onClearFilters: () => void;
  onSelectInstrument: (instrument: InstrumentData) => void;
  onToggleFavorite: (id: number) => void;
}> = ({
  searchTerm,
  selectedType,
  selectedInstrumentName,
  showFavoritesOnly,
  favoriteIds,
  favoriteIdSet,
  instrumentTypes,
  instrumentCountByType,
  filteredInstruments,
  onSearchTermChange,
  onSelectedTypeChange,
  onSelectFavorites,
  onShowAllTypes,
  onClearFilters,
  onSelectInstrument,
  onToggleFavorite,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);
  const hasActiveFilters =
    searchTerm.trim().length > 0 || selectedType !== ALL_FILTER || showFavoritesOnly || selectedInstrumentName !== null;
  const breadcrumbLabel =
    selectedInstrumentName ??
    (selectedType !== ALL_FILTER && !showFavoritesOnly ? selectedType : INSTRUMENT_SEARCH_LABEL);

  const closeMenu = (): void => {
    setAnchorEl(null);
  };

  const handleInstrumentSelect = (instrument: InstrumentData): void => {
    onSelectInstrument(instrument);
    closeMenu();
  };

  return (
    <>
      <Button
        id="instrument-search-button"
        className="breadcrumb-control"
        variant="text"
        aria-haspopup="menu"
        aria-controls={menuOpen ? 'instrument-search-menu' : undefined}
        aria-expanded={menuOpen ? 'true' : undefined}
        aria-label={`Instrument search: ${breadcrumbLabel}`}
        endIcon={<ArrowDropDown />}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)}
        sx={{
          minWidth: 0,
          border: 0,
          borderRadius: 0,
          boxShadow: 'none',
          font: 'inherit',
          textTransform: 'none',
          '& .MuiButton-endIcon': { ml: 0.75, mr: 0, color: 'inherit' },
        }}
      >
        <Box component="span">{breadcrumbLabel}</Box>
      </Button>
      <Popover
        id="instrument-search-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: { width: SELECTOR_MENU_WIDTH, maxWidth: 'calc(100vw - 32px)' },
          },
        }}
      >
        <Box
          aria-labelledby="instrument-search-button"
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
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Search for instrument, technique, or scientist"
                sx={{ minWidth: 0, flex: '1 1 auto' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              {hasActiveFilters && (
                <Button
                  variant="contained"
                  size="medium"
                  onClick={onClearFilters}
                  sx={{ flex: '0 0 auto', height: 40, whiteSpace: 'nowrap', textTransform: 'none' }}
                >
                  Clear filters
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.75, mt: 1 }}>
              <TechniqueFilterButton
                label={ALL_FILTER}
                count={instruments.length}
                active={selectedType === ALL_FILTER && !showFavoritesOnly && selectedInstrumentName === null}
                onClick={onShowAllTypes}
              />
              <TechniqueFilterButton
                label={FAVORITES_FILTER}
                count={favoriteIds.length}
                active={showFavoritesOnly}
                onClick={onSelectFavorites}
              />
              {instrumentTypes.map((instrumentType) => (
                <TechniqueFilterButton
                  key={instrumentType}
                  label={instrumentType}
                  count={instrumentCountByType.get(instrumentType) ?? 0}
                  active={selectedType === instrumentType}
                  onClick={() => onSelectedTypeChange(instrumentType)}
                />
              ))}
            </Box>
          </Box>
          <Divider />
          <Box role="menu" aria-labelledby="instrument-search-button" sx={{ overflowY: 'auto', py: 0.5 }}>
            {filteredInstruments.length > 0 ? (
              filteredInstruments.map((instrument) => {
                const favourite = favoriteIdSet.has(instrument.id);

                return (
                  <MenuItem
                    component="div"
                    role="menuitem"
                    key={instrument.id}
                    selected={selectedInstrumentName === instrument.name}
                    onClick={() => handleInstrumentSelect(instrument)}
                  >
                    <ListItemText
                      primary={instrument.name}
                      secondary={formatInstrumentTechniques(instrument)}
                      secondaryTypographyProps={{ noWrap: true }}
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      aria-label={`${favourite ? 'Remove' : 'Add'} ${instrument.name} ${
                        favourite ? 'from favourites' : 'to favourites'
                      }`}
                      size="small"
                      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        onToggleFavorite(instrument.id);
                      }}
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

const Instruments: React.FC = () => {
  const theme = useTheme();
  const history = useHistory();
  const location = useLocation();
  const { instrumentOrTechnique } = useParams<{ instrumentOrTechnique?: string }>();
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>(getStoredFavoriteInstrumentIds);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const instrumentActionColor = theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main;
  const instrumentActionHoverColor = theme.palette.mode === 'dark' ? '#b7d1ff' : theme.palette.primary.dark;

  const instrumentTypes = React.useMemo(() => getUniqueInstrumentTechniques(instruments), []);
  const routeSelectedInstrument = React.useMemo(
    () => getInstrumentFromRouteParam(instrumentOrTechnique),
    [instrumentOrTechnique]
  );
  const routeSelectedType = React.useMemo(
    () =>
      routeSelectedInstrument === null
        ? getTechniqueFromRouteParam(instrumentOrTechnique, instrumentTypes)
        : ALL_FILTER,
    [instrumentTypes, instrumentOrTechnique, routeSelectedInstrument]
  );
  const [selectedType, setSelectedType] = React.useState(routeSelectedType);
  const selectedInstrumentName = routeSelectedInstrument?.name ?? null;

  const instrumentCountByType = React.useMemo(
    () =>
      instruments.reduce<Map<string, number>>((countByType, instrument) => {
        getInstrumentTechniques(instrument).forEach((technique) => {
          countByType.set(technique, (countByType.get(technique) ?? 0) + 1);
        });
        return countByType;
      }, new Map<string, number>()),
    []
  );

  const updateRoute = React.useCallback(
    (nextPath: string, method: 'push' | 'replace' = 'push'): void => {
      if (location.pathname === nextPath) {
        return;
      }

      if (method === 'replace') {
        history.replace(nextPath);
        return;
      }

      history.push(nextPath);
    },
    [history, location.pathname]
  );

  const updateTechniqueRoute = React.useCallback(
    (instrumentType: string, method: 'push' | 'replace' = 'push'): void => {
      updateRoute(getTechniqueRoute(instrumentType), method);
    },
    [updateRoute]
  );

  const updateInstrumentRoute = React.useCallback(
    (instrument: InstrumentData, method: 'push' | 'replace' = 'push'): void => {
      updateRoute(getInstrumentRoute(instrument), method);
    },
    [updateRoute]
  );

  React.useEffect(() => {
    setStoredFavoriteInstrumentIds(favoriteIds);
  }, [favoriteIds]);

  React.useEffect(() => {
    setSelectedType(routeSelectedType);

    if (routeSelectedInstrument !== null || routeSelectedType !== ALL_FILTER) {
      setShowFavoritesOnly(false);
    }

    if (instrumentOrTechnique) {
      const canonicalRoute =
        routeSelectedInstrument !== null
          ? getInstrumentRoute(routeSelectedInstrument)
          : getTechniqueRoute(routeSelectedType);

      updateRoute(canonicalRoute, 'replace');
    }
  }, [instrumentOrTechnique, routeSelectedInstrument, routeSelectedType, updateRoute]);

  const favoriteIdSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const filteredInstruments = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return instruments
      .filter((instrument) => {
        const searchableValues = [
          instrument.name,
          ...getInstrumentTechniques(instrument),
          instrument.description,
          ...instrument.scientists,
        ];
        const matchesSearch =
          normalizedSearch.length === 0 ||
          searchableValues.some((searchableValue) => searchableValue.toLowerCase().includes(normalizedSearch));
        const matchesType = selectedType === ALL_FILTER || instrumentHasTechnique(instrument, selectedType);
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
    setSelectedType(ALL_FILTER);
    setShowFavoritesOnly(false);
    updateTechniqueRoute(ALL_FILTER);
  };

  const handleShowAllTypes = (): void => {
    setSelectedType(ALL_FILTER);
    setShowFavoritesOnly(false);
    updateTechniqueRoute(ALL_FILTER);
  };

  const handleSelectFavorites = (): void => {
    setSelectedType(ALL_FILTER);
    setShowFavoritesOnly(true);
    updateTechniqueRoute(ALL_FILTER);
  };

  const handleSelectType = (instrumentType: string): void => {
    setSelectedType(instrumentType);
    setShowFavoritesOnly(false);
    updateTechniqueRoute(instrumentType);
  };

  const handleSelectInstrument = (instrument: InstrumentData): void => {
    setSearchTerm('');
    setSelectedType(ALL_FILTER);
    setShowFavoritesOnly(false);
    updateInstrumentRoute(instrument);
  };

  const visibleInstruments = React.useMemo(
    () => (routeSelectedInstrument !== null ? [routeSelectedInstrument] : filteredInstruments),
    [filteredInstruments, routeSelectedInstrument]
  );

  return (
    <>
      <NavArrows
        trailingCrumb={
          <InstrumentSearchBreadcrumb
            searchTerm={searchTerm}
            selectedType={selectedType}
            selectedInstrumentName={selectedInstrumentName}
            showFavoritesOnly={showFavoritesOnly}
            favoriteIds={favoriteIds}
            favoriteIdSet={favoriteIdSet}
            instrumentTypes={instrumentTypes}
            instrumentCountByType={instrumentCountByType}
            filteredInstruments={filteredInstruments}
            onSearchTermChange={setSearchTerm}
            onSelectedTypeChange={handleSelectType}
            onSelectFavorites={handleSelectFavorites}
            onShowAllTypes={handleShowAllTypes}
            onClearFilters={handleClearFilters}
            onSelectInstrument={handleSelectInstrument}
            onToggleFavorite={handleToggleFavorite}
          />
        }
        replaceLastCrumb={routeSelectedInstrument !== null || routeSelectedType !== ALL_FILTER}
      />
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
        </Box>

        {visibleInstruments.length === 0 ? (
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
              alignItems: 'stretch',
              gridAutoRows: '1fr',
            }}
          >
            {visibleInstruments.map((instrument) => {
              const favourite = favoriteIdSet.has(instrument.id);

              return (
                <Paper
                  key={instrument.id}
                  data-testid="instrument-card"
                  variant="outlined"
                  sx={{
                    borderRadius: 1,
                    minWidth: 0,
                    minHeight: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderColor: 'divider',
                    backgroundColor: favourite ? theme.palette.action.hover : 'background.paper',
                  }}
                >
                  {instrument.image && (
                    <Box
                      component="img"
                      src={instrument.image.url}
                      alt={instrument.image.alt}
                      loading="lazy"
                      sx={{
                        display: 'block',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        objectFit: 'cover',
                        backgroundColor: 'action.hover',
                        flex: '0 0 auto',
                      }}
                    />
                  )}

                  <Box
                    sx={{
                      p: 2,
                      minWidth: 0,
                      minHeight: 0,
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                          {getInstrumentTechniques(instrument).map((technique) => (
                            <Chip
                              key={technique}
                              size="small"
                              label={technique}
                              sx={{
                                maxWidth: '100%',
                                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                              }}
                            />
                          ))}
                        </Box>
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
                        variant="contained"
                        component={RouterLink}
                        to={`/experiment-viewer/${instrument.name.toUpperCase()}`}
                        startIcon={<VisibilityIcon />}
                      >
                        Experiment viewer
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
                  </Box>
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
