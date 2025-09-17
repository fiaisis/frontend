import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Box, Typography, Link as MuiLink, Button, ButtonGroup } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const NavArrows: React.FC = () => {
  const url = useLocation();
  const path = url.pathname;

  if (path === '/') return null;

  const pathSegments = path.split('/').filter(Boolean);
  const pathsList = ['fia', ...pathSegments.map((s) => decodeURIComponent(s))];

  return (
    <ButtonGroup>
      <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextIcon fontSize="medium" />}>
        {pathsList.map((label, index) => {
          const isLast = index === pathsList.length - 1;
          console.log(index, label);
          if (isLast) {
            console.log(index, label);
            return (
              <Typography color="text.primary" key={index}>
                {label}
              </Typography>
            );
          }
          const destination = `/${pathsList.slice(1, index + 1).join('/')}`;
          console.log(index, label);
          return (
            <>
              <Box>
                <Button variant="contained" color="primary">
                  <MuiLink component={RouterLink} underline="hover" to={destination} key={index}>
                    {label}
                  </MuiLink>
                </Button>
              </Box>
            </>
          );
        })}
      </Breadcrumbs>
    </ButtonGroup>
  );
};

export default NavArrows;
