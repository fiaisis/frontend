import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GridOnIcon from '@mui/icons-material/GridOn';

interface ViewerTabsProps {
  activeTab: '1d' | '2d';
  onTabChange: (tab: '1d' | '2d') => void;
}

const ViewerTabs: React.FC<ViewerTabsProps> = ({ activeTab, onTabChange }): JSX.Element => {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={activeTab} onChange={(_, newTab) => onTabChange(newTab)} variant="fullWidth">
        <Tab value="1d" label="1D View" icon={<ShowChartIcon />} iconPosition="start" />
        <Tab value="2d" label="2D View" icon={<GridOnIcon />} iconPosition="start" />
      </Tabs>
    </Box>
  );
};

export default ViewerTabs;
