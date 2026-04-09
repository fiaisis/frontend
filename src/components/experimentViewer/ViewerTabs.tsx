import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GridOnIcon from '@mui/icons-material/GridOn';

interface ViewerTabsProps {
  activeTab: '1d' | '2d';
  onTabChange: (tab: '1d' | '2d') => void;
}

const ViewerTabs: React.FC<ViewerTabsProps> = ({ activeTab, onTabChange }): JSX.Element => {
  const theme = useTheme();
  const selectedTabColor = theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.primary.main;
  const selectedTabBackground =
    theme.palette.mode === 'dark' ? alpha(theme.palette.info.light, 0.14) : alpha(theme.palette.primary.main, 0.08);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={activeTab}
        onChange={(_: React.SyntheticEvent, newTab: '1d' | '2d') => onTabChange(newTab)}
        variant="fullWidth"
        sx={{
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            backgroundColor: selectedTabColor,
          },
          '& .MuiTab-root': {
            minHeight: 52,
            textTransform: 'none',
            fontWeight: 600,
            color: theme.palette.text.secondary,
          },
          '& .MuiTab-root:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          '& .MuiTab-root.Mui-selected': {
            color: selectedTabColor,
            backgroundColor: selectedTabBackground,
          },
        }}
      >
        <Tab value="1d" label="1D view" icon={<ShowChartIcon />} iconPosition="start" />
        <Tab value="2d" label="MD view" icon={<GridOnIcon />} iconPosition="start" />
      </Tabs>
    </Box>
  );
};

export default ViewerTabs;
