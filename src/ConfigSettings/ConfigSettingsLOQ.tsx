// React components
import React from 'react';

// Material UI components
import { Box, Button } from '@mui/material';
import { UploadFile, Edit } from '@mui/icons-material';

// Local data
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';

const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
const instrument_url = `${fiaApiUrl}/extras/loq`;
const ConfigSettingsLOQ: React.FC = () => {
  // Insert LOQ specifc buttons into the ConfigSettingsGeneral component
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);
  return (
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button component="label" variant="contained" startIcon={<UploadFile />}>
          Upload file...
          <input type="file" multiple hidden onChange={handleFileSelection} />
        </Button>
        {selectedFile && <Box sx={{ mt: 1, ml: 2 }}>{uploadMessage}</Box>}
      </Box>

      {/* Change script button -- disabled for now */}
      <Box>
        <Button variant="contained" disabled startIcon={<Edit />}>
          Change script...
        </Button>
      </Box>
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsLOQ;
