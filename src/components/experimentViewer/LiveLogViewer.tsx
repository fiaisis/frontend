import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Box,
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
import CloseIcon from '@mui/icons-material/Close';
import Draggable from 'react-draggable';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { useLiveLogsSSE } from '../../lib/useLiveLogs';

interface LiveLogViewerProps {
  open: boolean;
  onClose: () => void;
  instrumentName: string;
}

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
  return (
    // Add the cancel prop to ignore the protected areas
    <Draggable handle=".drag-handle" cancel=".no-drag">
      <Paper
        {...props}
        sx={{
          pointerEvents: 'auto', // Let the Paper catch all clicks, including the resize grabber
          resize: 'both',
          overflow: 'hidden',
          minWidth: '450px',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          ...props.sx,
        }}
      />
    </Draggable>
  );
}
export const LiveLogViewer: React.FC<LiveLogViewerProps> = ({ open, onClose, instrumentName }) => {
  const theme = useTheme();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);

  const { isConnected, logs, error } = useLiveLogsSSE(instrumentName, open);
  const validLogs = logs.filter((log) => log.msg && log.msg !== '[]' && log.msg.trim() !== '');

  // Auto-scroll to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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
        return theme.palette.text.secondary;
      default:
        return theme.palette.text.primary;
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
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          borderBottom: `1px solid ${theme.palette.divider}`,
          p: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Live Logs: {instrumentName}
          </Typography>
          {!isConnected && !error && <CircularProgress size={16} />}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Timestamp Toggle */}
          <FormControlLabel
            control={
              <Switch size="small" checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} />
            }
            label={<Typography variant="caption">Timestamps</Typography>}
            sx={{ m: 0 }}
          />
          <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* LOG CONTENT BODY */}
      <DialogContent
        sx={{
          pointerEvents: 'auto',
          bgcolor: theme.palette.mode === 'dark' ? '#121212' : '#fafafa',
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1, // Ensures this space fills when the user resizes the window
          height: '400px', // Initial height
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
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
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
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
                    color: theme.palette.text.secondary,
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
                  color: theme.palette.text.primary,
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
      </DialogContent>

      {/* BOTTOM DRAG HANDLE */}
      <Box
        className="drag-handle"
        sx={{
          cursor: 'move',
          pointerEvents: 'auto',
          height: '24px',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          borderTop: `1px solid ${theme.palette.divider}`,
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
