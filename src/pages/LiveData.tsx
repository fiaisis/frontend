import '@h5web/lib/styles.css';
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
import { jwtDecode } from 'jwt-decode';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useHistory, useParams } from 'react-router-dom';

import Viewer2D from '../components/experimentViewer/Viewer2D';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import { instruments as allInstruments } from '../lib/instrumentData';
import { fetchLiveDataFiles, fetchLiveDataInstruments } from '../lib/plottingServiceAPI';
import { outputFilter } from '../lib/types';
import { useLiveDataSSE } from '../lib/useLiveDataSSE';

const LiveData: React.FC = (): JSX.Element => {
  const { instrumentName } = useParams<{ instrumentName?: string }>();
  // Instrument selection
  const [instruments, setInstruments] = useState<string[]>([]);
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

  const breadcrumbTrailingCrumb = [
    <InstrumentSelector
      key="instrument"
      selectedInstrument={selectedInstrument || 'ALL'}
      handleInstrumentChange={handleInstrumentChange}
      variant="breadcrumb"
      instrumentOptions={liveDataInstrumentOptions}
      showAllInstrumentsOption={false}
      disabled={loadingInstruments || liveDataInstrumentOptions.length === 0}
    />,
    ...(userRole === 'staff' && selectedInstrument
      ? [
          <MuiLink
            key="edit-script"
            component={RouterLink}
            underline="hover"
            to={`/live-data/${selectedInstrument}/edit-script`}
          >
            Click to edit script
          </MuiLink>,
        ]
      : []),
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
          mb: 2,
          pr: { xs: 2, sm: 8 },
        }}
      >
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <NavArrows trailingCrumb={breadcrumbTrailingCrumb} replaceLastCrumb={Boolean(instrumentName)} />
          <Typography variant="h3" component="h1" sx={{ color: 'text.primary', px: '20px', pt: 2, pb: 1 }}>
            Live data
          </Typography>
        </Box>
        <Chip
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'default'}
          size="small"
          variant="outlined"
          sx={{
            flex: '0 0 auto',
            mt: 2,
            ml: 'auto',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, width: '100%' }}>
        {/* Main content area */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left panel - File list */}
          <Paper
            elevation={0}
            sx={{
              width: 250,
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
