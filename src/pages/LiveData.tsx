import '@h5web/lib/styles.css';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
} from '@mui/material';
import Viewer2D from '../components/experimentViewer/Viewer2D';
import NavArrows from '../components/navigation/NavArrows';
import { fetchLiveDataInstruments, fetchLiveDataFiles } from '../lib/plottingServiceAPI';
import { useLiveDataSSE } from '../lib/useLiveDataSSE';

const LiveData: React.FC = (): JSX.Element => {
  // Instrument selection
  const [instruments, setInstruments] = useState<string[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [loadingInstruments, setLoadingInstruments] = useState(true);

  // File list
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Viewer state
  const [viewerKey, setViewerKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // SSE connection
  const { isConnected, directory, changedFile, lastUpdated, error: sseError } = useLiveDataSSE(selectedInstrument, true);

  // Build full file path using directory from SSE and selected file
  const selectedFilePath = directory && selectedFile ? `${directory}/${selectedFile}` : null;

  // Fetch available instruments on mount
  useEffect(() => {
    const loadInstruments = async (): Promise<void> => {
      try {
        setLoadingInstruments(true);
        const instrumentList = await fetchLiveDataInstruments();
        setInstruments(instrumentList);

        // Auto-select first instrument if available
        if (instrumentList.length > 0) {
          setSelectedInstrument(instrumentList[0]);
        }
      } catch (err) {
        console.error('Failed to load instruments:', err);
        setError('Failed to load available instruments');
      } finally {
        setLoadingInstruments(false);
      }
    };

    loadInstruments();
  }, []);

  // Fetch files when instrument changes
  const loadFiles = useCallback(async (): Promise<void> => {
    if (!selectedInstrument) {
      setFiles([]);
      return;
    }

    try {
      setLoadingFiles(true);
      setError(null);
      const fileList = await fetchLiveDataFiles(selectedInstrument);
      setFiles(fileList);

      // Auto-select first file if available and no file is currently selected
      if (fileList.length > 0 && !selectedFile) {
        setSelectedFile(fileList[0]);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files from live data directory');
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedInstrument, selectedFile]);

  useEffect(() => {
    loadFiles();
    // Reset selected file when instrument changes
    setSelectedFile(null);
  }, [selectedInstrument]);

  // Handle file changes from SSE
  useEffect(() => {
    if (!changedFile) {
      return;
    }

    // Refresh file list if a file was added or deleted
    if (changedFile.change_type === 'added' || changedFile.change_type === 'deleted') {
      loadFiles();
    }

    // Refresh viewer if the currently selected file was modified
    if (changedFile.file === selectedFile && changedFile.change_type === 'modified') {
      console.log('[LiveData] Selected file modified, refreshing viewer');
      setViewerKey((prev) => prev + 1);
    }
  }, [changedFile, selectedFile, loadFiles]);

  // Handle instrument change
  const handleInstrumentChange = (instrument: string): void => {
    setSelectedInstrument(instrument);
    setSelectedFile(null);
    setError(null);
  };

  // Handle file selection
  const handleFileSelect = (file: string): void => {
    setSelectedFile(file);
    setViewerKey((prev) => prev + 1);
  };

  // Format last updated time
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) {
      return '';
    }
    return date.toLocaleTimeString();
  };

  return (
    <>
      <NavArrows />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
        {/* Header with instrument selector and status */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h6" sx={{ minWidth: 80 }}>
            Live Data
          </Typography>

          {/* Instrument selector */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="instrument-select-label">Instrument</InputLabel>
            <Select
              labelId="instrument-select-label"
              value={selectedInstrument || ''}
              label="Instrument"
              onChange={(e) => handleInstrumentChange(e.target.value)}
              disabled={loadingInstruments || instruments.length === 0}
            >
              {instruments.map((inst) => (
                <MenuItem key={inst} value={inst}>
                  {inst}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Connection status */}
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />

          {/* Last updated time */}
          {lastUpdated && (
            <Typography variant="body2" color="text.secondary">
              Last update: {formatLastUpdated(lastUpdated)}
            </Typography>
          )}

          {/* Loading indicator */}
          {loadingInstruments && <CircularProgress size={20} />}
        </Box>

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
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                >
                  {error || sseError}
                </Alert>
              </Box>
            )}

            {/* Viewer */}
            <Viewer2D
              key={viewerKey}
              filepath={selectedFilePath}
            />
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default LiveData;
