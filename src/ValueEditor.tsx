// React components
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

// Material UI components
import { Alert, Box, Button, CircularProgress, Snackbar, Tab, Tabs, Typography, useTheme } from '@mui/material';

// Monaco components
import Editor from '@monaco-editor/react';

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
  const [runnerVersion, setRunnerVersion] = useState<string>('');
  const [runnerVersions, setRunnerVersions] = useState<string[]>([]);
  const { jobId } = useParams<{ jobId: string }>();
  const [scriptValue, setScriptValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const rerunSuccessful = useRef<boolean | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
  const githubToken = process.env.REACT_APP_GITHUB_TOKEN;

  const fetchReduction = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const isDev = process.env.REACT_APP_DEV_MODE === 'true';
      const token = isDev ? null : localStorage.getItem('scigateway:token');
      const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${fiaApiUrl}/job/${jobId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      if (data && data.script && data.script.value) {
        setScriptValue(data.script.value);
      }
    } catch (error) {
      console.error('Error fetching reductions:', error);
    } finally {
      setLoading(false);
    }
  }, [fiaApiUrl, jobId]);

  useEffect(() => {
    fetchReduction();
  }, [fetchReduction]);

  const fetchRunnerVersions = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('https://api.github.com/orgs/fiaisis/packages/container/mantid/versions', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch runner versions: ${response.statusText}`);
      }

      const data = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags = data.flatMap((item: any) => item.metadata?.container?.tags || []);

      setRunnerVersions(tags);
    } catch (error) {
      console.error('Error fetching runner versions:', error);
    }
  }, [githubToken]);

  useEffect(() => {
    fetchReduction();
    fetchRunnerVersions();
  }, [fetchReduction, fetchRunnerVersions]);

  const handleChange = (event: React.SyntheticEvent, newValue: number): void => {
    setValue(newValue);
  };

  const handleRunnerVersionChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setRunnerVersion(event.target.value);
  };

  const handleRerun = async (): Promise<void> => {
    setLoading(true);
    try {
      const runnerImage = `ghcr.io/fiaisis/mantid:${runnerVersion}`;
      const isDev = process.env.REACT_APP_DEV_MODE === 'true';
      const token = isDev ? null : localStorage.getItem('scigateway:token');
      const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${fiaApiUrl}/job/rerun`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          job_id: jobId,
          runner_image: runnerImage,
          script: scriptValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to rerun job: ${response.statusText}`);
      }

      rerunSuccessful.current = true;
    } catch (error) {
      console.error('Error rerunning job:', error);
      rerunSuccessful.current = false;
    } finally {
      setTimeout(() => {
        setLoading(false);
        setSnackbarOpen(true);
      }, 2000);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '85vh', overflow: 'hidden' }}>
      <Box sx={{ p: 2, backgroundColor: theme.palette.background.default }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Snackbar
              open={snackbarOpen}
              autoHideDuration={5000}
              onClose={(event, reason) => {
                if (reason !== 'clickaway') {
                  setSnackbarOpen(false);
                }
              }}
              disableWindowBlurListener={false}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert
                sx={{
                  padding: '10px 14px',
                  fontSize: '1rem',
                  width: '100%',
                  maxWidth: '600px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                }}
                severity={rerunSuccessful.current ? 'success' : 'error'}
              >
                {rerunSuccessful.current
                  ? `Rerun started successfully for reduction ${jobId}`
                  : `Rerun could not be started for ${jobId} — please try again later or contact staff`}
              </Alert>
            </Snackbar>
            <Typography sx={{ color: theme.palette.text.primary, mr: 2 }}>Runner version:</Typography>
            <select
              value={runnerVersion}
              onChange={handleRunnerVersionChange}
              style={{
                padding: '8px',
                borderRadius: '4px',
              }}
            >
              {runnerVersions.map((version) => (
                <option key={version} value={version}>
                  Mantid {version}
                </option>
              ))}
            </select>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRerun}
            disabled={loading}
            sx={{ width: 170, height: 38 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Rerun with changes'}
          </Button>
        </Box>
      </Box>
      <Box sx={{ borderTop: 3, borderColor: 'divider' }}>
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
            value={scriptValue}
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
