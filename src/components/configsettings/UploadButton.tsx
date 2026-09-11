import { Edit, UploadFile } from '@mui/icons-material';
import { Box, Button, Typography, useTheme } from '@mui/material';
import React from 'react';

import { getJobTableChromeColors } from '../jobs/constants';

const UploadButton: React.FC<{
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  uploadMessage: string;
}> = ({ onChange, selectedFile, uploadMessage }) => {
  const theme = useTheme();
  const configChrome = getJobTableChromeColors(theme.palette.mode);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button
          component="label"
          variant="outlined"
          size="small"
          startIcon={<UploadFile />}
          sx={{
            color: configChrome.accent,
            borderColor: configChrome.border,
            '&:hover': { borderColor: configChrome.accent, backgroundColor: configChrome.hover },
          }}
        >
          Upload file
          <input type="file" multiple hidden onChange={onChange} />
        </Button>
        <Button variant="outlined" size="small" disabled startIcon={<Edit />}>
          Edit script
        </Button>
      </Box>
      {/* Display upload message if a file is selected */}
      {selectedFile && (
        <Typography variant="body2" role="status" sx={{ overflowWrap: 'anywhere' }}>
          {uploadMessage}
        </Typography>
      )}
    </Box>
  );
};

export default UploadButton;
