import '@h5web/lib/styles.css';
import Edit from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Link as MuiLink,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { jwtDecode } from 'jwt-decode';
import React, { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useHistory, useParams } from 'react-router-dom';

import Viewer2D from '../components/experimentViewer/Viewer2D';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../components/jobs/constants';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { getPageHeaderControlSx } from '../components/navigation/pageHeaderStyles';
import { LIVE_SUPPORTED_INSTRUMENTS_FALLBACK } from '../lib/instrumentSupport';
import { fetchLiveDataFiles, fetchLiveDataInstruments } from '../lib/plottingServiceAPI';
import { outputFilter } from '../lib/types';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';
import { useLiveDataSSE } from '../lib/useLiveDataSSE';

const LiveData: React.FC = (): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);
  const connectedColor = theme.palette.mode === 'dark' ? theme.palette.success.light : theme.palette.success.dark;

  const { rootRef, availableHeight } = useAvailablePluginHeight();
  const { instrumentName } = useParams<{ instrumentName?: string }>();
  // Instrument selection
  const [instruments, setInstruments] = useState<string[]>([...LIVE_SUPPORTED_INSTRUMENTS_FALLBACK]);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(() => instrumentName ?? null);
  const [loadingInstruments, setLoadingInstruments] = useState(true);

  // File list
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const history = useHistory();
  const [userRole, setUserRole] = useState<'staff' | 'user' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('scigateway:token');
    if (token) {
      try {
        const decoded = jwtDecode<{ role?: 'staff' | 'user' }>(token);
        setUserRole(decoded.role || 'user');
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  // Viewer state
  const [viewerKey, setViewerKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // SSE connection
  const { isConnected, directory, changedFile, error: sseError } = useLiveDataSSE(selectedInstrument, true);

  // Build full file path using directory from SSE and selected file
  const selectedFilePath = directory && selectedFile ? `${directory}/${selectedFile}` : null;
  // Fetch available instruments on mount
  useEffect(() => {
    const loadInstruments = async (): Promise<void> => {
      try {
        setLoadingInstruments(true);
        const instrumentList = await fetchLiveDataInstruments();
        setInstruments(instrumentList);
      } catch (err) {
        console.error('Failed to load instruments:', err);
        setError('Failed to load available instruments');
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

    if (instrumentName) {
      const matchedInstrument = instruments.find(
        (instrument) => instrument.toLowerCase() === instrumentName.toLowerCase()
      );
      const nextInstrument = matchedInstrument ?? instrumentName;

      setSelectedInstrument((currentInstrument) =>
        currentInstrument === nextInstrument ? currentInstrument : nextInstrument
      );

      if (matchedInstrument && matchedInstrument !== instrumentName) {
        history.replace(`/live-data/${matchedInstrument}`);
      }

      return;
    }

    if (instruments.length === 0) {
      setSelectedInstrument(null);
      return;
    }

    const nextInstrument =
      selectedInstrument && instruments.includes(selectedInstrument) ? selectedInstrument : instruments[0];

    setSelectedInstrument(nextInstrument);
    history.replace(`/live-data/${nextInstrument}`);
  }, [history, instrumentName, instruments, loadingInstruments, selectedInstrument]);

  // Fetch files when instrument changes
  const loadFiles = useCallback(
    async (resetSelection: boolean = false): Promise<void> => {
      if (!selectedInstrument) {
        setFiles([]);
        setSelectedFile(null);
        return;
      }

      try {
        setLoadingFiles(true);
        setError(null);
        const fileList = await fetchLiveDataFiles(selectedInstrument);
        // Filter to only show valid H5 files
        const filteredFiles = fileList.filter((file) => outputFilter.some((ext) => file.endsWith(ext)));
        setFiles(filteredFiles);

        setSelectedFile((currentFile) => {
          if (resetSelection) {
            return filteredFiles[0] ?? null;
          }

          return currentFile && filteredFiles.includes(currentFile) ? currentFile : (filteredFiles[0] ?? null);
        });
      } catch (err) {
        console.error('Failed to load files:', err);
        setError('Failed to load files from live data directory');
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    },
    [selectedInstrument]
  );

  useEffect(() => {
    loadFiles(true);
  }, [loadFiles]);

  // Handle file changes from SSE
  useEffect(() => {
    if (!changedFile) {
      return;
    }

    // Ignore files that don't match the output filter
    const isValidFile = outputFilter.some((ext) => changedFile.file.endsWith(ext));
    if (!isValidFile) {
      return;
    }

    // Refresh file list if a file was added or deleted
    if (changedFile.change_type === 'added' || changedFile.change_type === 'deleted') {
      loadFiles();
    }

    // Refresh viewer if the currently selected file was modified
    if (changedFile.file === selectedFile && changedFile.change_type === 'modified') {
      setViewerKey((prev) => prev + 1);
    }
  }, [changedFile, selectedFile, loadFiles]);

  // Handle instrument change
  const handleInstrumentChange = (instrument: string): void => {
    setSelectedInstrument(instrument);
    setSelectedFile(null);
    setError(null);
    history.push(`/live-data/${instrument}`);
  };

  // Handle file selection
  const handleFileSelect = (file: string): void => {
    setSelectedFile(file);
    setViewerKey((prev) => prev + 1);
  };

  const pageControls = [
    ...(userRole === 'staff' && selectedInstrument
      ? [
          <MuiLink
            key="edit-script"
            component={RouterLink}
            underline="hover"
            to={`/live-data/${selectedInstrument}/edit-script`}
            sx={getPageHeaderControlSx}
          >
            <Edit fontSize="small" />
            Edit script
          </MuiLink>,
        ]
      : []),
    <InstrumentSelector
      key="instrument"
      selectedInstrument={selectedInstrument || 'ALL'}
      handleInstrumentChange={handleInstrumentChange}
      variant="compact"
      compactLabel="Browse instruments"
      allInstrumentsLabel="Clear selection"
      support={{ page: 'live-data', instruments }}
    />,
  ];

  return (
    <Box
      ref={rootRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: availableHeight,
        maxHeight: availableHeight,
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbs={
          <NavArrows
            labelOverrides={selectedInstrument && instrumentName ? { [instrumentName]: selectedInstrument } : undefined}
          />
        }
        controls={pageControls}
        separateControls
        status={
          selectedInstrument && (
            <Chip
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'default'}
              size="small"
              variant="outlined"
              role="status"
              sx={{
                flex: '0 0 auto',
                minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                borderRadius: 0,
                borderColor: isConnected ? alpha(connectedColor, 0.5) : viewerChrome.border,
                backgroundColor: isConnected ? alpha(connectedColor, 0.08) : viewerChrome.header,
                color: isConnected ? connectedColor : viewerChrome.text,
                fontWeight: 500,
                '& .MuiChip-label': { px: 1.5 },
              }}
            />
          )
        }
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, width: '100%' }}>
        {/* Main content area */}
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left panel - File list */}
          <Paper
            elevation={0}
            sx={{
              width: 250,
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Files
              </Typography>
            </Box>

            {loadingFiles ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : files.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedInstrument ? 'No files in live data directory' : 'Select an instrument'}
                </Typography>
              </Box>
            ) : (
              <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                {files.map((file) => (
                  <ListItemButton
                    key={file}
                    selected={file === selectedFile}
                    onClick={() => handleFileSelect(file)}
                    sx={{ py: 0.5, px: 1.5 }}
                  >
                    <ListItemText
                      primary={file}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>

          {/* Right panel - 2D Viewer */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
            {/* Error messages */}
            {(error || sseError) && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                }}
              >
                <Alert severity="error" onClose={() => setError(null)}>
                  {error || sseError}
                </Alert>
              </Box>
            )}

            {/* Viewer */}
            <Viewer2D key={viewerKey} filepath={selectedFilePath} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LiveData;
