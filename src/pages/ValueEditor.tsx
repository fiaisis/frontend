// React components
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { isValidInstrument } from '../lib/instrumentData';

// Material UI components
import { Alert, Box, Button, CircularProgress, Snackbar, Tab, Tabs, Typography, useTheme } from '@mui/material';

// Monaco components
import Editor from '@monaco-editor/react';
import { fiaApi } from '../lib/api';

import NavArrows from '../components/navigation/NavArrows';
import { MantidVersionMap } from '../lib/types';

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
  const [runners, setRunners] = useState<MantidVersionMap>({});
  const { instrumentName: urlInstrumentName, jobId } = useParams<{ instrumentName: string; jobId: string }>();
  const history = useHistory();

  // Redirect if an instrument is specified in the URL but it's not a valid instrument name
  useEffect(() => {
    if (urlInstrumentName && !isValidInstrument(urlInstrumentName)) {
      history.replace('/reduction-history');
    }
  }, [urlInstrumentName, history]);

  const [scriptValue, setScriptValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [instrumentName, setInstrumentName] = useState<string | null>(null);
  const rerunSuccessful = useRef<boolean | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const userModified = useRef(false);

  const fetchReduction = useCallback(async (): Promise<void> => {
    setLoading(true);
    fiaApi
      .get(`/job/${jobId}`)
      .then((res) => res.data)
      .then((data) => {
        if (data?.script?.value && !userModified.current) {
          setScriptValue(data.script.value);
        }
        if (data?.run?.instrument_name) {
          setInstrumentName(data.run.instrument_name);
        }
      })
      .catch((err) => console.error('Error fetching reductions:', err))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    fetchReduction();
  }, [fetchReduction]);

  const fetchRunners = useCallback(async (): Promise<void> => {
    fiaApi
      .get('/jobs/runners')
      .then((res) => res.data)
      .then((data) => {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.error('Unexpected runner version response format:', data);
          setRunners({});
          setRunnerVersion('');
          return;
        }

        const runnerData = data as MantidVersionMap;
        setRunners(runnerData);

        const runnerKeys = Object.keys(runnerData);
        if (runnerKeys.length > 0) {
          setRunnerVersion((current) => (current && runnerData[current] ? current : runnerKeys[0]));
        } else {
          setRunnerVersion('');
        }
      })
      .catch((err) => console.error('Failed to fetch runner versions:', err));
  }, []);

  useEffect(() => {
    fetchRunners();
  }, [fetchReduction, fetchRunners]);

  const handleChange = (event: React.SyntheticEvent, newValue: number): void => {
    setValue(newValue);
  };

  const handleRunnerVersionChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setRunnerVersion(event.target.value);
  };

  const handleRerun = async (): Promise<void> => {
    if (!runnerVersion) return;

    setLoading(true);
    const runnerImage = `ghcr.io/fiaisis/mantid@${runnerVersion}`;
    fiaApi
      .post('/job/rerun', { job_id: jobId, runner_image: runnerImage, script: scriptValue })
      .then(() => (rerunSuccessful.current = true))
      .catch((err) => {
        console.error('Failed to rerun job:', err);
        rerunSuccessful.current = false;
      })
      .finally(() => {
        setTimeout(() => {
          setLoading(false);
          setSnackbarOpen(true);
        }, 2000);
      });
  };

  return (
    <>
      <NavArrows />
      <Box sx={{ width: '100%', height: '85vh', overflow: 'hidden' }}>
        <Box sx={{ p: 2, backgroundColor: theme.palette.background.default }}>
          <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
            {instrumentName} Job {jobId} values
          </Typography>

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
                disabled={Object.keys(runners).length === 0}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                }}
              >
                {Object.entries(runners).map(([sha, version]) => (
                  <option key={sha} value={sha}>
                    Mantid {version}
                  </option>
                ))}
              </select>
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRerun}
              disabled={loading || !runnerVersion}
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
          {/* Loading state necessary so that page contents don't load before scriptValue is set */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Editor
              onChange={(newValue) => {
                if (newValue !== null) {
                  setScriptValue(newValue ?? '');
                  userModified.current = true; // Indicates that the user has modified the script
                }
              }}
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
    </>
  );
};

export default ValueEditor;
