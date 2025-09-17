import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs, Typography, Link as MuiLink, styled, breadcrumbsClasses } from '@mui/material';

const StyledNavArrows = styled(Breadcrumbs)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  '& li': {
    '& a, p': {
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.light,
      display: 'block',
      textDecoration: 'none',
      position: 'relative',

      /* Positions breadcrumb */
      lineHeight: '28px',
      padding: '0 4px 0 14px',
      textAlign: 'center',

      /* Add the arrow between breadcrumbs */
      '&:after': {
        content: '""',
        position: 'absolute',
        top: '3px',
        // half the width/height
        right: '-11px',
        // width/height same as lineHeight - 2* top height
        height: '22px',
        width: '22px',
        // change skew to alter how shallow the arrow is
        transform: 'scale(0.707) rotate(45deg) skew(15deg,15deg)',
        zIndex: 1,
        boxShadow: `2px -2px 0 2px ${theme.palette.background.default}`,
        borderRadius: ' 0 5px 0 50px',
        backgroundColor: theme.palette.primary.light,
      },
      '&:hover': {
        backgroundColor: `${theme.palette.primary.light} !important`,
        '&:after': {
          backgroundColor: `${theme.palette.primary.light} !important`,
        },
      },
      '&:active': {
        backgroundColor: `${theme.palette.grey[600]} !important`,
        '&:after': {
          backgroundColor: `${theme.palette.grey[600]} !important`,
        },
      },
    },
  },
  /* Every even breadcrumb has a darker background */
  '& li:nth-of-type(4n + 3)': {
    '& a, p': {
      backgroundColor: theme.palette.primary.main,
      '&:after': {
        backgroundColor: theme.palette.primary.main,
      },
    },
  },
  '& li:first-of-type': {
    '& a, p': {
      paddingLeft: '14px',
    },
  },
  '& li:last-of-type': {
    '& a, p': {
      /* Curve the last breadcrumb border */
      borderRadius: '0 5px 5px 0',
      paddingLeft: '14px',
      '&:after': {
        content: 'none',
      },
    },
  },

  /* Control the width and shortening of text */
  '& span': {
    display: 'block',
    whiteSpace: 'nowrap',
    // TODO: Remove use of "vw" here?
    maxWidth: '20vw',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  [`& .${breadcrumbsClasses.separator}`]: {
    marginLeft: 0,
    marginRight: 0,
  },
}));

const NavArrows: React.FC = () => {
  const url = useLocation();
  const path = url.pathname;

  if (path === '/') return null;

  const pathSegments = path.split('/').filter(Boolean);
  const pathsList = ['fia', ...pathSegments.map((s) => decodeURIComponent(s))];

  return (
    <StyledNavArrows>
      <Breadcrumbs aria-label="breadcrumb">
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
            <StyledNavArrows key="">
              <MuiLink component={RouterLink} underline="hover" to={destination} key={index}>
                {label}
              </MuiLink>
            </StyledNavArrows>
          );
        })}
      </Breadcrumbs>
    </StyledNavArrows>
  );
};

export default NavArrows;
