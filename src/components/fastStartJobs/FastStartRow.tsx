import {
  CheckCircleOutline,
  Close,
  ContentCopy,
  ErrorOutline,
  HighlightOff,
  Schedule,
  Tag,
  VpnKey,
  WarningAmber,
  WorkOutline,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Modal,
  SxProps,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';

import { formatUtcForLocale } from '../../lib/timezone';
import { Job } from '../../lib/types';
import { JOB_TABLE_ROW_HEIGHT } from '../jobs/constants';

const ellipsisTextSx: SxProps<Theme> = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const useOverflowStatus = (content: string): [React.RefObject<HTMLSpanElement>, boolean] => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const updateOverflowStatus = useCallback(() => {
    const element = textRef.current;
    setIsOverflowing(Boolean(element && element.scrollWidth > element.clientWidth));
  }, []);

  useEffect(() => {
    updateOverflowStatus();

    const element = textRef.current;
    if (!element) {
      return undefined;
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateOverflowStatus);
    resizeObserver?.observe(element);
    window.addEventListener('resize', updateOverflowStatus);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateOverflowStatus);
    };
  }, [content, updateOverflowStatus]);

  return [textRef, isOverflowing];
};

const EllipsisTooltipText: React.FC<{
  value: string | number;
  sx?: SxProps<Theme>;
}> = ({ value, sx }) => {
  const text = String(value);
  const [textRef, isOverflowing] = useOverflowStatus(text);

  return (
    <Tooltip
      title={text}
      disableFocusListener={!isOverflowing}
      disableHoverListener={!isOverflowing}
      disableTouchListener={!isOverflowing}
    >
      <Typography
        ref={textRef}
        component="span"
        variant="body2"
        sx={[ellipsisTextSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      >
        {text}
      </Typography>
    </Tooltip>
  );
};

export const FastStartJobStatusIcon: React.FC<{ state: string }> = ({ state }): ReactElement => {
  const icons: Record<string, ReactElement> = {
    ERROR: <ErrorOutline color="error" />,
    SUCCESSFUL: <CheckCircleOutline color="success" />,
    UNSUCCESSFUL: <WarningAmber color="warning" />,
    NOT_STARTED: <HighlightOff color="action" />,
  };

  return (
    <Box component="span" aria-label={`Job state: ${state}`} sx={{ display: 'inline-flex' }}>
      {icons[state] || <ErrorOutline />}
    </Box>
  );
};

const panelActionButtonSx: SxProps<Theme> = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#90caf9' : '#1565c0';

  return {
    flexShrink: 0,
    whiteSpace: 'nowrap',
    minHeight: 34,
    color: isDark ? '#f5f7fa' : '#263238',
    borderColor: isDark ? '#71869a' : '#7a8896',
    backgroundColor: isDark ? '#1b2834' : '#ffffff',
    boxShadow: 'none',
    '& .MuiSvgIcon-root': { color: 'inherit' },
    '&:hover': {
      color: isDark ? '#ffffff' : '#102a43',
      borderColor: accent,
      backgroundColor: isDark ? '#263746' : '#eef5fc',
      boxShadow: 'none',
    },
    '&.Mui-disabled': {
      color: isDark ? '#91a1af' : '#6f7c87',
      borderColor: isDark ? '#4b5c6b' : '#c4ccd3',
      backgroundColor: isDark ? '#202b35' : '#eef1f4',
    },
  };
};

const panelIconButtonSx: SxProps<Theme> = (theme) => {
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#90caf9' : '#1565c0';

  return {
    width: 40,
    height: 40,
    border: '1px solid',
    borderColor: isDark ? '#71869a' : '#7a8896',
    color: isDark ? '#f5f7fa' : '#263238',
    backgroundColor: isDark ? '#1b2834' : '#ffffff',
    '&:hover': {
      borderColor: accent,
      color: isDark ? '#ffffff' : '#102a43',
      backgroundColor: isDark ? '#263746' : '#eef5fc',
    },
  };
};

const detailScrollableContentSx: SxProps<Theme> = (theme) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  p: { xs: 1.5, sm: 2.5 },
  backgroundColor: theme.palette.mode === 'dark' ? '#10171f' : '#ffffff',
  scrollbarColor: `${theme.palette.mode === 'dark' ? '#4a5a69' : '#aab6c2'} transparent`,
  '&::-webkit-scrollbar': { width: 10 },
  '&::-webkit-scrollbar-thumb': {
    border: '3px solid transparent',
    borderRadius: 8,
    backgroundClip: 'padding-box',
    backgroundColor: theme.palette.mode === 'dark' ? '#4a5a69' : '#aab6c2',
  },
});

