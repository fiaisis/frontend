// React imports
import SearchIcon from '@mui/icons-material/Search';
// Material UI imports
import { alpha, Avatar, Box, Button, Paper, styled, Typography, useMediaQuery, useTheme } from '@mui/material';
import Grid from '@mui/material/Grid2';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// Local data
import BackgroundImage from '../images/background.jpg';
import Decal1Image from '../images/decal1.svg';
import Decal2Image from '../images/decal2.svg';
import Decal2DarkImage from '../images/decal2-dark.svg';
import Decal2DarkHCImage from '../images/decal2-darkhc.svg';
import FacilityImage from '../images/facility.jpg';
import GreenSwirl1Image from '../images/green-swirl1.png';
import GreenSwirl2Image from '../images/green-swirl2.png';

const backgroundTitleStyles = {
  color: '#FFFFFF',
  margin: 'auto',
  fontSize: '48px',
  fontWeight: 'lighter',
  textAlign: 'center',
};

const backgroundTitleStylesMobile = {
  ...backgroundTitleStyles,
  fontSize: '32px',
  marginLeft: '8px',
  marginRight: '8px',
};

const paperStyles = {
  borderRadius: '4px',
  marginBottom: 2,
  height: '100%',
  width: '100%',
};

const avatarStyles = {
  backgroundColor: '#1E5DF8',
  color: '#FFFFFF',
  width: '60px',
  height: '60px',
  marginBottom: 2,
};

const paperContentStyles = {
  padding: 2,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  height: '100%',
  boxSizing: 'border-box',
};

const avatarIconStyles = {
  transform: 'scale(1.75)',
};

const PaperHeading = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '24px',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  color: (theme as any).colours?.homePage?.heading,
  marginBottom: theme.spacing(2),
}));

const PaperDescription = styled(Typography)(({ theme }) => ({
  textAlign: 'left',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  color: (theme as any).colours?.contrastGrey,
  marginBottom: theme.spacing(2),
}));

const BluePaperHeading = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '24px',
  color: '#FFFFFF',
  marginBottom: theme.spacing(2),
}));

const BluePaperDescription = styled(Typography)(({ theme }) => ({
  textAlign: 'left',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  color: (theme as any).colours?.homePage?.blueDescription,
  marginBottom: theme.spacing(2),
}));

interface BrowseDecalProps {
  decal2Image: string;
  decal2DarkImage: string;
  decal2DarkHCImage: string;
}

const BrowseDecal = styled('div', {
  shouldForwardProp: (prop) => prop !== 'decal2Image' && prop !== 'decal2DarkImage' && prop !== 'decal2DarkHCImage',
})<BrowseDecalProps>(({ theme, decal2Image, decal2DarkImage, decal2DarkHCImage }) => ({
  backgroundImage:
    theme.palette.mode === 'light'
      ? `url(${decal2Image})`
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (theme as any).colours?.type === 'default'
        ? `url(${decal2DarkImage})`
        : `url(${decal2DarkHCImage})`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'top left',
  backgroundSize: 'auto 100%',
  height: '100%',
}));

const LightBlueButton = styled(Button)(({ theme }) => ({
  color: '#FFFFFF',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backgroundColor: (theme as any).colours?.homePage?.blueButton,
  '&:hover': {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    backgroundColor: (theme as any).colours?.homePage?.blueButton
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alpha((theme as any).colours?.homePage?.blueButton, 0.8)
      : '#FFFFFF',
  },
}));

