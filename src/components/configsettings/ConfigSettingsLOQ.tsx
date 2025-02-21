// React components
import React from 'react';

// Material UI components
import { Box, Button } from '@mui/material';
import { UploadFile, Edit } from '@mui/icons-material';

// Local components
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';

// API base URL for LOQ-specific requests
const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
const instrument_url = `${fiaApiUrl}/extras/loq`;

const ConfigSettingsLOQ: React.FC = () => {
  // File uploader logic for LOQ
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional LOQ-specific elements
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      {/* File upload button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button component="label" variant="contained" startIcon={<UploadFile />}>
          Upload file...
          <input type="file" multiple hidden onChange={handleFileSelection} />
        </Button>
        {/* Display upload message if a file is selected */}
        {selectedFile && <Box sx={{ mt: 1, ml: 2 }}>{uploadMessage}</Box>}
      </Box>

      {/* Change script button (currently disabled) */}
      <Box>
        <Button variant="contained" disabled startIcon={<Edit />}>
          Change script...
        </Button>
      </Box>
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsLOQ;
