import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CloseIcon from '@mui/icons-material/Close';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  PaperProps,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';

import { useLiveLogsSSE } from '../../lib/useLiveLogs';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

interface LiveLogViewerProps {
  open: boolean;
  onClose: () => void;
  instrumentName: string;
}

const WaitingDots = (): ReactNode => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <span>Waiting{dots}</span>;
};

function PaperComponent(props: PaperProps): ReactNode {
  const theme = useTheme();
  const chrome = getJobTableChromeColors(theme.palette.mode);
  return (
    // Add the cancel prop to ignore the protected areas
    <Draggable handle=".drag-handle" cancel=".no-drag">
      <Paper
        {...props}
        sx={{
          pointerEvents: 'auto', // Let the Paper catch all clicks, including the resize grabber
          resize: 'both',
          overflow: 'hidden',
          width: 760,
          maxWidth: 'calc(100vw - 32px)',
          minWidth: 'min(450px, calc(100vw - 32px))',
          minHeight: 'min(300px, calc(100dvh - 32px))',
          maxHeight: 'calc(100dvh - 32px)',
          m: 2,
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${chrome.border}`,
          borderRadius: 0,
          backgroundColor: chrome.surface,
          backgroundImage: 'none',
          color: chrome.text,
          boxShadow: 'none',
          '& .MuiCircularProgress-root': { color: chrome.accent },
          '& .MuiButton-root, & .MuiIconButton-root': {
            minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
            borderRadius: 0,
            boxShadow: 'none',
            textTransform: 'none',
            '&:focus-visible': { outline: `2px solid ${chrome.accent}`, outlineOffset: -2 },
          },
          ...props.sx,
        }}
      />
    </Draggable>
  );
}
export const LiveLogViewer: React.FC<LiveLogViewerProps> = ({ open, onClose, instrumentName }) => {
  const theme = useTheme();
  const chrome = getJobTableChromeColors(theme.palette.mode);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const { isConnected, logs, error } = useLiveLogsSSE(instrumentName, open);
  const validLogs = logs.filter((log) => log.msg && log.msg !== '[]' && log.msg.trim() !== '');

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScrollEnabled && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [logs, isAutoScrollEnabled]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // If the user scrolls UP, disable autoscroll.
    // We use a small tolerance (2px) to avoid accidental triggers from minor rendering jitters.
    if (scrollTop < lastScrollTopRef.current - 2) {
      setIsAutoScrollEnabled(false);
    }

    // If the user scrolls back to the bottom (or the system scrolls us there), re-enable autoscroll.
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
    if (isAtBottom) {
      setIsAutoScrollEnabled(true);
    }

    lastScrollTopRef.current = scrollTop;
  };

  const resumeAutoScroll = (): void => {
    setIsAutoScrollEnabled(true);
  };

  const getLogColor = (level: string): string => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return theme.palette.error.main;
      case 'WARNING':
        return theme.palette.warning.main;
      case 'INFO':
        return theme.palette.info.main;
      case 'DEBUG':
        return alpha(chrome.text, 0.75);
      default:
        return chrome.text;
    }
  };

  // Helper to format the timestamp
  const formatTime = (ts: number): string => {
    return new Date(Math.floor(ts)).toLocaleTimeString();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperComponent={PaperComponent}
      aria-labelledby="draggable-dialog-title"
      hideBackdrop
      disableEnforceFocus
      maxWidth={false} // CRUCIAL: Disables MUI's strict widths so CSS resize: both works
      sx={{ pointerEvents: 'none' }}
    >
      {/* TOP DRAG HANDLE */}
      <DialogTitle
        className="drag-handle"
        id="draggable-dialog-title"
        sx={{
          cursor: 'move',
          pointerEvents: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          flexShrink: 0,
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: chrome.header,
          borderBottom: `1px solid ${chrome.border}`,
          px: 1.5,
          py: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography
            component="span"
            variant="body2"
            noWrap
            sx={{
              fontWeight: 700,
            }}
          >
            Live logs: {instrumentName}
          </Typography>
          {!isConnected && !error && <CircularProgress size={16} />}
        </Box>

        <Box className="no-drag" sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {/* Timestamp Toggle */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showTimestamps}
                onChange={(e) => setShowTimestamps(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: chrome.accent },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: chrome.accent },
                }}
              />
            }
            label={<Typography variant="caption">Timestamps</Typography>}
            sx={{ m: 0 }}
          />
          <IconButton
            aria-label="Close live logs"
            onClick={onClose}
            size="small"
            sx={{ width: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT, color: chrome.accent, '&:hover': { bgcolor: chrome.hover } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* LOG CONTENT BODY */}
      <DialogContent
        sx={{
          pointerEvents: 'auto',
          bgcolor: chrome.surface,
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1, // Ensures this space fills when the user resizes the window
          minHeight: 0,
          height: '400px', // Initial height
          position: 'relative',
        }}
      >
        <Box
          ref={logContainerRef}
          onScroll={handleScroll}
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: `${chrome.border} ${chrome.header}`,
            p: 2,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {error && (
            <Typography color="error" sx={{ mb: 1 }}>
              Connection Error: {error}. Retrying...
            </Typography>
          )}

          {validLogs.length === 0 && isConnected && !error && (
            <Typography variant="body2" sx={{ color: alpha(chrome.text, 0.75), fontStyle: 'italic' }}>
              Connected. <WaitingDots />
            </Typography>
          )}

          {validLogs.map((log) => (
            <Box
              key={log.timestamp}
              sx={{
                display: 'flex',
                mb: 0.5,
                gap: 0, // Consistent spacing between our "columns"
                alignItems: 'flex-start', // Keeps timestamps/levels at the top if a long message wraps to multiple lines
              }}
            >
              {showTimestamps && (
                <Box
                  component="span"
                  sx={{
                    color: alpha(chrome.text, 0.75),
                    flexShrink: 0,
                    width: '9ch', // Safely accommodates HH:MM:SS AM/PM
                    textAlign: 'left',
                  }}
                >
                  {formatTime(log.timestamp)}
                </Box>
              )}

              <Box
                component="span"
                sx={{
                  color: getLogColor(log.level),
                  fontWeight: 'bold',
                  width: '10ch', // Safely accommodates the longest standard Python level: [CRITICAL]
                  flexShrink: 0,
                  textAlign: 'left',
                }}
              >
                [{log.level}]
              </Box>

              <Box
                component="span"
                sx={{
                  color: chrome.text,
                  textAlign: 'left',
                  flexGrow: 1, // Takes up all remaining space
                }}
              >
                {log.msg}
              </Box>
            </Box>
          ))}
          <div ref={logsEndRef} />
        </Box>
        {!isAutoScrollEnabled && (
          <Button
            variant="contained"
            size="small"
            onClick={resumeAutoScroll}
            startIcon={<ArrowDownwardIcon />}
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              borderRadius: 0,
              border: `1px solid ${chrome.accent}`,
              textTransform: 'none',
              bgcolor: chrome.accent,
              color: chrome.accentContrast,
              '&:hover': {
                bgcolor: chrome.accent,
                boxShadow: 'none',
              },
              boxShadow: 'none',
              zIndex: 10,
            }}
          >
            Resume autoscroll
          </Button>
        )}
      </DialogContent>

      {/* BOTTOM DRAG HANDLE */}
      <Box
        className="drag-handle"
        sx={{
          cursor: 'move',
          pointerEvents: 'auto',
          height: '24px',
          flexShrink: 0,
          bgcolor: chrome.header,
          borderTop: `1px solid ${chrome.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Padding right ensures the drag handle doesn't cover the native CSS resize grabber in the corner
          pr: 2,
        }}
      >
        <DragHandleIcon fontSize="small" sx={{ opacity: 0.5 }} />
      </Box>
    </Dialog>
  );
};
