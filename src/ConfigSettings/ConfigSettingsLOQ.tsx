// React components
import React from 'react';

// Material UI components
import { Box, Button } from '@mui/material';
import { UploadFile, Edit } from '@mui/icons-material';
import useFetchData from '../useFetchData';
// Local data
import ConfigSettingsGeneral from './ConfigSettingsGeneral';

const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;

const ConfigSettingsLOQ: React.FC = () => {
  const { data, loading, fetchData } = useFetchData(`${fiaApiUrl}/extras`);
  // Insert LOQ specifc buttons into the ConfigSettingsGeneral component
  return (
    <ConfigSettingsGeneral>
      {/* Upload file button -- disabled for now */}
      <Box sx={{ mb: 2 }}>
        <Button component="label" variant="contained" disabled startIcon={<UploadFile />}>
          Upload file...
          <input type="file" multiple hidden onChange={(event) => console.log(event.target.files)} />
        </Button>
        <Button component="label" variant="contained" onClick={fetchData}>
          View extras...
        </Button>
        {loading && <p>Loading...</p>}
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
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
