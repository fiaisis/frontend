// React components
import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Material UI components
import { Box, Tabs, Tab, Typography, Button, useTheme, CircularProgress } from '@mui/material';

// Monaco components
import Editor from '@monaco-editor/react';
import { fiaApi } from './api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps): JSX.Element => {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3, height: 'calc(85vh - 48px - 48px - 24px)' }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number): { id: string; 'aria-controls': string } => {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
};

const ValueEditor: React.FC = () => {
  const theme = useTheme();
  const [value, setValue] = useState<number>(0);
  const [runnerVersion, setRunnerVersion] = useState<string>('1');
  const { reductionId } = useParams<{ reductionId: string }>();
  const [scriptValue, setScriptValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReduction = useCallback(async (): Promise<void> => {
    setLoading(true);
    fiaApi
      .get(`/reduction/${reductionId}`)
      .then((response) => response.data)
      .then((data) => setScriptValue(data?.script?.value ?? ''))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [reductionId]);

  useEffect(() => {
    fetchReduction();
  }, [fetchReduction]);

  const handleChange = (event: React.SyntheticEvent, newValue: number): void => {
    setValue(newValue);
  };

  const handleRunnerVersionChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setRunnerVersion(event.target.value);
  };

  return (
    <Box sx={{ width: '100%', height: '85vh', overflow: 'hidden' }}>
      <Box sx={{ p: 2, backgroundColor: theme.palette.background.default }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ color: theme.palette.text.primary, mr: 2 }}>Runner version:</Typography>
            <select
              value={runnerVersion}
              onChange={handleRunnerVersionChange}
              style={{
                padding: '8px',
                borderRadius: '4px',
              }}
            >
              <option value="1">Mantid 6.9.1</option>
              <option value="2">Mantid 6.8.0</option>
              <option value="3">Mantid Imaging 2.8</option>
            </select>
          </Box>
          <Button variant="contained" color="primary" disabled>
            Rerun with changes
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          borderTop: 3,
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Value Editor Tabs"
          color="primary"
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
          {['Script', 'User inputs'].map((label, index) => (
            <Tab key={index} label={label} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        {/* Loading state necessary so that page contents don't load before
        scriptValue is set */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="python"
            value={'# User script \n' + scriptValue}
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
          />
        )}
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Typography sx={{ color: theme.palette.text.primary, textAlign: 'center' }}>
          Options for user inputs will appear here soon
        </Typography>
      </TabPanel>
    </Box>
  );
};

export default ValueEditor;
