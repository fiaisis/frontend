import { HomeOutlined, NavigateNext } from '@mui/icons-material';
import { Breadcrumbs, Typography, Link as MuiLink, breadcrumbsClasses, Theme } from '@mui/material';
import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';

import { getJobTableChromeColors } from '../jobs/constants';

interface NavArrowsProps {
  trailingCrumb?: React.ReactNode;
  replaceLastCrumb?: boolean;
  replaceLastCrumbCount?: number;
  labelOverrides?: Record<string, string>;
  onCrumbClick?: (destination: string) => void;
}

const NavArrows: React.FC<NavArrowsProps> = ({
  trailingCrumb,
  replaceLastCrumb = false,
  replaceLastCrumbCount,
  labelOverrides,
  onCrumbClick,
}) => {
  const url = useLocation();
  const path = url.pathname;

  if (path === '/') return null;

  const pathSegments = path.split('/').filter(Boolean);
  const pathsList = ['FIA', ...pathSegments.map((s) => decodeURIComponent(s))];
  const crumbsToReplace = trailingCrumb ? (replaceLastCrumbCount ?? (replaceLastCrumb ? 1 : 0)) : 0;
  const displayPathsList = crumbsToReplace > 0 ? pathsList.slice(0, -crumbsToReplace) : pathsList;
  const trailingCrumbs = React.Children.toArray(trailingCrumb);

  return (
    <>
      <Breadcrumbs
        aria-label="breadcrumb"
        separator={<NavigateNext aria-hidden="true" fontSize="small" />}
        sx={(theme: Theme) => {
          const tableChrome = getJobTableChromeColors(theme.palette.mode);
          const breadcrumbItemSelector = `& .${breadcrumbsClasses.li} > a, & .${breadcrumbsClasses.li} > p, & .${breadcrumbsClasses.li} > .breadcrumb-control`;

          return {
            display: 'inline-flex',
            width: 'max-content',
            minWidth: 'min-content',
            minHeight: 40,
            marginTop: theme.spacing(2),
            marginLeft: theme.spacing(2),
            border: `1px solid ${tableChrome.border}`,
            borderRadius: 0,
            backgroundColor: tableChrome.surface,
            color: tableChrome.text,
            boxShadow: `inset 0 1px 0 ${tableChrome.border}`,
            [`& .${breadcrumbsClasses.ol}`]: {
              flexWrap: 'nowrap',
              alignItems: 'stretch',
            },
            [`& .${breadcrumbsClasses.li}`]: {
              display: 'flex',
              alignItems: 'stretch',
            },
            [breadcrumbItemSelector]: {
              display: 'inline-flex',
              minWidth: 0,
              minHeight: 40,
              boxSizing: 'border-box',
              alignItems: 'center',
              gap: 0.75,
              padding: theme.spacing(0.5, 1.5),
              border: 0,
              borderRadius: 0,
              color: tableChrome.text,
              backgroundColor: tableChrome.surface,
              font: 'inherit',
              fontSize: theme.typography.pxToRem(14),
              fontWeight: 500,
              lineHeight: 1.25,
              textAlign: 'left',
              textDecoration: 'none',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
                duration: theme.transitions.duration.shortest,
              }),
            },
            [`& .${breadcrumbsClasses.li} > a, & .${breadcrumbsClasses.li} > button.breadcrumb-control`]: {
              color: tableChrome.accent,
              '&:hover': {
                backgroundColor: tableChrome.hover,
                color: tableChrome.accent,
                textDecoration: 'none',
              },
              '&:active': {
                backgroundColor: tableChrome.header,
              },
              '&:focus-visible': {
                outline: `2px solid ${tableChrome.accent}`,
                outlineOffset: -2,
              },
            },
            [`& .${breadcrumbsClasses.li} > .breadcrumb-current`]: {
              backgroundColor: tableChrome.header,
              color: tableChrome.text,
              fontWeight: 700,
              boxShadow: `inset 0 -3px 0 ${tableChrome.accent}`,
            },
            [`& .${breadcrumbsClasses.li} > .breadcrumb-control`]: {
              '& .MuiButton-endIcon': {
                color: tableChrome.accent,
              },
            },
            [`& .${breadcrumbsClasses.separator}`]: {
              display: 'flex',
              minWidth: 28,
              margin: 0,
              padding: theme.spacing(0, 0.5),
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: `1px solid ${tableChrome.border}`,
              borderRight: `1px solid ${tableChrome.border}`,
              backgroundColor: tableChrome.header,
              color: tableChrome.border,
              '& svg': {
                fontSize: 18,
              },
            },
          };
        }}
      >
        {displayPathsList.map((label, index) => {
          const isLast = index === displayPathsList.length - 1 && !trailingCrumb;
          label = labelOverrides?.[label] ?? labelOverrides?.[label.toLowerCase()] ?? label;
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
          if (isLast) {
            return (
              <Typography className="breadcrumb-current" aria-current="page" key={index}>
                {label}
              </Typography>
            );
          }
          const destination = `/${pathsList.slice(1, index + 1).join('/')}`;
          return (
            <MuiLink
              component={RouterLink}
              underline="hover"
              to={destination}
              onClick={() => onCrumbClick?.(destination)}
              key={index}
            >
              {index === 0 && <HomeOutlined aria-hidden="true" sx={{ flexShrink: 0, fontSize: 18 }} />}
              <span>{label}</span>
            </MuiLink>
          );
        })}
        {trailingCrumbs}
      </Breadcrumbs>
    </>
  );
};

export default NavArrows;
