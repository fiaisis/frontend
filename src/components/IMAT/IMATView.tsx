import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

// Shows the latest NDXIMAT image (placeholder for now)
const IMATView: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 640,
        width: '100%',
      }}
    >
      <Typography variant="h6" color={theme.palette.text.primary}>
        This page is under construction. An IMAT viewer will be rendered here
      </Typography>
    </Box>
  );
};

export default IMATView;
