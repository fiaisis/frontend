import GridOnIcon from '@mui/icons-material/GridOn';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Tabs, Tab } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';

import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

interface ViewerTabsProps {
  activeTab: '1d' | '2d' | false;
  onTabChange: (tab: '1d' | '2d') => void;
  disabled?: boolean;
}

const ViewerTabs: React.FC<ViewerTabsProps> = ({ activeTab, onTabChange, disabled = false }): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);

  return (
    <Tabs
      value={activeTab}
      onChange={(_event: React.SyntheticEvent, newTab: '1d' | '2d') => {
        if (!disabled) {
          onTabChange(newTab);
        }
      }}
      aria-label="Experiment data view"
      variant="fullWidth"
      sx={{
        flexShrink: 0,
        height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
        minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
        boxSizing: 'border-box',
        borderBottom: `1px solid ${viewerChrome.border}`,
        backgroundColor: viewerChrome.header,
        '& .MuiTabs-list': { height: '100%' },
        '& .MuiTabs-indicator': { backgroundColor: viewerChrome.accent, height: 3 },
        '& .MuiTab-root': {
          height: '100%',
          minHeight: 0,
          borderRadius: 0,
          px: 1.5,
          py: 0.75,
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: viewerChrome.text,
          '& + .MuiTab-root': { borderLeft: `1px solid ${viewerChrome.border}` },
          '& .MuiSvgIcon-root': { color: 'inherit', fontSize: 18 },
          '&:hover': { backgroundColor: viewerChrome.hover },
          '&:focus-visible': { outline: `2px solid ${viewerChrome.accent}`, outlineOffset: -2 },
          '&.Mui-selected': { color: viewerChrome.accent, backgroundColor: alpha(viewerChrome.accent, 0.12) },
          '&.Mui-disabled': { color: alpha(viewerChrome.text, 0.42), backgroundColor: viewerChrome.header },
        },
      }}
    >
      <Tab value="1d" label="1D view" icon={<ShowChartIcon />} iconPosition="start" disabled={disabled} />
      <Tab value="2d" label="MD view" icon={<GridOnIcon />} iconPosition="start" disabled={disabled} />
    </Tabs>
  );
};

export default ViewerTabs;
