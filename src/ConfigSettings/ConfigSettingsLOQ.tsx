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
  // Insert LOQ specifc buttons into the ConfigSettingsGeneral component
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // File selection
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files ? event.target.files[0] : null;
    setSelectedFile(file);
    const newUploadMessage = file ? `Selected file: ${file.name}` : '';
    setUploadMessage(newUploadMessage);
  };

  // Callback for uploading the selected file
  const handleFileUpload = async (): Promise<void> => {
    if (!selectedFile) return; // Do nothing if no file selected

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await axios.post(`${instrument_url}/${selectedFile.name}`, formData);
      setUploadMessage(`Uploaded file: ${selectedFile.name}`);
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
          <input type="file" multiple hidden onChange={handleFileSelection} />
        </Button>
        {selectedFile && <Box sx={{ mt: 1 }}>{uploadMessage}</Box>}
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