const detailActionBarSx: SxProps<Theme> = (theme) => ({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 1,
  minHeight: 60,
  px: { xs: 1.5, sm: 2.5 },
  py: 1.25,
  borderTop: '1px solid',
  borderTopColor: theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea',
  backgroundColor: theme.palette.mode === 'dark' ? '#151e27' : '#f7f9fc',
  boxShadow: theme.palette.mode === 'dark' ? '0 -8px 24px rgba(0, 0, 0, 0.16)' : '0 -8px 24px rgba(35, 55, 75, 0.06)',
});

const detailSectionHeaderSx: SxProps<Theme> = (theme) => ({
  flexShrink: 0,
  px: 2.5,
  py: 1.5,
  borderBottom: '1px solid',
  borderBottomColor: theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea',
  backgroundColor: theme.palette.mode === 'dark' ? '#151e27' : '#f5f8fc',
});

const detailTableSx: SxProps<Theme> = {
  tableLayout: 'fixed',
  border: '1px solid',
  borderColor: (theme) => (theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea'),
  backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#151e27' : '#fbfcfe'),
  '& .MuiTableCell-root': {
    py: 0.75,
    px: 1,
    borderBottom: '1px solid',
    borderBottomColor: (theme) => (theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea'),
  },
  '& .MuiTableCell-root:not(:last-child)': {
    borderRight: '1px solid',
    borderRightColor: (theme) => (theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea'),
  },
  '& .MuiTableRow-root:last-of-type .MuiTableCell-root': {
    borderBottom: 0,
  },
};

const codeBlockSx: SxProps<Theme> = (theme) => ({
  m: 0,
  p: 1.5,
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea',
  borderRadius: 1,
  backgroundColor: theme.palette.mode === 'dark' ? '#151e27' : '#f8fafc',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
});

const DetailItem: React.FC<{ icon: ReactElement; label: string; value: string | number }> = ({
  icon,
  label,
  value,
}) => (
  <TableRow>
    <TableCell component="th" scope="row" sx={{ width: '45%', minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ display: 'inline-flex', color: 'text.secondary', flexShrink: 0 }}>{icon}</Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
      </Box>
    </TableCell>
    <TableCell sx={{ minWidth: 0 }}>
      <EllipsisTooltipText value={value} />
    </TableCell>
  </TableRow>
);

const FastStartJobStatus: React.FC<{ state: string; statusMessage: string }> = ({ state, statusMessage }) => {
  const theme = useTheme();
  const statusTexts: Record<string, { color: string; message: string }> = {
    ERROR: { color: theme.palette.error.dark, message: `[ERROR] ${statusMessage || 'Job encountered an error'}` },
    SUCCESSFUL: { color: theme.palette.success.main, message: '[SUCCESS] Job completed successfully' },
    NOT_STARTED: {
      color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.grey[700],
      message: '[NOT STARTED] This job has not been started yet',
    },
    UNSUCCESSFUL: {
      color: theme.palette.warning.main,
      message: `[UNSUCCESSFUL] ${statusMessage || 'Job was unsuccessful'}`,
    },
  };

  const status = statusTexts[state];
  return status ? (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        maxWidth: '100%',
        boxSizing: 'border-box',
        px: 1,
        py: 0.375,
        border: '1px solid',
        borderColor: alpha(status.color, 0.4),
        borderRadius: 1,
        backgroundColor: alpha(status.color, theme.palette.mode === 'dark' ? 0.16 : 0.1),
      }}
    >
      <Typography variant="caption" noWrap title={status.message} sx={{ color: status.color, fontWeight: 700 }}>
        {status.message}
      </Typography>
    </Box>
  ) : null;
};

interface ParsedFastStartOutputs {
  exitCode?: number | string | null;
  stdout?: string | null;
  stderr?: string | null;
  raw?: string | null;
}

const parseFastStartOutputs = (outputs: string | null | undefined): ParsedFastStartOutputs => {
  if (!outputs) {
    return {};
  }

  try {
    const parsed = JSON.parse(outputs) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      ('stdout' in parsed || 'stderr' in parsed || 'exit_code' in parsed)
    ) {
      const record = parsed as Record<string, unknown>;
      return {
        exitCode:
          typeof record.exit_code === 'number' || typeof record.exit_code === 'string' ? record.exit_code : null,
        stdout: typeof record.stdout === 'string' ? record.stdout : null,
        stderr: typeof record.stderr === 'string' ? record.stderr : null,
      };
    }
  } catch {
    // Fall back to displaying raw output string
  }

  return { raw: outputs };
};

