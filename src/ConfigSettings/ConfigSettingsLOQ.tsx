// React components
import React from 'react';

// Material UI components
import { Box, Button } from '@mui/material';
import { UploadFile, Edit } from '@mui/icons-material';

// Local data
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUpload from '../FileUpload';
import { useParams } from 'react-router-dom';

const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;

const ConfigSettingsLOQ: React.FC = () => {
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const instrument_url = `${fiaApiUrl}/extras/${instrumentName.toLowerCase()}`;
  const { response, handleFileUpload } = FileUpload(instrument_url);
  // Insert LOQ specifc buttons into the ConfigSettingsGeneral component
  return (
    <ConfigSettingsGeneral>
      <Box sx={{ mb: 2 }}>
        <Button component="label" variant="contained" startIcon={<UploadFile />}>
          Upload file...
          <input type="file" multiple hidden onChange={(event) => handleFileUpload(event)} />
        </Button>
        {/* replace with a snackbar/toastlike component */}
        {response && <pre>{JSON.stringify(response.data, null, 2)}</pre>}
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
