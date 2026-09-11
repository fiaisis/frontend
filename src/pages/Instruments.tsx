import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Button, Chip, IconButton, InputAdornment, Paper, TextField, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import * as React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../components/jobs/constants';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { getExperimentViewerUrl } from '../lib/experimentViewerUrl';
import { getInstrumentTechniques, instruments } from '../lib/instrumentData';
import { getStoredFavoriteInstrumentIds, setStoredFavoriteInstrumentIds } from '../lib/instrumentFavorites';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';

const INSTRUMENT_SEARCH_LABEL = 'Search for instrument, technique, or scientist';

const Instruments: React.FC = () => {
  const { rootRef, availableHeight } = useAvailablePluginHeight();
  const cardsScrollRef = React.useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>(getStoredFavoriteInstrumentIds);
  const [searchTerm, setSearchTerm] = React.useState('');
  const instrumentChrome = getJobTableChromeColors(theme.palette.mode);
  const actionButtonSx = {
    minWidth: 0,
    minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
    border: 0,
    borderRadius: 0,
    boxShadow: 'none',
    px: 1,
    color: instrumentChrome.accent,
    textTransform: 'none',
    fontSize: '0.75rem',
    lineHeight: 1.4,
    '& .MuiButton-startIcon': { mr: 0.75, '& > svg': { fontSize: 18 } },
    '&:hover': { backgroundColor: instrumentChrome.hover, boxShadow: 'none' },
    '&:focus-visible': { outline: `2px solid ${instrumentChrome.accent}`, outlineOffset: -2 },
  };
  const chipSx = {
    maxWidth: '100%',
    height: 24,
    borderRadius: 0,
    borderColor: instrumentChrome.border,
    color: instrumentChrome.text,
    fontSize: '0.75rem',
    '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' },
  };

  React.useEffect(() => {
    setStoredFavoriteInstrumentIds(favoriteIds);
  }, [favoriteIds]);

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
        return matchesSearch;
      })
      .sort((instrumentA, instrumentB) => {
        const favoriteSort = Number(favoriteIdSet.has(instrumentB.id)) - Number(favoriteIdSet.has(instrumentA.id));
        return favoriteSort || instrumentA.name.localeCompare(instrumentB.name);
      });
  }, [favoriteIdSet, searchTerm]);

  const handleToggleFavorite = (id: number): void => {
    setFavoriteIds((prevFavoriteIds) =>
      prevFavoriteIds.includes(id)
        ? prevFavoriteIds.filter((favoriteId) => favoriteId !== id)
        : [...prevFavoriteIds, id]
    );
  };

  const handleClearSearch = (): void => setSearchTerm('');

  React.useLayoutEffect(() => {
    if (cardsScrollRef.current) {
      cardsScrollRef.current.scrollTop = 0;
    }
  }, [searchTerm]);

  return (
    <Box
      ref={rootRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: availableHeight,
        maxHeight: availableHeight,
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbs={<NavArrows />}
        controls={
          <TextField
            id="instrument-search"
            size="small"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={INSTRUMENT_SEARCH_LABEL}
            inputProps={{ 'aria-label': INSTRUMENT_SEARCH_LABEL }}
            sx={{
              width: 420,
              maxWidth: '100%',
              minWidth: 0,
              '& .MuiOutlinedInput-root': {
                height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                borderRadius: 0,
                backgroundColor: instrumentChrome.surface,
                color: instrumentChrome.text,
                '& fieldset': { border: 0 },
                '&.Mui-focused': { boxShadow: `inset 0 0 0 2px ${instrumentChrome.accent}` },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: instrumentChrome.accent }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear instrument search"
                    onClick={handleClearSearch}
                    size="small"
                    sx={{
                      borderRadius: 0,
                      color: instrumentChrome.accent,
                      '&:hover': { backgroundColor: instrumentChrome.hover },
                      '&:focus-visible': { outline: `2px solid ${instrumentChrome.accent}`, outlineOffset: -2 },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
        }
      />
      <Box
        className="tour-instruments"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          px: 2,
          pb: 3,
          color: instrumentChrome.text,
        }}
      >
        <Box
          ref={cardsScrollRef}
          role="region"
          aria-label="Instrument cards"
          tabIndex={0}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehaviorY: 'contain',
            scrollbarGutter: 'stable',
            scrollbarColor: `${instrumentChrome.border} ${instrumentChrome.header}`,
            '&:focus-visible': { outline: `2px solid ${instrumentChrome.accent}`, outlineOffset: -2 },
          }}
        >
          {filteredInstruments.length === 0 ? (
            <Paper
              square
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                borderColor: instrumentChrome.border,
                backgroundColor: instrumentChrome.surface,
                color: instrumentChrome.text,
              }}
            >
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                No instruments found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try another search term.
              </Typography>
              <Button variant="text" onClick={handleClearSearch} sx={actionButtonSx}>
                Clear search
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
                gap: 1.5,
                alignItems: 'stretch',
                gridAutoRows: '1fr',
              }}
            >
              {filteredInstruments.map((instrument) => {
                const favourite = favoriteIdSet.has(instrument.id);

                return (
                  <Paper
                    key={instrument.id}
                    data-testid="instrument-card"
                    square
                    variant="outlined"
                    sx={{
                      minWidth: 0,
                      minHeight: 0,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      borderColor: instrumentChrome.border,
                      backgroundColor: instrumentChrome.surface,
                      color: instrumentChrome.text,
                      boxShadow: 'none',
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
                          backgroundColor: instrumentChrome.header,
                          borderBottom: `1px solid ${instrumentChrome.border}`,
                          flex: '0 0 auto',
                        }}
                      />
                    )}

                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: favourite ? alpha(instrumentChrome.accent, 0.08) : instrumentChrome.header,
                        borderBottom: `1px solid ${instrumentChrome.border}`,
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            component="h2"
                            sx={{ color: instrumentChrome.accent, fontSize: '1rem', fontWeight: 700, lineHeight: 1.4 }}
                          >
                            {instrument.name}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                            {getInstrumentTechniques(instrument).map((technique) => (
                              <Chip
                                key={technique}
                                size="small"
                                variant="outlined"
                                label={technique}
                                sx={{
                                  ...chipSx,
                                  borderColor: alpha(instrumentChrome.accent, 0.5),
                                  backgroundColor: alpha(instrumentChrome.accent, 0.08),
                                  color: instrumentChrome.accent,
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
                          size="small"
                          sx={{
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            borderRadius: 0,
                            border: `1px solid ${instrumentChrome.border}`,
                            color: favourite ? 'warning.main' : instrumentChrome.text,
                            backgroundColor: instrumentChrome.surface,
                            '&:hover': { backgroundColor: instrumentChrome.hover },
                            '&:focus-visible': {
                              outline: `2px solid ${instrumentChrome.accent}`,
                              outlineOffset: -2,
                            },
                          }}
                        >
                          {favourite ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ p: 1.5, minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          flexGrow: 1,
                          color: alpha(instrumentChrome.text, 0.78),
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
                              <Chip key={scientist} size="small" variant="outlined" label={scientist} sx={chipSx} />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No scientists listed by ISIS.
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                        borderTop: `1px solid ${instrumentChrome.border}`,
                        '& > :not(:last-child)': {
                          borderRight: { xs: 0, sm: `1px solid ${instrumentChrome.border}` },
                          borderBottom: { xs: `1px solid ${instrumentChrome.border}`, sm: 0 },
                        },
                      }}
                    >
                      <Button
                        variant="text"
                        component={RouterLink}
                        to={`/reduction-history/${instrument.name.toUpperCase()}`}
                        startIcon={<HistoryIcon />}
                        sx={actionButtonSx}
                      >
                        Reduction history
                      </Button>
                      <Button
                        variant="text"
                        component={RouterLink}
                        to={getExperimentViewerUrl({ instrument: instrument.name.toUpperCase() })}
                        startIcon={<VisibilityIcon />}
                        sx={actionButtonSx}
                      >
                        Experiment viewer
                      </Button>
                      <Button
                        variant="text"
                        href={instrument.infoPage}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<OpenInNewIcon />}
                        sx={actionButtonSx}
                      >
                        ISIS page
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Instruments;
