// React components
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Material UI components
import { Box, Button, Typography, Tabs, Tab, useTheme, Grid, Tooltip, IconButton } from '@mui/material';
import { Info, UploadFile, Edit } from '@mui/icons-material';

// Monaco components
import MonacoEditor from '@monaco-editor/react';

const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }): JSX.Element => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3, height: 'calc(85vh - 48px - 48px - 24px)' }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number): { id: string; 'aria-controls': string } => ({
  id: `tab-${index}`,
  'aria-controls': `tabpanel-${index}`,
});

const ConfigSettings: React.FC = () => {
  const theme = useTheme();
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const [reductionStatus, setReductionStatus] = useState<'ON' | 'OFF'>('ON');
  const [jsonContent, setJsonContent] = useState(`{
      "instrumentName": "MARI",
      "settings": {
        "algorithm": "levmar",
        "fit": "gaussian",
        "color_map": "veridis"
      }
    }`);
  const [tabValue, setTabValue] = useState(0);

  // Fetch the current specification and set the reduction status
  useEffect(() => {
    const fetchSpecification = async (): Promise<void> => {
      try {
        const response = await fetch(`${fiaApiUrl}/instrument/${instrumentName}/specification`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('scigateway:token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch specification');
        }

        const data = await response.json();
        setReductionStatus(data.enabled ? 'ON' : 'OFF');
      } catch (error) {
        console.error('Error fetching specification:', error);
      }
    };

    if (instrumentName) {
      fetchSpecification();
    }
  }, [instrumentName]);

  const toggleReductionStatus = async (): Promise<void> => {
    const newStatus = reductionStatus === 'ON' ? 'OFF' : 'ON';
    const statusValue = newStatus === 'ON' ? 'true' : 'false';

    try {
      const response = await fetch(`${fiaApiUrl}/instrument/${instrumentName}/status?status=${statusValue}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('scigateway:token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update reduction status');
      }

      setReductionStatus(newStatus);
    } catch (error) {
      console.error('Error updating reduction status:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', height: '85vh', overflow: 'hidden', color: theme.palette.text.primary }}>
      <Box sx={{ m: 2, backgroundColor: theme.palette.background.default }}>
        {/* Title */}
        <Typography variant="h4" gutterBottom>
          {instrumentName} config settings
        </Typography>

        {/* Reduction status */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body1" sx={{ lineHeight: '1.5', mr: 1 }}>
              Toggle reduction status:
            </Typography>
            <Button
              variant="contained"
              onClick={toggleReductionStatus}
              sx={{
                backgroundColor: reductionStatus === 'ON' ? 'green' : theme.palette.error.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: reductionStatus === 'ON' ? 'darkgreen' : theme.palette.error.dark,
                },
              }}
            >
              {reductionStatus}
            </Button>

            {/* Tooltip */}
            <Tooltip title="Click to toggle the reduction process on or off">
              <IconButton sx={{ ml: 1 }}>
                <Info sx={{ color: theme.palette.text.secondary }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Upload file button */}
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<UploadFile />}>
              Upload file...
            </Button>
          </Box>

          {/* Change script button */}
          <Box>
            <Button variant="contained" startIcon={<Edit />}>
              Change script...
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Specification editor subheading */}
      <Typography variant="h6" gutterBottom sx={{ ml: 2, mt: 4 }}>
        Specification editor
      </Typography>

      {/* Divider line */}
      <Box
        sx={{
          borderTop: 3,
          borderColor: 'divider',
        }}
      />

      {/* Tabs */}
      <Box>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Config Settings Tabs"
          sx={{
            '& .MuiTab-root': {
              color: theme.palette.mode === 'dark' ? theme.palette.common.white : undefined,

              '&.Mui-selected': {
                color: theme.palette.mode === 'dark' ? theme.palette.common.white : undefined,
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : undefined,
              },
            },
          }}
        >
          <Tab label="Simple" {...a11yProps(0)} />
          <Tab label="Advanced" {...a11yProps(1)} />
        </Tabs>
      </Box>

      {/* Simple panel */}
      <TabPanel value={tabValue} index={0}>
        <Grid container direction="column" spacing={1}>
          {/* Algorithm */}
          <Grid item>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ width: '150px', mb: 0 }}>
                Algorithm:
              </Typography>
              <input type="text" value="levmar" style={{ margin: 0, width: '140px' }} />
            </Box>
          </Grid>

          {/* Fit */}
          <Grid item>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ width: '150px', mb: 0 }}>
                Fit:
              </Typography>
              <input type="text" value="gaussian" style={{ margin: 0, width: '140px' }} />
            </Box>
          </Grid>

          {/* Color_map */}
          <Grid item>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ width: '150px', mb: 0 }}>
                Color_map:
              </Typography>
              <input type="text" value="viridis" style={{ margin: 0, width: '140px' }} />
            </Box>
          </Grid>

          {/* Apply settings button */}
          <Grid item xs={12}>
            <Button variant="contained" sx={{ mt: 3 }}>
              Apply settings
            </Button>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Advanced panel */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ height: 'calc(85vh - 48px - 48px - 24px)' }}>
          <MonacoEditor
            height="100%"
            defaultLanguage="json"
            value={jsonContent}
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
            onChange={(value) => setJsonContent(value || '')}
          />
        </Box>
      </TabPanel>
    </Box>
  );
};

export default ConfigSettings;
