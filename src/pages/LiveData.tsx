import '@h5web/lib/styles.css';
import Edit from '@mui/icons-material/Edit';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Link as MuiLink,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { jwtDecode } from 'jwt-decode';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useHistory, useParams } from 'react-router-dom';

import Viewer2D from '../components/experimentViewer/Viewer2D';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../components/jobs/constants';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { getPageHeaderControlSx } from '../components/navigation/pageHeaderStyles';
import { viewerColumnsSx, viewerContentSx, viewerSidebarSx } from '../components/viewer/layout';
import { instruments as allInstruments } from '../lib/instrumentData';
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
  const selectedInstrument = instrumentName
    ? (allInstruments.find((instrument) => instrument.name.toLowerCase() === instrumentName.toLowerCase())?.name ??
      instrumentName)
    : null;

  // File list
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileRequestId = useRef(0);
  const history = useHistory();
  const [userRole, setUserRole] = useState<'staff' | 'user' | null>(null);
  const [supportedInstruments, setSupportedInstruments] = useState<readonly string[]>(
    LIVE_SUPPORTED_INSTRUMENTS_FALLBACK
  );

  useEffect(() => {
    let active = true;
    void fetchLiveDataInstruments()
      .then((names) => {
        if (active && Array.isArray(names) && names.every((name) => typeof name === 'string')) {
          setSupportedInstruments(names);
        }
      })
      .catch(() => {
        // Retain the confirmed fallback list without blocking the viewer.
      });
    return () => {
      active = false;
    };
  }, []);

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
  const selectedFilePath = selectedInstrument && directory && selectedFile ? `${directory}/${selectedFile}` : null;

  useEffect(() => {
    if (selectedInstrument && selectedInstrument !== instrumentName) {
      history.replace(`/live-data/${selectedInstrument}`);
    }
  }, [history, instrumentName, selectedInstrument]);

  // Fetch files when instrument changes
  const loadFiles = useCallback(
    async (resetSelection: boolean = false): Promise<void> => {
      const requestId = ++fileRequestId.current;
      if (!selectedInstrument) {
        setFiles([]);
        setSelectedFile(null);
        setLoadingFiles(false);
        setError(null);
        return;
      }

      try {
        setLoadingFiles(true);
        setError(null);
        if (resetSelection) {
          setFiles([]);
          setSelectedFile(null);
        }
        const fileList = await fetchLiveDataFiles(selectedInstrument);
        if (requestId !== fileRequestId.current) return;
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
        if (requestId !== fileRequestId.current) return;
        console.error('Failed to load files:', err);
        setError('Failed to load files from live data directory');
        setFiles([]);
        setSelectedFile(null);
      } finally {
        if (requestId === fileRequestId.current) setLoadingFiles(false);
      }
    },
    [selectedInstrument]
  );

  useEffect(() => {
    void loadFiles(true);
    return () => {
      fileRequestId.current += 1;
    };
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
    const nextInstrument = instrument === 'ALL' ? null : instrument;
    if (nextInstrument === selectedInstrument) return;
    setFiles([]);
    setSelectedFile(null);
    setError(null);
    history.push(nextInstrument ? `/live-data/${nextInstrument}` : '/live-data');
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
      support={{ page: 'live-data', instruments: supportedInstruments }}
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
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
        color: viewerChrome.text,
        '& .MuiCircularProgress-root': { color: viewerChrome.accent },
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          width: '100%',
          boxSizing: 'border-box',
          px: 2,
          pb: 2,
        }}
      >
        {/* Main content area */}
        <Box sx={viewerColumnsSx}>
          {/* Left panel - File list */}
          <Paper
            elevation={0}
            square
            sx={{
              ...viewerSidebarSx,
              height: { xs: 180, md: 'auto' },
              border: `1px solid ${viewerChrome.border}`,
              backgroundColor: viewerChrome.surface,
              color: viewerChrome.text,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {!selectedInstrument ? null : loadingFiles ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} aria-label="Loading live data files" />
              </Box>
            ) : files.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: alpha(viewerChrome.text, 0.75) }}>
                  No files in live data directory
                </Typography>
              </Box>
            ) : (
              <List
                aria-label="Live data files"
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  py: 0,
                  scrollbarWidth: 'thin',
                  scrollbarColor: `${viewerChrome.border} ${viewerChrome.header}`,
                }}
              >
                {files.map((file) => (
                  <ListItemButton
                    key={file}
                    selected={file === selectedFile}
                    onClick={() => handleFileSelect(file)}
                    sx={{
                      minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                      py: 0.5,
                      px: 1.5,
                      borderBottom: `1px solid ${viewerChrome.border}`,
                      borderRadius: 0,
                      '&:hover, &.Mui-focusVisible': { backgroundColor: viewerChrome.hover },
                      '&:focus-visible': { outline: `2px solid ${viewerChrome.accent}`, outlineOffset: -2 },
                      '&.Mui-selected': {
                        color: viewerChrome.accent,
                        backgroundColor: alpha(viewerChrome.accent, 0.12),
                        boxShadow: `inset 3px 0 0 ${viewerChrome.accent}`,
                      },
                      '&.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
                        backgroundColor: alpha(viewerChrome.accent, 0.18),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}>
                      <InsertDriveFileIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={file}
                      primaryTypographyProps={{
                        variant: 'body2',
                        title: file,
                        sx: {
                          fontWeight: file === selectedFile ? 600 : 400,
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
          <Box
            sx={{
              ...viewerContentSx,
              position: 'relative',
              overflow: 'hidden',
              border: `1px solid ${viewerChrome.border}`,
              borderRadius: 0,
              backgroundColor: viewerChrome.surface,
            }}
          >
            {/* Error messages */}
            {(error || sseError) && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                  maxWidth: 'calc(100% - 32px)',
                }}
              >
                <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 0 }}>
                  {error || sseError}
                </Alert>
              </Box>
            )}

            {/* Viewer */}
            <Viewer2D
              refreshKey={viewerKey}
              filepath={selectedFilePath}
              emptyTitle={selectedInstrument ? undefined : 'Select an instrument to view live data'}
              emptyMessage={selectedInstrument ? undefined : 'Use Browse instruments to choose an instrument.'}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LiveData;
