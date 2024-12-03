// React components
import React, { useState } from 'react';

// Material UI components
import { Box, Button } from '@mui/material';
import { UploadFile, Edit } from '@mui/icons-material';

// Local data
import axios from 'axios';
import ConfigSettingsGeneral from './ConfigSettingsGeneral';

const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;

const ConfigSettingsLOQ: React.FC = () => {
  const instrument_url = `${fiaApiUrl}/extras/loq`;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Insert LOQ specifc buttons into the ConfigSettingsGeneral component

  // File selection
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files ? event.target.files[0] : null;
    setSelectedFile(file);
  };

  // Callback for uploading the selected file
  const handleFileUpload = async (): Promise<void> => {
    if (!selectedFile) return; // Do nothing if no file selected

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await axios.post(`${instrument_url}/${selectedFile.name}`, formData);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload the file');
    }
  };

  return (
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <Box sx={{ mb: 2 }}>
        <Button component="label" variant="contained" startIcon={<UploadFile />}>
          Upload file...
          <input type="file" multiple hidden onChange={(event) => handleFileSelection(event)} />
        </Button>
        {selectedFile && (
          // Make this message dynamic?
          <Box sx={{ mt: 1 }}>
            Selected file: <strong>{selectedFile.name}</strong>
          </Box>
        )}
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
