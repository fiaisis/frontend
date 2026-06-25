import Editor from '@monaco-editor/react';
import { Save } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, Snackbar, Typography, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import { LiveLogViewer } from '../components/experimentViewer/LiveLogViewer';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import { fiaApi } from '../lib/api';
import { instruments as allInstruments } from '../lib/instrumentData';
import { fetchLiveDataInstruments } from '../lib/plottingServiceAPI';

const LiveValueEditor: React.FC = () => {
  const theme = useTheme();
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const history = useHistory();
  const [scriptValue, setScriptValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showLiveLogViewer, setShowLiveLogViewer] = useState(false);
  const userModified = useRef(false);
  const liveDataInstrumentOptions = useMemo(() => {
    const instrumentMetadataByName = new Map(
      allInstruments.map((instrument) => [instrument.name.toLowerCase(), instrument])
    );

    return instruments.map((instrument, index) => {
      return (
        instrumentMetadataByName.get(instrument.toLowerCase()) ?? {
          id: -(index + 1),
          name: instrument,
          description: '',
          type: 'Live data',
          infoPage: '',
          scientists: [],
        }
      );
    });
  }, [instruments]);

  useEffect(() => {
    const loadInstruments = async (): Promise<void> => {
      try {
        setLoadingInstruments(true);
        const instrumentList = await fetchLiveDataInstruments();
        setInstruments(instrumentList);
      } catch (err) {
        console.error('Failed to load instruments:', err);
      } finally {
        setLoadingInstruments(false);
      }
    };

    loadInstruments();
  }, []);

  useEffect(() => {
    if (loadingInstruments) {
      return;
    }

    const matchedInstrument = instruments.find(
      (instrument) => instrument.toLowerCase() === instrumentName.toLowerCase()
    );

    if (matchedInstrument && matchedInstrument !== instrumentName) {
      history.replace(`/live-data/${matchedInstrument}/edit-script`);
    }
  }, [history, instrumentName, instruments, loadingInstruments]);

  const handleInstrumentChange = (instrument: string): void => {
    history.push(`/live-data/${instrument}/edit-script`);
  };

  const breadcrumbTrailingCrumbs = [
    <InstrumentSelector
      key="instrument"
      selectedInstrument={instrumentName}
      handleInstrumentChange={handleInstrumentChange}
      variant="breadcrumb"
      instrumentOptions={liveDataInstrumentOptions}
      showAllInstrumentsOption={false}
      disabled={loadingInstruments || liveDataInstrumentOptions.length === 0}
    />,
    <Typography key="edit-script" color="text.primary">
      Edit script
    </Typography>,
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
    <>
      <NavArrows trailingCrumb={breadcrumbTrailingCrumbs} replaceLastCrumbCount={2} />
      <Box
        sx={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, backgroundColor: theme.palette.background.default }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
              {instrumentName} Live data script
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* View Logs Button */}
              <Button variant="contained" size="small" onClick={() => setShowLiveLogViewer(true)} sx={{ ml: 'auto' }}>
                View Logs
              </Button>
              <LiveLogViewer
                open={showLiveLogViewer}
                onClose={() => setShowLiveLogViewer(false)}
                instrumentName={instrumentName.toUpperCase() ?? 'null'}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                onClick={handleSave}
                disabled={loading || saving}
                sx={{ minWidth: 120 }}
              >
                {saving ? 'Saving...' : 'Save Script'}
              </Button>
            </Box>
          </Box>

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
              <Alert
                onClose={() => setSnackbarOpen(false)}
                severity={saveResult.success ? 'success' : 'error'}
                sx={{ width: '100%' }}
              >
                {saveResult.message}
              </Alert>
            ) : undefined}
          </Snackbar>
        </Box>

        <Box sx={{ flex: 1, borderTop: 3, borderColor: 'divider', display: 'flex', overflow: 'hidden' }}>
          {loading ? (
            <Box
              sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
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
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

export default LiveValueEditor;
