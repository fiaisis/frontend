import { Breadcrumbs, Typography, Link as MuiLink, breadcrumbsClasses, Theme } from '@mui/material';
import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';

interface NavArrowsProps {
  trailingCrumb?: React.ReactNode;
  replaceLastCrumb?: boolean;
  replaceLastCrumbCount?: number;
}

const NavArrows: React.FC<NavArrowsProps> = ({ trailingCrumb, replaceLastCrumb = false, replaceLastCrumbCount }) => {
  const url = useLocation();
  const path = url.pathname;

  if (path === '/') return null;

  const pathSegments = path.split('/').filter(Boolean);
  const pathsList = ['FIA', ...pathSegments.map((s) => decodeURIComponent(s))];
  const crumbsToReplace = trailingCrumb ? (replaceLastCrumbCount ?? (replaceLastCrumb ? 1 : 0)) : 0;
  const displayPathsList = crumbsToReplace > 0 ? pathsList.slice(0, -crumbsToReplace) : pathsList;

  return (
    <>
      <Breadcrumbs
        aria-label="breadcrumb"
        separator=""
        sx={(theme: Theme) => ({
          marginTop: theme.spacing(2),
          marginLeft: theme.spacing(2),
          backgroundColor: theme.palette.background.default,
          '& li': {
            '& a, p, .breadcrumb-control': {
              color: theme.palette.primary.contrastText,
              backgroundColor: theme.palette.primary.light,
              display: 'block',
              textDecoration: 'none',
              position: 'relative',

              /* Positions breadcrumb */
              lineHeight: '32px',
              padding: '4px 10px 4px 20px',
              textAlign: 'center',

              /* Add the arrow between breadcrumbs */
              '&:after': {
                content: '""',
                position: 'absolute',
                top: '6px',
                right: '-14px',
                height: '28px',
                width: '28px',
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
            '& a, p, .breadcrumb-control': {
              backgroundColor: theme.palette.primary.main,
              '&:after': {
                backgroundColor: theme.palette.primary.main,
              },
            },
          },
          '& li:first-of-type': {
            '& a, p, .breadcrumb-control': {
              paddingLeft: '18px',
            },
          },
          '& li:last-of-type': {
            '& a, p, .breadcrumb-control': {
              /* Curve the last breadcrumb border */
              borderRadius: '0 5px 5px 0',
              paddingLeft: '18px',
              '&:after': {
                content: 'none',
              },
            },
          },
          '& li .breadcrumb-control': {
            display: 'inline-flex',
            alignItems: 'center',
          },

          /* Control the width and shortening of text */
          '& a span, & p span, & .breadcrumb-control > span:not(.MuiButton-endIcon)': {
            display: 'block',
            whiteSpace: 'nowrap',
            maxWidth: '20vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          [`& .${breadcrumbsClasses.separator}`]: {
            marginLeft: 0,
            marginRight: 0,
          },
        })}
      >
        {displayPathsList.map((label, index) => {
          const isLast = index === displayPathsList.length - 1 && !trailingCrumb;
          if (label === 'isis-instruments' || label === 'instruments') {
            label = 'ISIS instruments';
          }
          if (label === 'reduction-history') {
            label = 'Reduction history';
          }
          if (label === 'experiment-viewer') {
            label = 'Experiment viewer';
          }
          if (label === 'live-data') {
            label = 'Live data';
          }
          if (label === 'edit-script') {
            label = 'Edit script';
          }
          const valueEditorRegex = /^value-editor-(\d+)$/i;
          if (valueEditorRegex.test(label)) {
            label = 'Value editor';
          }
          const experimentViewerRegex = /^experiment-viewer-(\d+)$/i;
          if (experimentViewerRegex.test(label)) {
            label = 'Experiment viewer';
          }
          if (isLast) {
            return (
              <Typography color="text.primary" key={index}>
                {label}
              </Typography>
            );
          }
          const destination = `/${pathsList.slice(1, index + 1).join('/')}`;
          return (
            <MuiLink component={RouterLink} underline="hover" to={destination} key={index}>
              {label}
            </MuiLink>
          );
        })}
        {trailingCrumb}
      </Breadcrumbs>
    </>
  );
};

export default NavArrows;
