import GridOnIcon from '@mui/icons-material/GridOn';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Tabs, Tab, Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';

interface ViewerTabsProps {
  activeTab: '1d' | '2d';
  onTabChange: (tab: '1d' | '2d') => void;
  disabled?: boolean;
}

const ViewerTabs: React.FC<ViewerTabsProps> = ({ activeTab, onTabChange, disabled = false }): JSX.Element => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        px: 1,
        py: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_event: React.SyntheticEvent, newTab: '1d' | '2d') => {
          if (!disabled) {
            onTabChange(newTab);
          }
        }}
        variant="fullWidth"
        sx={{
          minHeight: 0,
          p: 0.5,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.05),
          '& .MuiTabs-flexContainer': {
            gap: 1,
          },
          '& .MuiTabs-indicator': {
            display: 'none',
          },
        }}
      >
        <Tab
          value="1d"
          label="1D view"
          icon={<ShowChartIcon />}
          iconPosition="start"
          disabled={disabled}
          sx={{
            minHeight: 42,
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.secondary',
            transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
            '& .MuiSvgIcon-root': {
              color: 'inherit',
            },
            '&:hover': {
              bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.06),
            },
            '&.Mui-selected': {
              color: theme.palette.primary.contrastText,
              bgcolor: theme.palette.primary.main,
              boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.24)}, 0 6px 16px ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.4 : 0.18
              )}`,
            },
            '&.Mui-disabled': {
              color: 'text.disabled',
              bgcolor: 'action.disabledBackground',
              boxShadow: 'none',
            },
          }}
        />
        <Tab
          value="2d"
          label="MD view"
          icon={<GridOnIcon />}
          iconPosition="start"
          disabled={disabled}
          sx={{
            minHeight: 42,
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.secondary',
            transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
            '& .MuiSvgIcon-root': {
              color: 'inherit',
            },
            '&:hover': {
              bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.06),
            },
            '&.Mui-selected': {
              color: theme.palette.primary.contrastText,
              bgcolor: theme.palette.primary.main,
              boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.24)}, 0 6px 16px ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.4 : 0.18
              )}`,
            },
            '&.Mui-disabled': {
              color: 'text.disabled',
              bgcolor: 'action.disabledBackground',
              boxShadow: 'none',
            },
          }}
        />
      </Tabs>
    </Box>
  );
};

export default ViewerTabs;
