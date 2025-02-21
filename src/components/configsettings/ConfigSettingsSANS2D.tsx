// React components
import React from 'react';

// Material UI components
import { Box, Button } from '@mui/material';
import { UploadFile, Edit } from '@mui/icons-material';

// Local components
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';

// API base URL for SANS2D-specific requests
const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
const instrument_url = `${fiaApiUrl}/extras/sans2d`;

const ConfigSettingsSANS2D: React.FC = () => {
  // File uploader logic for SANS2D
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional SANS2D-specific elements
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

export default ConfigSettingsSANS2D;
