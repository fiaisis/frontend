// React components
import * as React from 'react';
import { Link as RouterLink } from 'react-router-dom';

// Material UI components
import { Box, Button, Collapse, IconButton, Link, List, ListItem, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';

// Local data
import { instruments } from '../lib/InstrumentData';
import NavArrows from '../components/navigation/Breadcrumbs';

const Instruments: React.FC = () => {
  const theme = useTheme();
  // State for tracking expanded instruments
  const [expandedIds, setExpandedIds] = React.useState<number[]>([]);
  // State for tracking favorite instruments
  const [favoriteIds, setFavoriteIds] = React.useState<number[]>([]);

  // Load favorites from local storage
  React.useEffect(() => {
    const storedFavorites = localStorage.getItem('favoriteInstruments');
    if (storedFavorites) {
      setFavoriteIds(JSON.parse(storedFavorites));
    }
  }, []);

  // Save favorites to local storage whenever they change
  React.useEffect(() => {
    localStorage.setItem('favoriteInstruments', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  // Toggle expansion state of an instrument
  const handleToggleExpand = (id: number, event?: React.MouseEvent): void => {
    if (event) {
      event.stopPropagation();
    }
    setExpandedIds((prevExpandedIds) =>
      prevExpandedIds.includes(id)
        ? prevExpandedIds.filter((expandedId) => expandedId !== id)
        : [...prevExpandedIds, id]
    );
  };

  // Toggle favorite state of an instrument
  const handleToggleFavorite = (id: number, event: React.MouseEvent): void => {
    event.stopPropagation();
    setFavoriteIds((prevFavoriteIds) =>
      prevFavoriteIds.includes(id)
        ? prevFavoriteIds.filter((favoriteId) => favoriteId !== id)
        : [...prevFavoriteIds, id]
    );
  };

  // Sort instruments based on favorite status
  const sortedInstruments = [...instruments].sort((a, b) => {
    if (favoriteIds.includes(a.id) && !favoriteIds.includes(b.id)) {
      return -1;
    }
    if (!favoriteIds.includes(a.id) && favoriteIds.includes(b.id)) {
      return 1;
    }
    return 0;
  });

  return (
    <>
      <NavArrows />
      {/* <Box>
        <Button>
          <NavArrows
            homeElement={'Home'}
            separator={<span> {'>'} </span>}
            activeClasses=""
            containerClasses=""
            listClasses=""
            capitaliseLinks
          />
        </Button>
      </Box> */}
      {/* Page title */}
      <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary, padding: '20px' }}>
        ISIS instruments
      </Typography>
      <Box sx={{ paddingBottom: '2rem' }}>
        {sortedInstruments.map((instrument) => (
          <Box
            key={instrument.id}
            sx={{ marginBottom: 1, marginLeft: 2, marginRight: 2 }}
            onClick={() => handleToggleExpand(instrument.id)}
          >
            <Box
              sx={{
                padding: '12px 16px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                backgroundColor: expandedIds.includes(instrument.id)
                  ? theme.palette.action.hover
                  : theme.palette.background.paper,
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  {/* Expand button */}
                  <IconButton
                    aria-expanded={expandedIds.includes(instrument.id)}
                    aria-label="show more"
                    onClick={(event) => handleToggleExpand(instrument.id, event)}
                  >
                    <ExpandMoreIcon
                      style={{ transform: expandedIds.includes(instrument.id) ? 'rotate(180deg)' : 'none' }}
                    />
                  </IconButton>
                  <Box sx={{ marginLeft: 2 }}>
                    {/* Instrument name and type */}
                    <Typography
                      variant="h6"
                      component="h1"
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                      }}
                    >
                      {instrument.name}
                    </Typography>
                    <Typography sx={{ color: theme.palette.text.primary }} variant="body1">
                      {instrument.type}
                    </Typography>
                  </Box>
                </Box>
                {/* Favorite button */}
                <IconButton
                  aria-label="add to favorites"
                  onClick={(event) => handleToggleFavorite(instrument.id, event)}
                >
                  {favoriteIds.includes(instrument.id) ? (
                    <StarIcon style={{ color: theme.palette.warning.main }} />
                  ) : (
                    <StarBorderIcon />
                  )}
                </IconButton>
              </Box>
              <Collapse in={expandedIds.includes(instrument.id)} timeout="auto" unmountOnExit>
                <Box marginTop={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    {/* Instrument description */}
                    <Typography
                      variant="body2"
                      component={'p'}
                      sx={{ flex: 2, marginRight: 2, color: theme.palette.text.primary, textAlign: 'justify' }}
                    >
                      {instrument.description}
                    </Typography>
                    <Box sx={{ flex: 1, marginLeft: 4 }}>
                      {/* List of associated scientists */}
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                        Scientists:
                      </Typography>
                      <List>
                        {instrument.scientists.map((scientist) => (
                          <ListItem key={scientist} style={{ padding: '0', color: theme.palette.text.primary }}>
                            <Typography variant="body2">Dr. {scientist}</Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                  {/* Link to more information */}
                  <Link href={instrument.infoPage} target="_blank" rel="noopener" underline="always">
                    {instrument.infoPage}
                  </Link>
                  <Box marginTop={2}>
                    {/* Button to view reduction history */}
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to={`/reduction-history/${instrument.name.toUpperCase()}`}
                    >
                      Reduction history
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          </Box>
        ))}
      </Box>
    </>
  );
};

export default Instruments;
