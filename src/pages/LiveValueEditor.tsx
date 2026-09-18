import Editor from '@monaco-editor/react';
import { DescriptionOutlined, Save } from '@mui/icons-material';
import { Box, Button, CircularProgress, Snackbar, Typography, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import { LiveLogViewer } from '../components/experimentViewer/LiveLogViewer';
import SnackbarAlert from '../components/feedback/SnackbarAlert';
import { getJobTableChromeColors } from '../components/jobs/constants';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { getPageHeaderControlSx } from '../components/navigation/pageHeaderStyles';
import { fiaApi } from '../lib/api';
import { instruments as allInstruments } from '../lib/instrumentData';
import { LIVE_SUPPORTED_INSTRUMENTS_FALLBACK } from '../lib/instrumentSupport';
import { fetchLiveDataInstruments } from '../lib/plottingServiceAPI';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';

const LiveValueEditor: React.FC = () => {
  const { rootRef, availableHeight } = useAvailablePluginHeight();
  const theme = useTheme();
  const editorChrome = getJobTableChromeColors(theme.palette.mode);
  const actionButtonSx = {
    ...getPageHeaderControlSx(theme),
    '& .MuiButton-startIcon': { m: 0 },
  };
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const history = useHistory();
  const [scriptValue, setScriptValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [supportedInstruments, setSupportedInstruments] = useState<readonly string[]>(
    LIVE_SUPPORTED_INSTRUMENTS_FALLBACK
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showLiveLogViewer, setShowLiveLogViewer] = useState(false);
  const userModified = useRef(false);
  useEffect(() => {
    let active = true;
    const loadInstruments = async (): Promise<void> => {
      try {
        const instrumentList = await fetchLiveDataInstruments();
        if (active && Array.isArray(instrumentList) && instrumentList.every((name) => typeof name === 'string')) {
          setSupportedInstruments(instrumentList);
        }
      } catch (err) {
        console.error('Failed to load instruments:', err);
      }
    };

    void loadInstruments();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const matchedInstrument =
      allInstruments.find((instrument) => instrument.name.toLowerCase() === instrumentName.toLowerCase())?.name ??
      supportedInstruments.find((instrument) => instrument.toLowerCase() === instrumentName.toLowerCase());

    if (matchedInstrument && matchedInstrument !== instrumentName) {
      history.replace(`/live-data/${matchedInstrument}/edit-script`);
    }
  }, [history, instrumentName, supportedInstruments]);

  const handleInstrumentChange = (instrument: string): void => {
    history.push(`/live-data/${instrument}/edit-script`);
  };

  const pageControls = [
    <InstrumentSelector
      key="instrument"
      selectedInstrument={instrumentName}
      handleInstrumentChange={handleInstrumentChange}
      variant="compact"
      compactLabel="Browse instruments"
      showAllInstrumentsOption={false}
      support={{ page: 'live-data', instruments: supportedInstruments }}
    />,
  ];

  const fetchScript = useCallback(async (): Promise<void> => {
    if (!instrumentName) return;
    setLoading(true);
    fiaApi
      .get(`/live-data/${instrumentName}/script`)
      .then((res) => {
        const script = res.data;
        if (typeof script === 'string') {
          setScriptValue(script);
        } else if (script === null) {
          setScriptValue('');
        }
      })
      .catch((err) => {
        console.error('Error fetching live data script:', err);
      })
      .finally(() => setLoading(false));
  }, [instrumentName]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  const handleSave = async (): Promise<void> => {
    if (!instrumentName) return;

    setSaving(true);
    fiaApi
      .put(`/live-data/${instrumentName}/script`, { value: scriptValue })
      .then(() => {
        setSaveResult({ success: true, message: `Script for ${instrumentName} updated successfully` });
        userModified.current = false;
      })
      .catch((err) => {
        console.error('Failed to update live data script:', err);
        setSaveResult({ success: false, message: `Failed to update script for ${instrumentName}` });
      })
      .finally(() => {
        setSaving(false);
        setSnackbarOpen(true);
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
      }}
    >
      <PageHeader breadcrumbs={<NavArrows />} controls={pageControls} />
      <Box
        sx={{
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
              gap: 1,
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
              title={`${instrumentName} Live data script`}
              sx={{ flex: '1 1 180px', minWidth: 0, fontWeight: 700, m: 0 }}
            >
              {instrumentName} Live data script
            </Typography>
            <Box
              role="group"
              aria-label="Script actions"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1px',
                ml: 'auto',
                maxWidth: '100%',
                border: `1px solid ${editorChrome.border}`,
                backgroundColor: editorChrome.border,
              }}
            >
              <Button
                variant="text"
                startIcon={<DescriptionOutlined fontSize="small" />}
                onClick={() => setShowLiveLogViewer(true)}
                sx={actionButtonSx}
              >
                View logs
              </Button>
              <Button
                variant="text"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save fontSize="small" />}
                onClick={handleSave}
                disabled={loading || saving}
                sx={actionButtonSx}
              >
                {saving ? 'Saving...' : 'Save script'}
              </Button>
            </Box>
          </Box>
          <Box
            sx={{
              flex: '1 1 auto',
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              overflow: 'hidden',
              '& .MuiCircularProgress-root': { color: editorChrome.accent },
            }}
          >
            {loading ? (
              <Box
                sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}
              >
                <CircularProgress aria-label="Loading live data script" />
              </Box>
            ) : (
              <Box sx={{ flex: 1, height: '100%', minWidth: 0 }}>
                <Editor
                  onChange={(newValue) => {
                    if (newValue !== null) {
                      setScriptValue(newValue ?? '');
                      userModified.current = true;
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
                    ariaLabel: `${instrumentName} live data script editor`,
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <LiveLogViewer
        open={showLiveLogViewer}
        onClose={() => setShowLiveLogViewer(false)}
        instrumentName={instrumentName.toUpperCase() ?? 'null'}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') {
            setSnackbarOpen(false);
          }
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {saveResult ? (
          <SnackbarAlert onClose={() => setSnackbarOpen(false)} severity={saveResult.success ? 'success' : 'error'}>
            {saveResult.message}
          </SnackbarAlert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default LiveValueEditor;
