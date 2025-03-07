import React from 'react';
import { Box, Button } from '@mui/material';
import { Edit, UploadFile } from '@mui/icons-material';

const UploadButton: React.FC<{
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  uploadMessage: string;
}> = ({ onChange, selectedFile, uploadMessage }) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button component="label" variant="contained" startIcon={<UploadFile />}>
          Select file to upload...
          <input type="file" multiple hidden onChange={onChange} />
        </Button>
        {/* Display upload message if a file is selected */}
        {selectedFile && <Box sx={{ mt: 1, ml: 2 }}>{uploadMessage}</Box>}
      </Box>
      <Box>
        <Button variant="contained" disabled startIcon={<Edit />}>
          Change script...
        </Button>
      </Box>
    </>
  );
};

export default UploadButton;
