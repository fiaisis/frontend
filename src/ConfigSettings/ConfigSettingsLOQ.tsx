// React components
import React from 'react';

// Material UI components
import { Box, Button } from '@mui/material';
import { UploadFile, Edit } from '@mui/icons-material';

// Local data
import ConfigSettingsGeneral from './ConfigSettingsGeneral';

const ConfigSettingsLOQ: React.FC = () => {
  // Insert LOQ specifc buttons into the ConfigSettingsGeneral component
  return (
    <ConfigSettingsGeneral>
      {/* Upload file button -- disabled for now */}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" disabled startIcon={<UploadFile />}>
          Upload file...
        </Button>
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
