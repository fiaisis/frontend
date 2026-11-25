import Editor from '@monaco-editor/react';
import Replay from '@mui/icons-material/Replay';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../components/jobs/constants';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { getPageHeaderControlSx } from '../components/navigation/pageHeaderStyles';
import ScriptDiagnosticsStatus from '../components/script/ScriptDiagnosticsStatus';
import { fiaApi } from '../lib/api';
import { isValidInstrument } from '../lib/instrumentData';
import { Job, MantidVersionMap } from '../lib/types';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';
import { useScriptEditor } from '../lib/useScriptEditor';

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

const runnerCatalogs = {
  mantid: {
    endpoint: '/jobs/runners',
    repository: 'ghcr.io/fiaisis/mantid',
    name: 'Mantid',
  },
  imaging: {
    endpoint: '/jobs/runners/mantidimaging',
    repository: 'ghcr.io/fiaisis/mantidimaging',
    name: 'Mantid Imaging',
  },
};

type RunnerFamily = keyof typeof runnerCatalogs;

type RunnerOption = {
  image: string;
  label: string;
};

type ValueEditorJob = {
  runner_image?: string | null;
  run?: Pick<Job['run'], 'instrument_name'> | null;
  script?: Job['script'] | null;
};

const ValueEditorForJob: React.FC<{ urlInstrumentName: string; jobId: string }> = ({ urlInstrumentName, jobId }) => {
  const { rootRef, availableHeight } = useAvailablePluginHeight();
  const theme = useTheme();
  const editorChrome = getJobTableChromeColors(theme.palette.mode);
  const [value, setValue] = useState<number>(0);
  const [chosenRunnerImage, setChosenRunnerImage] = useState('');
  const [runnerOptions, setRunnerOptions] = useState<Partial<Record<RunnerFamily, RunnerOption[]>>>({});
  const [job, setJob] = useState<ValueEditorJob | null>(null);
  const [scriptValue, setScriptValue] = useState('');
  const [loading, setLoading] = useState(true);
  const rerunSuccessful = useRef<boolean | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const isImat = urlInstrumentName.toUpperCase() === 'IMAT';
  const instrumentName = job?.run?.instrument_name || urlInstrumentName;
  const originalImage = typeof job?.runner_image === 'string' ? job.runner_image.trim() : '';
  const [originalReference, originalDigest] = originalImage.split('@');
  const originalRepository = originalReference.split(':')[0];
  const preferredFamily = isImat && originalRepository !== runnerCatalogs.mantid.repository ? 'imaging' : 'mantid';
  const otherFamily = preferredFamily === 'mantid' ? 'imaging' : 'mantid';
  const preferredOptions = runnerOptions[preferredFamily] ?? [];
  const options = isImat ? [...preferredOptions, ...(runnerOptions[otherFamily] ?? [])] : preferredOptions;
  const originalOption =
    isImat && originalDigest
      ? preferredOptions.find(({ image }) => image === `${originalRepository}@${originalDigest}`)
      : undefined;
  const defaultRunnerImage = originalOption?.image ?? preferredOptions[0]?.image ?? '';
  const runnerImage = job ? chosenRunnerImage || defaultRunnerImage : '';
  const canChooseRunner = job !== null && options.length > 0;
  const canRerun = !loading && !!runnerImage;

  // Redirect if an instrument is specified in the URL but it's not a valid instrument name
  useEffect(() => {
    if (urlInstrumentName && !isValidInstrument(urlInstrumentName)) {
      window.location.replace('/404/');
    }
  }, [urlInstrumentName]);

  // Python checking for the script tab. Advisory: nothing here touches the "Rerun with changes" button's
  // disabled state, because the checker cannot model facility code and would otherwise block scripts that
  // run perfectly well. Disabled while the job is still loading, so the first check is about the real script
  // rather than the empty editor shown before it arrives.
  const { diagnostics: scriptDiagnostics, onMount: onScriptEditorMount } = useScriptEditor(scriptValue, {
    enabled: !loading && job !== null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fiaApi
      .get<ValueEditorJob>(`/job/${jobId}`, { signal })
      .then(({ data }) => {
        if (signal.aborted || !data || typeof data !== 'object' || Array.isArray(data)) return;
        setJob(data);
        setScriptValue(data.script?.value ?? '');
      })
      .catch((err) => {
        if (!signal.aborted) console.error('Error fetching reductions:', err);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    const fetchRunners = async (family: RunnerFamily): Promise<void> => {
      const { endpoint, repository, name } = runnerCatalogs[family];
      try {
        const { data } = await fiaApi.get<MantidVersionMap>(endpoint, { signal });
        if (signal.aborted) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.error('Unexpected runner version response format:', data);
          return;
        }

        const catalog = Object.entries(data)
          .filter(
            ([digest, version]) => /^sha256:[^\s@]+$/.test(digest) && typeof version === 'string' && version.trim()
          )
          .map(([digest, version]) => ({ image: `${repository}@${digest}`, label: `${name} ${version}` }));
        setRunnerOptions((current) => ({ ...current, [family]: catalog }));
      } catch (err) {
        if (!signal.aborted) console.error(`Failed to fetch ${name} runner versions:`, err);
      }
    };

    void fetchRunners('mantid');
    if (isImat) void fetchRunners('imaging');

    return () => controller.abort();
  }, [isImat, jobId]);

  const handleChange = (event: React.SyntheticEvent, newValue: number): void => {
    setValue(newValue);
  };

  const handleRunnerVersionChange = (event: SelectChangeEvent<string>): void => {
    setChosenRunnerImage(event.target.value);
  };

  const handleRerun = async (): Promise<void> => {
    if (!canRerun) return;

    setLoading(true);
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
              title={`${instrumentName} Job ${jobId} values`}
              sx={{ flex: '1 1 200px', minWidth: 0, fontWeight: 700, m: 0 }}
            >
              {instrumentName} Job {jobId} values
            </Typography>

            <Box sx={{ minWidth: 0 }}>
              <ScriptDiagnosticsStatus diagnostics={scriptDiagnostics} />
            </Box>

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
                      borderRadius: 0,
                      boxShadow: 'none',
                      fontWeight: 'bold',
                    }}
                    severity={rerunSuccessful.current ? 'success' : 'error'}
                  >
                    {rerunSuccessful.current
                      ? `Rerun started successfully for reduction ${jobId}`
                      : `Rerun could not be started for ${jobId} — please try again later or contact staff`}
                  </Alert>
                </Snackbar>
                <Typography id="runner-version-label" variant="body2" sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                  Runner version
                </Typography>
                <Select
                  id="runner-version"
                  labelId="runner-version-label"
                  value={runnerImage}
                  onChange={handleRunnerVersionChange}
                  disabled={!canChooseRunner}
                  displayEmpty={canChooseRunner}
                  renderValue={(image) =>
                    options.find((option) => option.image === image)?.label ?? 'Choose a runner version'
                  }
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: isImat ? 240 : 180 },
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
                  {options.map(({ image, label }) => (
                    <MenuItem key={image} value={image}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <Button
                variant="text"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Replay fontSize="small" />}
                onClick={handleRerun}
                disabled={!canRerun}
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
                onChange={(newValue) => setScriptValue(newValue ?? '')}
                onMount={onScriptEditorMount}
                height="100%"
                defaultLanguage="python"
                value={scriptValue}
                theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  ariaLabel: `${instrumentName} reduction ${jobId} script editor`,
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

const ValueEditor: React.FC = () => {
  const { instrumentName: urlInstrumentName, jobId } = useParams<{ instrumentName: string; jobId: string }>();
  return (
    <ValueEditorForJob key={`${urlInstrumentName}/${jobId}`} urlInstrumentName={urlInstrumentName} jobId={jobId} />
  );
};

export default ValueEditor;
