import MonacoEditor from '@monaco-editor/react';
import { Info } from '@mui/icons-material';
import { Box, Button, IconButton, Tab, Tabs, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { fiaApi } from '../../lib/api';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }): JSX.Element => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 1.5 }}>{children}</Box>}
    </div>
  );
};
const a11yProps = (index: number): { id: string; 'aria-controls': string } => ({
  id: `tab-${index}`,
  'aria-controls': `tabpanel-${index}`,
});
type SpecificationFieldValue = string | number | boolean | null | undefined | SpecificationFieldRecord;
interface SpecificationFieldRecord {
  [key: string]: SpecificationFieldValue;
}

interface ConfigSettingsGeneralProps {
  // Allow children to be passed for features specific to certain instruments
  children?: React.ReactNode;
  onFileUpload?: () => Promise<void>;
}
const ConfigSettingsGeneral: React.FC<ConfigSettingsGeneralProps> = ({ children, onFileUpload }) => {
  const theme = useTheme();
  const configChrome = getJobTableChromeColors(theme.palette.mode);
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const [reductionStatus, setReductionStatus] = useState<'ON' | 'OFF'>('ON');
  const [jsonContent, setJsonContent] = useState<string>('{}');
  const [formFields, setFormFields] = useState<SpecificationFieldRecord>({}); // Dynamic form fields
  const [enabledStatus, setEnabledStatus] = useState<boolean>(true); // State for "enabled" tag
  const [tabValue, setTabValue] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false); // State for tracking changes
  const [applyMessage, setApplyMessage] = useState<string>(''); // State for applying status messages
  const statusPalette = reductionStatus === 'ON' ? theme.palette.success : theme.palette.error;
  const statusColor = theme.palette.mode === 'dark' ? statusPalette.light : statusPalette.dark;
  // Fetch the current specification and set the reduction status
  useEffect(() => {
    const fetchSpecification = async (): Promise<void> => {
      fiaApi
        .get(`/instrument/${instrumentName}/specification`)
        .then((res) => res.data)
        .then((data) => {
          const { enabled, ...filteredData } = data;
          // Set the reduction status button on/off based on the "enabled" field
          setReductionStatus(enabled ? 'ON' : 'OFF');
          setEnabledStatus(enabled);
          const specJson = JSON.stringify(filteredData, null, 2);
          setJsonContent(specJson);
          syncFormWithJson(specJson);
        })
        .catch((err) => console.error('failed to  fetch specification', err));
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
  // Recursively update a field in nested object by path
  const updateNestedField = (
    current: SpecificationFieldRecord,
    path: string[],
    value: SpecificationFieldValue
  ): SpecificationFieldRecord => {
    if (path.length === 0) return current;
    const [head, ...tail] = path;
    if (tail.length === 0) {
      return { ...current, [head]: value };
    }
    const currentChild = current[head];
    const nextCurrent: SpecificationFieldRecord =
      typeof currentChild === 'object' && currentChild !== null && !Array.isArray(currentChild)
        ? (currentChild as SpecificationFieldRecord)
        : {};
    return {
      ...current,
      [head]: updateNestedField(nextCurrent, tail, value),
    };
  };
  // Sync JSON when form fields are edited
  const syncJsonWithForm = (updatedFields: SpecificationFieldRecord): void => {
    try {
      const json = JSON.parse(jsonContent) as Record<string, unknown>;
      Object.keys(updatedFields).forEach((key) => {
        json[key] = updatedFields[key];
      });
      setJsonContent(JSON.stringify(json, null, 2));
    } catch (error) {
      console.error('Error syncing JSON with form:', error);
    }
  };
  const handleFormFieldChange = (path: string[], rawValue: string, previousValue: SpecificationFieldValue): void => {
    let nextValue: SpecificationFieldValue = rawValue;
    if (typeof previousValue === 'boolean') {
      if (rawValue.toLowerCase() === 'true') {
        nextValue = true;
      } else if (rawValue.toLowerCase() === 'false') {
        nextValue = false;
      }
    }
    const updatedFields = updateNestedField(formFields, path, nextValue);
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
    // Parse the current JSON content and add the missing "enabled" field
    const updatedJsonContent = {
      ...JSON.parse(jsonContent),
      enabled: enabledStatus,
    };
    fiaApi
      .put(`/instrument/${instrumentName}/specification`, updatedJsonContent)
      .then(() => {
        if (onFileUpload) {
          Promise.resolve(onFileUpload());
        }
        setApplyMessage('Changes applied successfully');
        setUnsavedChanges(false);
      })
      .catch((err) => {
        console.error('Failed to update specification', err);
        setApplyMessage('Error applying spec changes');
      });
  };

  const renderFormField = (key: string, value: SpecificationFieldValue, path: string[]): React.ReactNode => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <Box key={path.join('.')} sx={{ minWidth: 0, border: `1px solid ${configChrome.border}` }}>
          <Typography
            variant="body2"
            component="h4"
            sx={{
              px: 1.5,
              py: 1,
              fontWeight: 700,
              overflowWrap: 'anywhere',
              backgroundColor: configChrome.header,
              borderBottom: `1px solid ${configChrome.border}`,
            }}
          >
            {key}
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, p: 1.5 }}>
            {Object.entries(value).map(([childKey, childValue]) =>
              renderFormField(childKey, childValue, [...path, childKey])
            )}
          </Box>
        </Box>
      );
    }

    return (
      <TextField
        key={path.join('.')}
        fullWidth
        size="small"
        label={key}
        inputProps={{ 'aria-label': path.join(': ') }}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => handleFormFieldChange(path, e.target.value, value)}
      />
    );
  };

  return (
    <Box
      sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', color: configChrome.text }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          p: { xs: 1.5, sm: 2 },
          scrollbarWidth: 'thin',
          scrollbarColor: `${configChrome.border} ${configChrome.header}`,
        }}
      >
        {/* Reduction status */}
        <Box sx={{ border: `1px solid ${configChrome.border}` }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              backgroundColor: configChrome.header,
              borderBottom: children ? `1px solid ${configChrome.border}` : 0,
            }}
          >
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 700 }}>
              Reduction status:
            </Typography>
            <Button
              variant="outlined"
              aria-label="Enable reductions"
              aria-pressed={enabledStatus}
              onClick={toggleEnabledStatus}
              sx={{
                minWidth: 64,
                borderColor: alpha(statusColor, 0.5),
                backgroundColor: alpha(statusColor, 0.08),
                color: statusColor,
                '&:hover': {
                  borderColor: statusColor,
                  backgroundColor: alpha(statusColor, 0.16),
                },
              }}
            >
              {reductionStatus}
            </Button>
            {/* Tooltip */}
            <Tooltip title="Click to toggle the reduction process on or off">
              <IconButton aria-label="About reduction status" size="small">
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {/* Allow children to be passed for features specific to certain instruments */}
          {children && <Box sx={{ p: 1.5 }}>{children}</Box>}
        </Box>
        {/* Specification editor subheading */}
        <Box sx={{ mt: 1.5, border: `1px solid ${configChrome.border}` }}>
          <Typography
            variant="body2"
            component="h3"
            sx={{
              px: 1.5,
              py: 1,
              fontWeight: 700,
              backgroundColor: configChrome.header,
              borderBottom: `1px solid ${configChrome.border}`,
            }}
          >
            Specification editor
          </Typography>
          {/* Tabs */}
          <Box>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="Config Settings Tabs"
              sx={{
                minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                borderBottom: `1px solid ${configChrome.border}`,
                '& .MuiTabs-indicator': { backgroundColor: configChrome.accent },
                '& .MuiTab-root': {
                  minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                  py: 0.75,
                  px: 2,
                  borderRight: `1px solid ${configChrome.border}`,
                  color: configChrome.text,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: configChrome.hover },
                  '&:focus-visible': { outline: `2px solid ${configChrome.accent}`, outlineOffset: -2 },
                  '&.Mui-selected': {
                    color: configChrome.accent,
                    backgroundColor: alpha(configChrome.accent, 0.12),
                    fontWeight: 700,
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
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {/* Dynamically generated form fields */}
              {Object.entries(formFields).map(([key, value]) => renderFormField(key, value, [key]))}
            </Box>
          </TabPanel>
          {/* Advanced panel */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ height: '30vh', minHeight: 240, border: `1px solid ${configChrome.border}` }}>
              <MonacoEditor
                height="100%"
                defaultLanguage="json"
                value={jsonContent}
                theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
                onChange={handleEditorChange}
                options={{
                  wordWrap: 'on',
                  minimap: { enabled: false },
                }}
              />
            </Box>
          </TabPanel>
        </Box>
      </Box>
      {/* Apply settings button */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderTop: `1px solid ${configChrome.border}`,
          backgroundColor: configChrome.surface,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="text"
            onClick={handleApplySettings}
            sx={{
              px: 2,
              borderLeft: `1px solid ${configChrome.border}`,
              color: configChrome.accent,
              '&:hover': { backgroundColor: configChrome.hover },
            }}
          >
            Apply settings
          </Button>
        </Box>
        {/* Display unsaved changes message */}
        {unsavedChanges && (
          <Typography
            variant="body2"
            sx={{
              p: 1.5,
              borderTop: `1px solid ${configChrome.border}`,
              backgroundColor: configChrome.header,
              color: theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.dark,
            }}
          >
            You have changes which haven&apos;t been applied yet
          </Typography>
        )}
        {/* Display apply status message if no unsaved changes */}
        {!unsavedChanges && applyMessage && (
          <Typography
            variant="body2"
            role="status"
            sx={{
              p: 1.5,
              borderTop: `1px solid ${configChrome.border}`,
              backgroundColor: configChrome.header,
              color: configChrome.text,
            }}
          >
            {applyMessage}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
export default ConfigSettingsGeneral;
