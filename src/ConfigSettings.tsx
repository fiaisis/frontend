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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
  const [jsonContent, setJsonContent] = useState<string>('{}');
  const [formFields, setFormFields] = useState<{ [key: string]: string }>({}); // Dynamic form fields
  const [enabledStatus, setEnabledStatus] = useState<boolean>(true); // State for "enabled" tag
  const [tabValue, setTabValue] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false); // State for tracking changes
  const [applyMessage, setApplyMessage] = useState<string>(''); // State for applying status messages

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

        // Exclude the "enabled" key from the JSON -- gets added later when settings applied
        const { enabled, ...filteredData } = data;

        // Set the reduction status button on/off based on the "enabled" field
        setReductionStatus(enabled ? 'ON' : 'OFF');
        setEnabledStatus(enabled);

        const specJson = JSON.stringify(filteredData, null, 2);
        setJsonContent(specJson);
        syncFormWithJson(specJson);
      } catch (error) {
        console.error('Error fetching specification:', error);
      }
    };

    if (instrumentName) {
      fetchSpecification();
    }
  }, [instrumentName]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };

  // Sync form fields when JSON content is edited
  const syncFormWithJson = (jsonString: string): void => {
    try {
      const json = JSON.parse(jsonString);
      // Exclude the "enabled" field from syncing -- handling this separately
      const { enabled, ...otherFields } = json;
      setFormFields(otherFields);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  };

  // Sync JSON when form fields are edited
  const syncJsonWithForm = (updatedFields: { [key: string]: string }): void => {
    try {
      const json = JSON.parse(jsonContent);
      Object.keys(updatedFields).forEach((key) => {
        json[key] = updatedFields[key];
      });
      setJsonContent(JSON.stringify(json, null, 2));
    } catch (error) {
      console.error('Error syncing JSON with form:', error);
    }
  };

  const handleFormInputChange = (key: string, value: string): void => {
    const updatedFields = { ...formFields, [key]: value };
    setFormFields(updatedFields);
    syncJsonWithForm(updatedFields);
    setUnsavedChanges(true);
    setApplyMessage('');
  };

  const handleEditorChange = (value: string | undefined): void => {
    const updatedJson = value || '{}';
    setJsonContent(updatedJson);
    syncFormWithJson(updatedJson);
    setUnsavedChanges(true);
    setApplyMessage('');
  };

  const toggleEnabledStatus = (): void => {
    setEnabledStatus(!enabledStatus);
    setReductionStatus(enabledStatus ? 'OFF' : 'ON');
    setUnsavedChanges(true);
    setApplyMessage('');
  };

  const handleApplySettings = async (): Promise<void> => {
    try {
      // Parse the current JSON content add the "enabled" field based on the current state of the toggle button
      const updatedJsonContent = {
        ...JSON.parse(jsonContent),
        enabled: enabledStatus ? true : false,
      };

      // Convert the final JSON content to a string for the request body
      const finalJsonContent = JSON.stringify(updatedJsonContent, null, 2);

      // Send a PUT request to update the instrument specification
      const response = await fetch(`${fiaApiUrl}/instrument/${instrumentName}/specification`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('scigateway:token')}`,
        },
        body: finalJsonContent,
      });

      if (!response.ok) {
        throw new Error('Failed to update the specification');
      }

      setApplyMessage('Changes applied successfully');
      setUnsavedChanges(false);
    } catch (error) {
      setApplyMessage('Error applying spec changes');
    }
  };

  return (
    <Box sx={{ width: '100%', height: '85vh', color: theme.palette.text.primary, overflowY: 'auto' }}>
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
              onClick={toggleEnabledStatus}
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
        <Grid container direction="column" spacing={2}>
          {/* Dynamically generated form fields */}
          {Object.keys(formFields).map((key) => (
            <Grid item key={key}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ width: '150px', mb: 0 }}>
                  {key}:
                </Typography>
                <input
                  value={formFields[key]}
                  onChange={(e) => handleFormInputChange(key, e.target.value)}
                  style={{ margin: 0, height: '20px', width: '160px' }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Advanced panel */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ height: '30vh' }}>
          <MonacoEditor
            height="100%"
            defaultLanguage="json"
            value={jsonContent}
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
            onChange={handleEditorChange}
          />
        </Box>
      </TabPanel>

      {/* Apply settings button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
        <Button variant="contained" onClick={handleApplySettings}>
          Apply settings
        </Button>
      </Box>

      {/* Display unsaved changes message */}
      {unsavedChanges && (
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', fontStyle: 'italic', color: theme.palette.warning.main }}
        >
          You have changes which haven&apos;t been applied yet
        </Typography>
      )}

      {/* Display apply status message if no unsaved changes */}
      {!unsavedChanges && applyMessage && (
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', fontStyle: 'italic', color: theme.palette.success.main }}
        >
          {applyMessage}
        </Typography>
      )}
    </Box>
  );
};

export default ConfigSettings;
