import Editor from '@monaco-editor/react';
import Replay from '@mui/icons-material/Replay';
import {
  Box,
  Button,
  CircularProgress,
  Link,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useHistory, useParams } from 'react-router-dom';

import SnackbarAlert from '../components/feedback/SnackbarAlert';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../components/jobs/constants';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { getPageHeaderControlSx } from '../components/navigation/pageHeaderStyles';
import { fiaApi } from '../lib/api';
import { isValidInstrument } from '../lib/instrumentData';
import { getRunReductionHistoryUrl } from '../lib/reductionHistoryUrl';
import { MantidVersionMap } from '../lib/types';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps): JSX.Element => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ flex: '1 1 auto', minHeight: 0, minWidth: 0, overflow: 'hidden' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0 }}>
          {children}
        </Box>
      )}
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
  const { rootRef, availableHeight } = useAvailablePluginHeight();
  const theme = useTheme();
  const editorChrome = getJobTableChromeColors(theme.palette.mode);
  const [value, setValue] = useState<number>(0);
  const [runnerVersion, setRunnerVersion] = useState<string>('');
  const [runners, setRunners] = useState<MantidVersionMap>({});
  const { instrumentName: urlInstrumentName, jobId } = useParams<{ instrumentName: string; jobId: string }>();
  const history = useHistory();

  // Redirect if an instrument is specified in the URL but it's not a valid instrument name
  useEffect(() => {
    if (urlInstrumentName && !isValidInstrument(urlInstrumentName)) {
      window.location.replace('/404/');
    }
  }, [urlInstrumentName, history]);

  const [scriptValue, setScriptValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [instrumentName, setInstrumentName] = useState<string | null>(null);
  const [runFilename, setRunFilename] = useState('');
  const rerunSuccessful = useRef<boolean | null>(null);
  const [rerunJobId, setRerunJobId] = useState<number | null>(null);
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
        setRunFilename(data?.run?.filename ?? '');
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

  const handleRunnerVersionChange = (event: SelectChangeEvent<string>): void => {
    setRunnerVersion(event.target.value);
  };

  const handleRerun = async (): Promise<void> => {
    if (!runnerVersion) return;

    setLoading(true);
    setSnackbarOpen(false);
    setRerunJobId(null);
    const runnerImage = `ghcr.io/fiaisis/mantid@${runnerVersion}`;
    fiaApi
      .post<number>('/job/rerun', { job_id: jobId, runner_image: runnerImage, script: scriptValue })
      .then(({ data }) => {
        rerunSuccessful.current = true;
        setRerunJobId(data);
      })
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
    <Box
      ref={rootRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: availableHeight,
        maxHeight: availableHeight,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
        color: editorChrome.text,
        '& .MuiCircularProgress-root': { color: editorChrome.accent },
      }}
    >
      <PageHeader breadcrumbs={<NavArrows />} />
      <Box
        sx={{
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          px: 2,
          pb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            border: `1px solid ${editorChrome.border}`,
            borderRadius: 0,
            backgroundColor: editorChrome.surface,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.5,
              flexShrink: 0,
              p: 1.5,
              borderBottom: `1px solid ${editorChrome.border}`,
              backgroundColor: editorChrome.header,
            }}
          >
            <Typography
              variant="body2"
              component="p"
              noWrap
              title={`${instrumentName ?? urlInstrumentName} Job ${jobId} values`}
              sx={{ flex: '1 1 200px', minWidth: 0, fontWeight: 700, m: 0 }}
            >
              {instrumentName ?? urlInstrumentName} Job {jobId} values
            </Typography>

            <Box
              role="group"
              aria-label="Reduction controls"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
                ml: 'auto',
                maxWidth: '100%',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}
              >
                <Snackbar
                  open={snackbarOpen}
                  autoHideDuration={rerunSuccessful.current ? null : 5000}
                  onClose={(event, reason) => {
                    if (reason !== 'clickaway') {
                      setSnackbarOpen(false);
                    }
                  }}
                  disableWindowBlurListener={false}
                  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                  <SnackbarAlert
                    severity={rerunSuccessful.current ? 'success' : 'error'}
                    onClose={() => setSnackbarOpen(false)}
                  >
                    {rerunSuccessful.current ? (
                      <>
                        Rerun started successfully for reduction {rerunJobId}.
                        <Box sx={{ mt: 0.5 }}>
                          <Link
                            component={RouterLink}
                            to={getRunReductionHistoryUrl(
                              { instrument_name: instrumentName ?? urlInstrumentName, filename: runFilename },
                              rerunJobId
                            )}
                            color="inherit"
                            underline="always"
                          >
                            View reduction
                          </Link>
                        </Box>
                      </>
                    ) : (
                      `Rerun could not be started for ${jobId} — please try again later or contact staff`
                    )}
                  </SnackbarAlert>
                </Snackbar>
                <Typography id="runner-version-label" variant="body2" sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                  Runner version
                </Typography>
                <Select
                  id="runner-version"
                  labelId="runner-version-label"
                  value={runnerVersion}
                  onChange={handleRunnerVersionChange}
                  disabled={Object.keys(runners).length === 0}
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: 180 },
                    minWidth: 0,
                    height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                    borderRadius: 0,
                    backgroundColor: editorChrome.surface,
                    color: editorChrome.text,
                    fontSize: '0.875rem',
                    '& .MuiSelect-select': { py: 1, pl: 1.5 },
                    '& .MuiSelect-icon': { color: editorChrome.accent },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: editorChrome.border },
                    '&:hover .MuiOutlinedInput-notchedOutline, &.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: editorChrome.accent,
                    },
                    '& .MuiSelect-select:focus-visible': {
                      outline: `2px solid ${editorChrome.accent}`,
                      outlineOffset: -2,
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        borderRadius: 0,
                        border: `1px solid ${editorChrome.border}`,
                        backgroundColor: editorChrome.surface,
                        color: editorChrome.text,
                        boxShadow: 'none',
                        '& .MuiMenuItem-root': {
                          minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                          fontSize: '0.875rem',
                          '&:hover, &.Mui-focusVisible': { backgroundColor: editorChrome.hover },
                          '&.Mui-selected': {
                            color: editorChrome.accent,
                            backgroundColor: alpha(editorChrome.accent, 0.12),
                          },
                          '&.Mui-selected:hover': { backgroundColor: alpha(editorChrome.accent, 0.18) },
                        },
                      },
                    },
                    MenuListProps: { sx: { py: 0 } },
                  }}
                >
                  {Object.entries(runners).map(([sha, version]) => (
                    <MenuItem key={sha} value={sha}>
                      Mantid {version}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <Button
                variant="text"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Replay fontSize="small" />}
                onClick={handleRerun}
                disabled={loading || !runnerVersion}
                sx={{
                  ...getPageHeaderControlSx(theme),
                  flexGrow: 0,
                  width: { xs: '100%', sm: 'auto' },
                  border: `1px solid ${editorChrome.border}`,
                  '& .MuiButton-startIcon': { m: 0 },
                  '& .MuiCircularProgress-root': { color: 'inherit' },
                }}
              >
                Rerun with changes
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              borderBottom: `1px solid ${editorChrome.border}`,
              backgroundColor: editorChrome.header,
            }}
          >
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="Value Editor Tabs"
              variant="fullWidth"
              sx={{
                minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                maxWidth: { xs: '100%', sm: 320 },
                overflow: 'visible',
                '& .MuiTabs-indicator': { backgroundColor: editorChrome.accent, height: 3 },
                '& .MuiTab-root': {
                  minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                  borderRadius: 0,
                  px: 1.5,
                  py: 0.75,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: editorChrome.text,
                  borderRight: { xs: 0, sm: `1px solid ${editorChrome.border}` },
                  '& + .MuiTab-root': { borderLeft: { xs: `1px solid ${editorChrome.border}`, sm: 0 } },
                  '&:hover': { backgroundColor: editorChrome.hover },
                  '&:focus-visible': { outline: `2px solid ${editorChrome.accent}`, outlineOffset: -2 },
                  '&.Mui-selected': {
                    color: editorChrome.accent,
                    backgroundColor: alpha(editorChrome.accent, 0.12),
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
                <CircularProgress aria-label="Loading reduction script" />
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
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  ariaLabel: `${instrumentName ?? urlInstrumentName} reduction ${jobId} script editor`,
                }}
              />
            )}
          </TabPanel>
          <TabPanel value={value} index={1}>
            <Typography variant="body2" sx={{ color: alpha(editorChrome.text, 0.75), textAlign: 'center', p: 3 }}>
              Options for user inputs will appear here soon
            </Typography>
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

export default ValueEditor;
