import { Box, useTheme } from '@mui/material';
import React from 'react';

import { getJobTableChromeColors } from '../jobs/constants';

interface PageHeaderProps {
  breadcrumbs: React.ReactNode;
  controls?: React.ReactNode;
  separateControls?: boolean;
  status?: React.ReactNode;
  'data-testid'?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  controls,
  separateControls = false,
  status,
  'data-testid': testId,
}) => {
  const theme = useTheme();
  const chrome = getJobTableChromeColors(theme.palette.mode);
  const widgets = React.Children.toArray(controls);

  return (
    <Box
      data-testid={testId}
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, flexShrink: 0, minWidth: 0, p: 2 }}
    >
      <Box sx={{ display: 'flex', flex: '0 1 auto', minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
        {breadcrumbs}
      </Box>
      {status}
      {widgets.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            ml: 'auto',
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          {widgets.length > 0 && (
            <Box
              role="group"
              aria-label="Page controls"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: separateControls ? 1 : '1px',
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box',
                border: separateControls ? 0 : `1px solid ${chrome.border}`,
                borderRadius: 0,
                backgroundColor: separateControls ? 'transparent' : chrome.border,
                color: chrome.text,
              }}
            >
              {widgets.map((widget, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexGrow: 1,
                    minWidth: 0,
                    maxWidth: '100%',
                    backgroundColor: chrome.surface,
                    border: separateControls ? `1px solid ${chrome.border}` : 0,
                  }}
                >
                  {widget}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