const HomePage = (): React.ReactElement => {
  const [t] = useTranslation();
  const theme = useTheme();
  const isViewportMdOrLager = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <div id="fia-homepage">
      <div
        style={{
          backgroundImage: `url(${BackgroundImage})`,
          backgroundPosition: 'center 40%',
          width: '100%',
          height: 250,
        }}
      >
        <div
          style={{
            backgroundImage: `url(${GreenSwirl1Image}), url(${Decal1Image})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top left, top right',
            width: '100%',
            height: 250,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              left: '50%',
              top: '45px',
              transform: 'translate(-50%)',
            }}
          >
            <Typography variant="h2" sx={isViewportMdOrLager ? backgroundTitleStyles : backgroundTitleStylesMobile}>
              <Trans i18nKey="home-page.title_line1">
                <strong>Data reduction</strong> and <strong>processing</strong>
              </Trans>
            </Typography>
            <Typography variant="h2" sx={isViewportMdOrLager ? backgroundTitleStyles : backgroundTitleStylesMobile}>
              <Trans i18nKey="home-page.title_line2">
                for <strong>large-scale</strong> science facilities
              </Trans>
            </Typography>
          </Box>
        </div>
      </div>
      <Box
        sx={{
          transform: 'translate(0px, -20px)',
          marginLeft: isViewportMdOrLager ? '8%' : '8px',
          marginRight: isViewportMdOrLager ? '8%' : '8px',
        }}
      >
        <Paper sx={paperStyles} elevation={1}>
          <Grid container style={{ height: '100%' }}>
            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <Box sx={paperContentStyles}>
                <Typography
                  variant="h3"
                  sx={(theme) => ({
                    fontWeight: 'bold',
                    fontSize: '32px',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    color: (theme as any).colours?.homePage?.heading,
                    marginBottom: theme.spacing(2),
                  })}
                >
                  {t('Reduce and perform basic analysis remotely from a clean web interface')}
                </Typography>
                <PaperDescription variant="body1">
                  {t(
                    'Large scale facilities, such as synchrotrons, neutron and muon sources, lasers and accelerators, generate vast amounts of data that need to be managed in an efficient way, supporting data ingestion for long-term storage and archival, as well as data analysis and data publication workflows.'
                  )}
                </PaperDescription>
                <PaperDescription variant="body1">
                  <Trans i18nKey="home-page.browse.description2">
                    <strong>Flexible Interactive Automation</strong> focuses on providing scientists an interface to
                    perform automatic reductions for beamline instruments from the web.
                  </Trans>
                </PaperDescription>
                <Box marginTop="16px">
                  <Button
                    color="primary"
                    variant="contained"
                    component={Link}
                    to={t('instruments')}
                    data-testid="browse-button"
                  >
                    {t('Browse instruments')}
                  </Button>
                </Box>
              </Box>
            </Grid>
            {isViewportMdOrLager && (
              <Grid
                size={{
                  md: 6,
                }}
              >
                <div
                  style={{
                    backgroundImage: `url(${FacilityImage})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'bottom right',
                    backgroundSize: 'cover',
                    width: '100%',
                    height: '100%',
                    borderRadius: '4px',
                  }}
                >
                  <BrowseDecal
                    decal2Image={Decal2Image}
                    decal2DarkImage={Decal2DarkImage}
                    decal2DarkHCImage={Decal2DarkHCImage}
                  />
                </div>
              </Grid>
            )}
          </Grid>
        </Paper>
        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              md: 4,
            }}
          >
            <Paper sx={paperStyles} elevation={1}>
              <Box sx={paperContentStyles}>
                <Avatar sx={avatarStyles}>
                  <SearchIcon sx={avatarIconStyles} />
                </Avatar>
                <PaperHeading variant="h4">{t('ISIS instruments')}</PaperHeading>
                <PaperDescription variant="body1">
                  {t("Browse a list of ISIS Neutron and Muon Source's instruments.")}
                </PaperDescription>
                <Box marginTop="auto">
                  <Button
                    color="primary"
                    variant="contained"
                    component={Link}
                    to={t('instruments')}
                    data-testid="browse-button"
                  >
                    {t('Browse instruments')}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 4,
            }}
          >
            <Paper sx={paperStyles} elevation={1}>
              <Box sx={paperContentStyles}>
                <Avatar sx={avatarStyles}>
                  <SearchIcon sx={avatarIconStyles} />
                </Avatar>
                <PaperHeading variant="h4">{t('Historic reductions')}</PaperHeading>
                <PaperDescription variant="body1">
                  {t('Browse a list of interactable reductions performed on this platform.')}
                </PaperDescription>
                <Box marginTop="auto">
                  <Button
                    color="primary"
                    variant="contained"
                    component={Link}
                    to={t('reduction-history/ALL')}
                    data-testid="browse-button"
                  >
                    {t('Browse reductions')}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 4,
            }}
          >
            <Paper sx={{ ...paperStyles, backgroundColor: '#003088' }} elevation={1}>
              <div
                style={{
                  backgroundImage: `url(${GreenSwirl2Image})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'top right',
                  backgroundSize: 'auto 100%',
                  height: '100%',
                }}
              >
                <Box sx={paperContentStyles}>
                  <BluePaperHeading variant="h4">{t('ISIS Neutron and Muon Source')}</BluePaperHeading>
                  <BluePaperDescription variant="body1">
                    {t(
                      'World-leading centre for research giving unique insights into the properties of materials on the atomic scale.'
                    )}
                  </BluePaperDescription>
                  <Box marginTop="auto">
                    <LightBlueButton
                      color="primary"
                      variant="contained"
                      href={t('https://www.isis.stfc.ac.uk/Pages/About.aspx')}
                      data-testid="facility-button"
                    >
                      {t('Read more')}
                    </LightBlueButton>
                  </Box>
                </Box>
              </div>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
};

export default HomePage;