const FastStartJobOutputsPanel: React.FC<{ job: Job }> = ({ job }) => {
  const parsed = parseFastStartOutputs(job.outputs);
  const hasStructuredOutput =
    parsed.exitCode !== undefined || parsed.stdout !== undefined || parsed.stderr !== undefined;
  const showStacktrace = (job.state === 'UNSUCCESSFUL' || job.state === 'ERROR') && Boolean(job.stacktrace);

  if (!hasStructuredOutput && !parsed.raw && !showStacktrace) {
    return (
      <Typography variant="body2" color="text.secondary">
        No output available
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {hasStructuredOutput && (
        <>
          {parsed.exitCode !== undefined && parsed.exitCode !== null && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Exit code
              </Typography>
              <Box component="pre" sx={codeBlockSx}>
                {String(parsed.exitCode)}
              </Box>
            </Box>
          )}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Standard output
            </Typography>
            <Box component="pre" sx={codeBlockSx}>
              {parsed.stdout ? parsed.stdout : 'No standard output'}
            </Box>
          </Box>
          {Boolean(parsed.stderr) && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Standard error
              </Typography>
              <Box component="pre" sx={codeBlockSx}>
                {parsed.stderr}
              </Box>
            </Box>
          )}
        </>
      )}

      {Boolean(parsed.raw) && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Output
          </Typography>
          <Box component="pre" sx={codeBlockSx}>
            {parsed.raw}
          </Box>
        </Box>
      )}

      {showStacktrace && (
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: (theme: Theme) => alpha(theme.palette.error.main, 0.35),
            borderRadius: 1,
            backgroundColor: (theme: Theme) => alpha(theme.palette.error.main, 0.06),
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Stacktrace
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {job.stacktrace}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const FastStartJobDetailsContent: React.FC<{ job: Job }> = ({ job }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const scriptValue = job.script?.value ?? '';

  const handleCopyScript = async (): Promise<void> => {
    if (!scriptValue || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(scriptValue);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy script:', error);
    }
  };

  const jobDetails = [
    {
      icon: <Tag fontSize="small" />,
      label: 'Job ID:',
      value: job.id,
    },
    {
      icon: <VpnKey fontSize="small" />,
      label: 'Experiment number:',
      value: job.run?.experiment_number ?? 'N/A',
    },
    {
      icon: <WorkOutline fontSize="small" />,
      label: 'Job type:',
      value: 'Fast start',
    },
    {
      icon: <Schedule fontSize="small" />,
      label: 'Job start:',
      value: formatUtcForLocale(job.start) || 'N/A',
    },
    {
      icon: <Schedule fontSize="small" />,
      label: 'Job end:',
      value: formatUtcForLocale(job.end) || 'N/A',
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        backgroundColor: (theme: Theme) => (theme.palette.mode === 'dark' ? '#10171f' : '#ffffff'),
      }}
    >
      {!isLargeScreen && (
        <Tabs
          value={activeTab}
          onChange={(_event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue)}
          aria-label="Job details"
          variant="fullWidth"
          data-testid="fast-start-job-details-tabs"
          sx={(theme: Theme) => {
            const accent = theme.palette.mode === 'dark' ? '#90caf9' : '#1565c0';
            const mutedText = theme.palette.mode === 'dark' ? '#aebdca' : '#536170';

            return {
              flexShrink: 0,
              minHeight: 50,
              px: { xs: 0.5, sm: 1.5 },
              borderBottom: '1px solid',
              borderBottomColor: theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea',
              backgroundColor: theme.palette.mode === 'dark' ? '#151e27' : '#f5f8fc',
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                backgroundColor: accent,
              },
              '& .MuiTab-root': {
                flex: '1 1 0',
                minWidth: 0,
                maxWidth: 'none',
                minHeight: 50,
                px: { xs: 1.5, sm: 2.25 },
                color: mutedText,
                fontSize: '0.9rem',
                fontWeight: 650,
                letterSpacing: '0.01em',
                textTransform: 'none',
                transition: 'color 120ms ease, background-color 120ms ease',
                '&:hover': {
                  color: accent,
                  backgroundColor: alpha(accent, 0.07),
                },
                '&.Mui-selected': {
                  color: accent,
                  backgroundColor: alpha(accent, theme.palette.mode === 'dark' ? 0.13 : 0.08),
                },
              },
            };
          }}
        >
          <Tab id="fast-start-tab-script" aria-controls="fast-start-tabpanel-script" label="Job script" />
          <Tab id="fast-start-tab-details" aria-controls="fast-start-tabpanel-details" label="Job details" />
          <Tab id="fast-start-tab-outputs" aria-controls="fast-start-tabpanel-outputs" label="Job outputs" />
        </Tabs>
      )}

      <Box
        data-testid="fast-start-job-details-content"
        sx={{
          display: 'grid',
          gridTemplateColumns: isLargeScreen ? 'repeat(3, minmax(0, 1fr))' : 'minmax(0, 1fr)',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          id="fast-start-tabpanel-script"
          role={isLargeScreen ? 'region' : 'tabpanel'}
          aria-labelledby={isLargeScreen ? 'fast-start-section-script-heading' : 'fast-start-tab-script'}
          hidden={!isLargeScreen && activeTab !== 0}
          sx={{
            display: isLargeScreen || activeTab === 0 ? 'flex' : 'none',
            minWidth: 0,
            minHeight: 0,
            flexDirection: 'column',
            borderRight: isLargeScreen ? '1px solid' : 0,
            borderRightColor: (theme: Theme) => (theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea'),
          }}
        >
          {isLargeScreen && (
            <Box sx={detailSectionHeaderSx}>
              <Typography id="fast-start-section-script-heading" component="h3" variant="subtitle1" fontWeight={700}>
                Job script
              </Typography>
            </Box>
          )}
          {(isLargeScreen || activeTab === 0) && (
            <>
              <Box sx={detailScrollableContentSx}>
                {scriptValue ? (
                  <Box component="pre" data-testid="fast-start-job-script" sx={codeBlockSx}>
                    {scriptValue}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No script available
                  </Typography>
                )}
              </Box>
              <Box data-testid="fast-start-script-actions" sx={detailActionBarSx}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopy />}
                  disabled={!scriptValue}
                  onClick={() => void handleCopyScript()}
                  sx={panelActionButtonSx}
                >
                  {copied ? 'Copied' : 'Copy script'}
                </Button>
              </Box>
            </>
          )}
        </Box>

        <Box
          id="fast-start-tabpanel-details"
          role={isLargeScreen ? 'region' : 'tabpanel'}
          aria-labelledby={isLargeScreen ? 'fast-start-section-details-heading' : 'fast-start-tab-details'}
          hidden={!isLargeScreen && activeTab !== 1}
          sx={{
            display: isLargeScreen || activeTab === 1 ? 'flex' : 'none',
            minWidth: 0,
            minHeight: 0,
            flexDirection: 'column',
            borderRight: isLargeScreen ? '1px solid' : 0,
            borderRightColor: (theme: Theme) => (theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea'),
          }}
        >
          {isLargeScreen && (
            <Box sx={detailSectionHeaderSx}>
              <Typography id="fast-start-section-details-heading" component="h3" variant="subtitle1" fontWeight={700}>
                Job details
              </Typography>
            </Box>
          )}
          {(isLargeScreen || activeTab === 1) && (
            <>
              <Box sx={detailScrollableContentSx}>
                <Table size="small" aria-label="Job details" sx={detailTableSx}>
                  <TableBody>
                    {jobDetails.map(({ icon, label, value }, index) => (
                      <DetailItem key={index} icon={icon} label={label} value={value} />
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box data-testid="fast-start-details-actions" aria-hidden="true" sx={detailActionBarSx} />
            </>
          )}
        </Box>

        <Box
          id="fast-start-tabpanel-outputs"
          role={isLargeScreen ? 'region' : 'tabpanel'}
          aria-labelledby={isLargeScreen ? 'fast-start-section-outputs-heading' : 'fast-start-tab-outputs'}
          hidden={!isLargeScreen && activeTab !== 2}
          sx={{
            display: isLargeScreen || activeTab === 2 ? 'flex' : 'none',
            minWidth: 0,
            minHeight: 0,
            flexDirection: 'column',
          }}
        >
          {isLargeScreen && (
            <Box sx={detailSectionHeaderSx}>
              <Typography id="fast-start-section-outputs-heading" component="h3" variant="subtitle1" fontWeight={700}>
                Job outputs
              </Typography>
            </Box>
          )}
          {(isLargeScreen || activeTab === 2) && (
            <>
              <Box sx={detailScrollableContentSx}>
                <FastStartJobOutputsPanel job={job} />
              </Box>
              <Box data-testid="fast-start-outputs-actions" aria-hidden="true" sx={detailActionBarSx} />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const FastStartJobDetailsModal: React.FC<{
  open: boolean;
  job: Job | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}> = ({ open, job, loading, error, onRetry, onClose }) => (
  <Modal
    open={open}
    onClose={onClose}
    disableScrollLock
    aria-label="Fast start job details"
    sx={(theme: Theme) => ({
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: theme.zIndex.modal,
      pointerEvents: 'auto',
    })}
    BackdropProps={{
      'data-testid': 'fast-start-job-details-backdrop',
      sx: {
        position: 'fixed',
        backgroundColor: 'rgba(5, 10, 16, 0.58)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
      },
    }}
  >
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Fast start job details"
      data-testid="fast-start-job-details-modal"
      sx={(theme: Theme) => ({
        display: 'flex',
        flexDirection: 'column',
        width: 'calc(100% - 32px)',
        maxWidth: 1600,
        height: 'calc(100% - 32px)',
        maxHeight: 720,
        minHeight: 0,
        overflow: 'hidden',
        color: theme.palette.mode === 'dark' ? '#f2f6fa' : '#1f2a35',
        backgroundColor: theme.palette.mode === 'dark' ? '#10171f' : '#ffffff',
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? '#3b4a58' : '#cfd8e2',
        borderRadius: 2,
        boxShadow:
          theme.palette.mode === 'dark' ? '0 24px 72px rgba(0, 0, 0, 0.7)' : '0 24px 72px rgba(27, 43, 58, 0.28)',
        outline: 0,
      })}
    >
      <Box
        sx={(theme: Theme) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexShrink: 0,
          px: { xs: 1.5, sm: 2.5 },
          py: 1.25,
          borderBottom: '1px solid',
          borderBottomColor: theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1a2733 0%, #121a22 100%)'
              : 'linear-gradient(135deg, #f8fbff 0%, #edf4fb 100%)',
        })}
      >
        <Box sx={{ minWidth: 0 }}>
          {job && <FastStartJobStatus state={job.state} statusMessage={job.status_message} />}
        </Box>
        <IconButton autoFocus aria-label="Close job details" onClick={onClose} edge="end" sx={panelIconButtonSx}>
          <Close />
        </IconButton>
      </Box>

      {job ? (
        <FastStartJobDetailsContent key={job.id} job={job} />
      ) : (
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={28} />
              <Typography>Loading job details…</Typography>
            </Box>
          ) : error ? (
            <Alert
              severity="error"
              action={
                <Button variant="outlined" size="small" onClick={onRetry} sx={panelActionButtonSx}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}
        </Box>
      )}
    </Box>
  </Modal>
);

const FastStartRow: React.FC<{
  job: Job;
  index: number;
  onOpenDetails: (job: Job) => void;
}> = ({ job, index, onOpenDetails }) => {
  const theme = useTheme();
  const backgroundColor =
    index % 2 === 0
      ? theme.palette.mode === 'light'
        ? '#f0f0f0'
        : theme.palette.mode === 'dark'
          ? '#2d2d2d'
          : '#000000'
      : theme.palette.background.default;
  const hoverBackgroundColor =
    theme.palette.mode === 'light'
      ? '#e0e0e0'
      : theme.palette.mode === 'dark'
        ? index % 2 === 0
          ? '#4c4c4c'
          : '#4a4a4a'
        : '#ffffff';

  const openDetails = (): void => onOpenDetails(job);

  return (
    <TableRow
      aria-label={`View job ${job.id} details`}
      tabIndex={0}
      sx={{
        backgroundColor,
        height: JOB_TABLE_ROW_HEIGHT,
        cursor: 'pointer',
        '& > .MuiTableCell-root': { py: 0.5 },
        '&:hover': { backgroundColor: hoverBackgroundColor },
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
      }}
      onClick={openDetails}
      onKeyDown={(event: React.KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetails();
        }
      }}
    >
      <TableCell align="center" sx={{ px: 1 }}>
        <FastStartJobStatusIcon state={job.state} />
      </TableCell>
      <TableCell sx={{ overflow: 'hidden' }}>
        <EllipsisTooltipText value={job.id} sx={{ fontWeight: 'bold' }} />
      </TableCell>
      <TableCell sx={{ overflow: 'hidden' }}>
        <EllipsisTooltipText value={job.run?.experiment_number ?? 'N/A'} />
      </TableCell>
      <TableCell sx={{ overflow: 'hidden' }}>
        <EllipsisTooltipText value={formatUtcForLocale(job.start) || 'N/A'} />
      </TableCell>
      <TableCell sx={{ overflow: 'hidden' }}>
        <EllipsisTooltipText value={formatUtcForLocale(job.end) || 'N/A'} />
      </TableCell>
    </TableRow>
  );
};

export default FastStartRow;
