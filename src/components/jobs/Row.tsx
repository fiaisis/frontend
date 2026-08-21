import {
  CheckCircleOutline,
  Close,
  Download,
  Edit,
  ErrorOutline,
  HighlightOff,
  ImageAspectRatio,
  ChevronRight,
  OpenInNew,
  People,
  Replay,
  Schedule,
  Schema,
  StackedBarChart,
  Visibility,
  VpnKey,
  WarningAmber,
  WorkOutline,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  Modal,
  Snackbar,
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
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import { Link } from 'react-router-dom';

import { JOB_TABLE_ROW_HEIGHT } from './constants';
import { fiaApi } from '../../lib/api';
import { parseJobOutputs } from '../../lib/hooks';
import { formatUtcForLocale } from '../../lib/timezone';
import { Job, MantidVersionMap } from '../../lib/types';

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

const openDataViewer = (jobId: number, instrumentName: string, experimentNumber: number, output: string): void => {
  const url = `/fia/data-viewer/view/${instrumentName}/${experimentNumber}/${output}`;
  window.open(url, '_blank');
  ReactGA.event({
    category: 'Button',
    action: 'Click',
    label: 'View button',
    value: jobId,
  });
};

const JobStatusIcon: React.FC<{ state: string }> = ({ state }: { state: string }): ReactElement => {
  const icons: Record<string, ReactElement> = {
    ERROR: <ErrorOutline color="error" />,
    SUCCESSFUL: <CheckCircleOutline color="success" />,
    UNSUCCESSFUL: <WarningAmber color="warning" />,
    NOT_STARTED: <HighlightOff color="action" />,
  };

  return (
    <Box component="span" aria-label={`Reduction state: ${state}`} sx={{ display: 'inline-flex' }}>
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
    '&.MuiButton-contained': {
      color: isDark ? '#0b1b29' : '#ffffff',
      borderColor: accent,
      backgroundColor: accent,
    },
    '&.MuiButton-contained:hover': {
      color: isDark ? '#07131d' : '#ffffff',
      borderColor: isDark ? '#b8ddfb' : '#0d47a1',
      backgroundColor: isDark ? '#b8ddfb' : '#0d47a1',
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
    '&.Mui-disabled': {
      borderColor: isDark ? '#4b5c6b' : '#c4ccd3',
      color: isDark ? '#91a1af' : '#6f7c87',
      backgroundColor: isDark ? '#202b35' : '#eef1f4',
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
  '& .detail-empty-cell.MuiTableCell-root': {
    borderBottom: '1px solid transparent',
  },
  '& .detail-empty-cell.MuiTableCell-root:not(:last-child)': {
    borderRight: '1px solid transparent',
  },
  '& .MuiTableRow-root:last-of-type .MuiTableCell-root': {
    borderBottom: 0,
  },
};

const DetailItem: React.FC<{ icon: ReactElement; label: string; value: string | number }> = ({
  icon,
  label,
  value,
}) => (
  <TableRow>
    <TableCell component="th" scope="row" sx={{ width: '30%', minWidth: 0 }}>
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

const JobOutput: React.FC<{
  job: Job;
  outputs: string[];
  downloadingSingle: string | null;
  handleDownload: (job: Job, output: string) => Promise<void>;
}> = ({ job, outputs, downloadingSingle, handleDownload }) => {
  if (outputs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No output files to show
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {outputs.map((output, index) => (
        <Box
          key={`${output}-${index}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
            alignItems: 'center',
            gap: 1.5,
            p: 1,
            border: '1px solid',
            borderColor: (theme: Theme) => (theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea'),
            borderRadius: 1,
            minWidth: 0,
            backgroundColor: (theme: Theme) => (theme.palette.mode === 'dark' ? '#151e27' : '#f8fafc'),
            transition: 'border-color 120ms ease, background-color 120ms ease',
            '&:hover': {
              borderColor: (theme: Theme) => alpha(theme.palette.mode === 'dark' ? '#90caf9' : '#1565c0', 0.55),
              backgroundColor: (theme: Theme) => (theme.palette.mode === 'dark' ? '#192530' : '#f3f7fb'),
            },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <EllipsisTooltipText value={output} sx={{ fontWeight: 600 }} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              gap: 1,
              minWidth: 'fit-content',
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNew />}
              onClick={() =>
                openDataViewer(job.id, job.run?.instrument_name || 'unknown', job.run?.experiment_number || 0, output)
              }
              sx={panelActionButtonSx}
            >
              View
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={downloadingSingle === output ? undefined : <Download />}
              onClick={() => handleDownload(job, output)}
              disabled={downloadingSingle === output}
              sx={[panelActionButtonSx, { width: 112 }]}
            >
              {downloadingSingle === output ? <CircularProgress size={22} color="inherit" /> : 'Download'}
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const InputDetailRow: React.FC<{ inputKey: string; value: string | number | boolean | null }> = ({
  inputKey,
  value,
}) => (
  <TableRow>
    <TableCell component="th" scope="row" sx={{ width: '30%', minWidth: 0 }}>
      <EllipsisTooltipText value={`${inputKey}:`} sx={{ color: 'text.secondary', fontWeight: 700 }} />
    </TableCell>
    <TableCell sx={{ minWidth: 0 }}>
      <EllipsisTooltipText value={value === null ? 'null' : String(value)} />
    </TableCell>
  </TableRow>
);

const JobInput: React.FC<{ job: Job }> = ({ job }): ReactElement => {
  const entries = Object.entries(job.inputs);

  return (
    <Table size="small" aria-label="Reduction inputs" sx={detailTableSx}>
      <TableBody>
        {entries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2}>
              <Typography variant="body2" color="text.secondary">
                No input data available
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          entries.map(([key, value], index) => <InputDetailRow key={index} inputKey={key} value={value} />)
        )}
      </TableBody>
    </Table>
  );
};

const JobStatus: React.FC<{ state: string; statusMessage: string }> = ({ state, statusMessage }) => {
  const theme = useTheme();
  const statusTexts: Record<string, { color: string; message: string }> = {
    ERROR: { color: theme.palette.error.dark, message: `[ERROR] ${statusMessage}` },
    SUCCESSFUL: { color: theme.palette.success.main, message: `[SUCCESS] Reduction performed successfully` },
    NOT_STARTED: {
      color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.grey[700],
      message: `[NOT STARTED] This reduction has not been started yet`,
    },
    UNSUCCESSFUL: { color: theme.palette.warning.main, message: `[UNSUCCESSFUL] ${statusMessage}` },
  };

  const status = statusTexts[state];
  return status ? (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        maxWidth: '100%',
        mt: 0.75,
        px: 1,
        py: 0.375,
        border: '1px solid',
        borderColor: alpha(status.color, 0.4),
        borderRadius: 1,
        backgroundColor: alpha(status.color, theme.palette.mode === 'dark' ? 0.16 : 0.1),
      }}
    >
      <Typography variant="caption" sx={{ color: status.color, fontWeight: 700 }}>
        {status.message}
      </Typography>
    </Box>
  ) : null;
};

const extractFilename = (path: string): string => path.split('/').pop()?.split('.')[0] ?? '';

const ReductionDetailsContent: React.FC<{
  job: Job;
  resubmitJob: (job: Job) => Promise<void>;
  refreshJobs: () => void;
  mantidVersions: MantidVersionMap;
}> = ({ job, resubmitJob, refreshJobs, mantidVersions }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const resubmitJobId = useRef<number | null>(null);
  const resubmitSuccessful = useRef<boolean | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [downloadErrorOpen, setDownloadErrorOpen] = useState(false);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState('');

  const jobOutputs = parseJobOutputs(job.outputs);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSingle, setDownloadingSingle] = useState<string | null>(null);

  const handleDownload = async (job: Job, output: string): Promise<void> => {
    try {
      setDownloadingSingle(output);

      const response = await fiaApi.get(`/job/${job.id}/filename/${encodeURIComponent(output)}`, {
        responseType: 'blob',
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        setDownloadErrorMessage(`Download failed with status ${response.status}`);
        setDownloadErrorOpen(true);
        return;
      }

      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = output;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download file:', error);
      setDownloadErrorMessage('An error occurred while downloading the file.');
      setDownloadErrorOpen(true);
    } finally {
      setDownloadingSingle(null);
    }
  };

  const handleDownloadAll = async (): Promise<void> => {
    try {
      setDownloadingAll(true);
      const payload = { [job.id]: jobOutputs };

      const response = await fiaApi.post('/job/download-zip', payload, {
        responseType: 'blob',
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        setDownloadErrorMessage(`Download all failed with status ${response.status}`);
        setDownloadErrorOpen(true);
        return;
      }

      const blob = new Blob([response.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${job.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download-all failed:', err);
      setDownloadErrorMessage('An error occurred while downloading all files.');
      setDownloadErrorOpen(true);
    } finally {
      setDownloadingAll(false);
    }
  };

  const loadingTimeoutRef = useRef<number | null>(null);
  const resubmitFinalizeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current !== null) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (resubmitFinalizeTimeoutRef.current !== null) {
        clearTimeout(resubmitFinalizeTimeoutRef.current);
        resubmitFinalizeTimeoutRef.current = null;
      }
    };
  }, []);

  const handleResubmit = async (): Promise<void> => {
    resubmitJobId.current = job.id;
    setLoading(true);

    // Fallback that clears spinner after 20s if nothing happens
    loadingTimeoutRef.current = window.setTimeout(() => {
      setLoading(false);
      resubmitSuccessful.current = false;
      setSnackbarOpen(true);
    }, 20_000);

    try {
      await resubmitJob(job);
      resubmitSuccessful.current = true;
    } catch (err) {
      console.log('Error resubmitting job', err);
      resubmitSuccessful.current = false;
    } finally {
      if (loadingTimeoutRef.current !== null) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      resubmitFinalizeTimeoutRef.current = window.setTimeout(() => {
        setLoading(false);
        setSnackbarOpen(true);
        refreshJobs();
      }, 2000);
    }
  };

  const runnerImageUrl = job.runner_image && job.runner_image.includes('@') ? job.runner_image.split('@')[1] : null;
  const mantidVersion = runnerImageUrl ? (mantidVersions[runnerImageUrl] ?? null) : null;
  const runDetails = [
    {
      icon: <VpnKey fontSize="small" />,
      label: 'Experiment number:',
      value: job.run.experiment_number || '—',
    },
    {
      icon: <WorkOutline fontSize="small" />,
      label: 'Job type:',
      value: job.type
        ? job.type
            .replace('JobType.', '')
            .toLowerCase()
            .replace(/^\w/, (c) => c.toUpperCase())
        : '—',
    },
    {
      icon: <ImageAspectRatio fontSize="small" />,
      label: 'Mantid version:',
      value: mantidVersion || '—',
    },
    {
      icon: <ImageAspectRatio fontSize="small" />,
      label: 'Runner image:',
      value: job.runner_image || '—',
    },
    {
      icon: <Schema fontSize="small" />,
      label: 'Instrument:',
      value: job.run?.instrument_name || '—',
    },
    {
      icon: <Schedule fontSize="small" />,
      label: 'Reduction start:',
      value: formatUtcForLocale(job.start) || '—',
    },
    {
      icon: <Schedule fontSize="small" />,
      label: 'Reduction end:',
      value: formatUtcForLocale(job.end) || '—',
    },
    {
      icon: <StackedBarChart fontSize="small" />,
      label: 'Good frames:',
      value: job.run?.good_frames?.toLocaleString() || '—',
    },
    {
      icon: <StackedBarChart fontSize="small" />,
      label: 'Raw frames:',
      value: job.run?.raw_frames?.toLocaleString() || '—',
    },
    {
      icon: <People fontSize="small" />,
      label: 'Users:',
      value: job.run?.users || '—',
    },
  ];
  const showStackViewer = job.run?.instrument_name === 'IMAT' && job.state === 'SUCCESSFUL';
  const showExperimentViewer = job.run?.instrument_name !== 'IMAT';

  return (
    <>
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
            borderRadius: '8px',
            fontWeight: 'bold',
          }}
          severity={resubmitSuccessful.current ? 'success' : 'error'}
        >
          {resubmitSuccessful.current
            ? `Resubmit started successfully for reduction ${resubmitJobId.current}`
            : `Resubmit could not be started for ${resubmitJobId.current} — please try again later or contact staff`}
        </Alert>
      </Snackbar>

      <Snackbar
        open={downloadErrorOpen}
        autoHideDuration={5000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') {
            setDownloadErrorOpen(false);
          }
        }}
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
            borderRadius: '8px',
            fontWeight: 'bold',
          }}
          severity="error"
        >
          {downloadErrorMessage}
        </Alert>
      </Snackbar>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          backgroundColor: (theme: Theme) => (theme.palette.mode === 'dark' ? '#10171f' : '#ffffff'),
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue)}
          aria-label="Reduction details"
          variant="fullWidth"
          data-testid="reduction-details-tabs"
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
              '& .MuiTabs-scrollButtons': {
                color: mutedText,
                '&.Mui-disabled': { opacity: 0.28 },
              },
            };
          }}
        >
          <Tab id="reduction-tab-inputs" aria-controls="reduction-tabpanel-inputs" label="Reduction inputs" />
          <Tab id="reduction-tab-run" aria-controls="reduction-tabpanel-run" label="Run details" />
          <Tab id="reduction-tab-outputs" aria-controls="reduction-tabpanel-outputs" label="Reduction outputs" />
        </Tabs>

        <Box
          id="reduction-tabpanel-inputs"
          role="tabpanel"
          aria-labelledby="reduction-tab-inputs"
          hidden={activeTab !== 0}
          sx={{ display: activeTab === 0 ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}
        >
          {activeTab === 0 && (
            <>
              <Box sx={detailScrollableContentSx}>
                <JobInput job={job} />
              </Box>
              <Box data-testid="reduction-input-actions" sx={detailActionBarSx}>
                <Button
                  variant="outlined"
                  size="small"
                  component={Link}
                  to={`/reduction-history/${job.run.instrument_name}/value-editor-${job.id}`}
                  startIcon={<Edit />}
                  onClick={() =>
                    ReactGA.event({
                      category: 'Button',
                      action: 'Click',
                      label: 'Value editor button',
                      value: job.id,
                    })
                  }
                  sx={panelActionButtonSx}
                >
                  Value editor
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={loading ? undefined : <Replay />}
                  disabled={loading}
                  onClick={handleResubmit}
                  sx={[panelActionButtonSx, { width: 116 }]}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Resubmit'}
                </Button>
              </Box>
            </>
          )}
        </Box>

        <Box
          id="reduction-tabpanel-run"
          role="tabpanel"
          aria-labelledby="reduction-tab-run"
          hidden={activeTab !== 1}
          sx={{
            display: activeTab === 1 ? 'flex' : 'none',
            flex: 1,
            minHeight: 0,
            flexDirection: 'column',
          }}
        >
          {activeTab === 1 && (
            <>
              <Box sx={detailScrollableContentSx}>
                <Table size="small" aria-label="Run details" sx={detailTableSx}>
                  <TableBody>
                    {runDetails.map(({ icon, label, value }, index) => (
                      <DetailItem key={index} icon={icon} label={label} value={value} />
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box data-testid="reduction-run-actions" aria-hidden="true" sx={detailActionBarSx} />
            </>
          )}
        </Box>

        <Box
          id="reduction-tabpanel-outputs"
          role="tabpanel"
          aria-labelledby="reduction-tab-outputs"
          hidden={activeTab !== 2}
          sx={{ display: activeTab === 2 ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column' }}
        >
          {activeTab === 2 && (
            <>
              <Box sx={detailScrollableContentSx}>
                {showStackViewer && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      to={`/reduction-history/IMAT/stack-viewer?jobId=${job.id}&experiment=${job.run?.experiment_number}&instrument=${job.run?.instrument_name}`}
                      startIcon={<StackedBarChart />}
                      sx={panelActionButtonSx}
                    >
                      Stack viewer
                    </Button>
                  </Box>
                )}
                {job.state === 'UNSUCCESSFUL' || job.state === 'ERROR' ? (
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
                      Stacktrace output
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {job.stacktrace ? job.stacktrace : 'No detailed stacktrace to show'}
                    </Typography>
                  </Box>
                ) : (
                  <JobOutput
                    job={job}
                    outputs={jobOutputs}
                    downloadingSingle={downloadingSingle}
                    handleDownload={handleDownload}
                  />
                )}
              </Box>
              <Box data-testid="reduction-output-actions" sx={[detailActionBarSx, { justifyContent: 'space-between' }]}>
                <Typography variant="body2" color="text.secondary">
                  {jobOutputs.length} {jobOutputs.length === 1 ? 'output file' : 'output files'}
                </Typography>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}
                >
                  {showExperimentViewer && (
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      to={`/experiment-viewer/${job.run.instrument_name}/${job.run.experiment_number}`}
                      startIcon={<Visibility />}
                      onClick={() =>
                        ReactGA.event({
                          category: 'Button',
                          action: 'Click',
                          label: 'Experiment viewer button',
                          value: job.id,
                        })
                      }
                      sx={panelActionButtonSx}
                    >
                      Experiment viewer
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={downloadingAll ? undefined : <Download />}
                    onClick={handleDownloadAll}
                    disabled={jobOutputs.length === 0 || downloadingAll}
                    sx={[panelActionButtonSx, { width: 140 }]}
                  >
                    {downloadingAll ? <CircularProgress size={22} color="inherit" /> : 'Download all'}
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

export const ReductionDetailsModal: React.FC<{
  open: boolean;
  container: () => HTMLElement | null;
  jobId: number | null;
  job: Job | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  resubmitJob: (job: Job) => Promise<void>;
  refreshJobs: () => void;
  mantidVersions: MantidVersionMap;
}> = ({ open, container, jobId, job, loading, error, onRetry, onClose, resubmitJob, refreshJobs, mantidVersions }) => (
  <Modal
    open={open}
    onClose={onClose}
    container={container}
    disableScrollLock
    aria-labelledby="reduction-details-title"
    sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'auto',
    }}
    BackdropProps={{
      'data-testid': 'reduction-details-backdrop',
      sx: {
        position: 'absolute',
        backgroundColor: 'rgba(5, 10, 16, 0.58)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
      },
    }}
  >
    <Box
      role="dialog"
      aria-modal="true"
      data-testid="reduction-details-modal"
      sx={(theme: Theme) => ({
        display: 'flex',
        flexDirection: 'column',
        width: 'calc(100% - 32px)',
        maxWidth: 1120,
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
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexShrink: 0,
          px: { xs: 1.5, sm: 2.5 },
          py: 1.75,
          borderBottom: '1px solid',
          borderBottomColor: theme.palette.mode === 'dark' ? '#33414e' : '#dce3ea',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1a2733 0%, #121a22 100%)'
              : 'linear-gradient(135deg, #f8fbff 0%, #edf4fb 100%)',
        })}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography id="reduction-details-title" variant="h5" component="h2" sx={{ fontWeight: 750 }}>
            Reduction {job?.id ?? jobId ?? ''}
          </Typography>
          {job && (
            <>
              <Typography variant="body2" color="text.secondary" noWrap>
                {job.run?.instrument_name || 'Unknown instrument'} · Experiment {job.run?.experiment_number || '—'} ·{' '}
                {job.run?.title || 'Untitled reduction'}
              </Typography>
              <JobStatus state={job.state} statusMessage={job.status_message} />
            </>
          )}
        </Box>
        <IconButton
          autoFocus
          aria-label="Close reduction details"
          onClick={onClose}
          edge="end"
          sx={[panelIconButtonSx, { mt: -0.5 }]}
        >
          <Close />
        </IconButton>
      </Box>

      {job ? (
        <ReductionDetailsContent
          key={job.id}
          job={job}
          resubmitJob={resubmitJob}
          refreshJobs={refreshJobs}
          mantidVersions={mantidVersions}
        />
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
              <Typography>Loading reduction details…</Typography>
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

const Row: React.FC<{
  job: Job;
  index: number;
  isSelected: boolean;
  toggleSelection: (jobId: number) => void;
  onOpenDetails: (job: Job) => void;
}> = ({ job, index, isSelected, toggleSelection, onOpenDetails }) => {
  const theme = useTheme();
  const [isStatusHovered, setIsStatusHovered] = useState(false);
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
      aria-label={`View reduction ${job.id} details`}
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
      <TableCell sx={{ px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Box
            onMouseEnter={() => setIsStatusHovered(true)}
            onMouseLeave={() => setIsStatusHovered(false)}
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
            onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
            sx={{
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isStatusHovered || isSelected ? (
              <Checkbox
                color="primary"
                checked={isSelected}
                onChange={() => toggleSelection(job.id)}
                sx={{ p: 0.5 }}
                inputProps={{ 'aria-label': `${isSelected ? 'Deselect' : 'Select'} reduction ${job.id}` }}
              />
            ) : (
              <JobStatusIcon state={job.state} />
            )}
          </Box>
          <EllipsisTooltipText value={job.run?.experiment_number || 'N/A'} sx={{ flexGrow: 1 }} />
        </Box>
      </TableCell>
      <TableCell>
        <EllipsisTooltipText value={extractFilename(job.run?.filename || 'N/A')} />
      </TableCell>
      <TableCell>
        <EllipsisTooltipText value={formatUtcForLocale(job.run?.run_start)} />
      </TableCell>
      <TableCell>
        <EllipsisTooltipText value={formatUtcForLocale(job.run?.run_end)} />
      </TableCell>
      <TableCell>
        <EllipsisTooltipText value={formatUtcForLocale(job.start)} />
      </TableCell>
      <TableCell>
        <EllipsisTooltipText value={formatUtcForLocale(job.end)} />
      </TableCell>
      <TableCell colSpan={2}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <EllipsisTooltipText value={job.run?.title || 'N/A'} sx={{ flexGrow: 1 }} />
          <IconButton
            aria-label={`View reduction ${job.id} details`}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              openDetails();
            }}
            sx={{ ml: 1, p: 0.5 }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default Row;
