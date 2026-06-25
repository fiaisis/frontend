import {
  CheckCircleOutline,
  Download,
  Edit,
  ErrorOutline,
  HighlightOff,
  ImageAspectRatio,
  KeyboardArrowDown,
  KeyboardArrowUp,
  OpenInNew,
  People,
  Replay,
  Schedule,
  Schema,
  StackedBarChart,
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
  Collapse,
  IconButton,
  Snackbar,
  SxProps,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import ReactGA from 'react-ga4';
import { Link } from 'react-router-dom';

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

const panelActionButtonSx: SxProps<Theme> = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
  minHeight: 34,
};

const detailTableSx: SxProps<Theme> = {
  tableLayout: 'fixed',
  border: '1px solid',
  borderColor: 'divider',
  '& .MuiTableCell-root': {
    py: 0.75,
    px: 1,
    borderBottom: '1px solid',
    borderBottomColor: 'divider',
  },
  '& .MuiTableCell-root:not(:last-child)': {
    borderRight: '1px solid',
    borderRightColor: 'divider',
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

const DetailPanel: React.FC<{
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ title, actions, children, sx }) => (
  <Box
    sx={[
      {
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'background.paper',
        overflow: 'hidden',
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        minHeight: 54,
        boxSizing: 'border-box',
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        backgroundColor: 'action.hover',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 0 }}>
        {title}
      </Typography>
      {actions && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
    <Box sx={{ p: 1.5, minWidth: 0, flex: 1 }}>{children}</Box>
  </Box>
);

const EmptyDetailRows: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <TableRow key={`empty-detail-row-${index}`} aria-hidden="true">
        <TableCell className="detail-empty-cell" component="th" scope="row" sx={{ width: '30%', minWidth: 0 }}>
          <Typography variant="body2" sx={{ visibility: 'hidden' }}>
            Empty
          </Typography>
        </TableCell>
        <TableCell className="detail-empty-cell" sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ visibility: 'hidden' }}>
            Empty
          </Typography>
        </TableCell>
      </TableRow>
    ))}
  </>
);

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
            borderColor: 'divider',
            borderRadius: 1,
            minWidth: 0,
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
              variant="contained"
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
              variant="contained"
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

const JobInput: React.FC<{ job: Job; emptyRowCount: number }> = ({
  job,
  emptyRowCount,
}: {
  job: Job;
  emptyRowCount: number;
}): ReactElement => {
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
        <EmptyDetailRows count={emptyRowCount} />
      </TableBody>
    </Table>
  );
};

const JobStatus: React.FC<{ state: string; statusMessage: string }> = ({ state, statusMessage }) => {
  const theme = useTheme();
  const statusTexts: Record<string, { color: string; message: string }> = {
    ERROR: { color: theme.palette.error.dark, message: `[ERROR] ${statusMessage}` },
    SUCCESSFUL: { color: theme.palette.success.main, message: `[SUCCESS] Reduction performed successfully` },
    NOT_STARTED: { color: theme.palette.grey[700], message: `[NOT STARTED] This reduction has not been started yet` },
    UNSUCCESSFUL: { color: theme.palette.warning.main, message: `[UNSUCCESSFUL] ${statusMessage}` },
  };

  const status = statusTexts[state];
  return status ? (
    <Typography variant="subtitle1" style={{ color: status.color, fontWeight: 'bold' }}>
      {status.message}
    </Typography>
  ) : null;
};

const Row: React.FC<{
  job: Job;
  index: number;
  isSelected: boolean;
  toggleSelection: (jobId: number) => void;
  resubmitJob: (job: Job) => Promise<void>;
  refreshJobs: () => void;
  mantidVersions: MantidVersionMap;
}> = ({ job, index, resubmitJob, refreshJobs, isSelected, toggleSelection, mantidVersions }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const resubmitJobId = useRef<number | null>(null);
  const resubmitSuccessful = useRef<boolean | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [downloadErrorOpen, setDownloadErrorOpen] = useState(false);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState('');
  const [isStatusHovered, setIsStatusHovered] = useState(false);

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

  const extractFilename = (path: string): string => path.split('/').pop()?.split('.')[0] ?? '';

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

  const bandedRows = {
    backgroundColor:
      index % 2 === 0
        ? theme.palette.mode === 'light'
          ? '#f0f0f0' // Light mode, even rows
          : theme.palette.mode === 'dark'
            ? '#2d2d2d' // Dark mode, even rows
            : '#000000' // High contrast mode, even rows
        : theme.palette.background.default, // Odd rows (default background color)
  };

  const bandedRowsHover = (theme: Theme, index: number): React.CSSProperties => {
    return {
      backgroundColor:
        theme.palette.mode === 'light'
          ? '#e0e0e0' // Light mode hover color
          : theme.palette.mode === 'dark'
            ? index % 2 === 0
              ? '#4c4c4c' // Dark mode, even rows
              : '#4a4a4a' // Dark mode, odd rows
            : '#ffffff', // High contrast mode hover color
    };
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
  const inputRowCount = Math.max(Object.keys(job.inputs).length, 1);
  const balancedDetailRowCount = Math.max(inputRowCount, runDetails.length);
  const emptyInputRowCount = balancedDetailRowCount - inputRowCount;
  const emptyRunDetailRowCount = balancedDetailRowCount - runDetails.length;
  const outputPanelTitle =
    job.state === 'UNSUCCESSFUL' || job.state === 'ERROR' ? 'Stacktrace output' : 'Reduction outputs';
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

      <TableRow
        sx={{
          ...bandedRows,
          height: '50px',
          '&:hover': bandedRowsHover(theme, index),
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell sx={{ width: '14%', px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box
              onMouseEnter={() => setIsStatusHovered(true)}
              onMouseLeave={() => setIsStatusHovered(false)}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
              aria-label="expand row"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setOpen(!open);
              }}
              sx={{ ml: 1 }}
            >
              {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} style={{ paddingBottom: 0, paddingTop: 0, backgroundColor: bandedRows.backgroundColor }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                }}
              >
                <JobStatus state={job.state} statusMessage={job.status_message} />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                  gap: 2,
                  alignItems: 'stretch',
                }}
              >
                <DetailPanel
                  title="Reduction inputs"
                  actions={
                    <>
                      <Button
                        variant="contained"
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
                    </>
                  }
                >
                  <JobInput job={job} emptyRowCount={emptyInputRowCount} />
                </DetailPanel>

                <DetailPanel title="Run details">
                  <Table size="small" aria-label="Run details" sx={detailTableSx}>
                    <TableBody>
                      {runDetails.map(({ icon, label, value }, index) => (
                        <DetailItem key={index} icon={icon} label={label} value={value} />
                      ))}
                      <EmptyDetailRows count={emptyRunDetailRowCount} />
                    </TableBody>
                  </Table>
                </DetailPanel>
              </Box>

              <DetailPanel
                title={outputPanelTitle}
                actions={
                  <>
                    {showStackViewer && (
                      <Button
                        variant="contained"
                        size="small"
                        component={Link}
                        to={`/reduction-history/IMAT/stack-viewer?jobId=${job.id}&experiment=${job.run?.experiment_number}&instrument=${job.run?.instrument_name}`}
                        startIcon={<StackedBarChart />}
                        sx={panelActionButtonSx}
                      >
                        Stack viewer
                      </Button>
                    )}
                    {showExperimentViewer && (
                      <Button
                        variant="contained"
                        size="small"
                        component={Link}
                        to={`/experiment-viewer/${job.run.instrument_name}/${job.run.experiment_number}`}
                        startIcon={<OpenInNew />}
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
                  </>
                }
              >
                {job.state === 'UNSUCCESSFUL' || job.state === 'ERROR' ? (
                  <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {job.stacktrace ? job.stacktrace : 'No detailed stacktrace to show'}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}>
                    <JobOutput
                      job={job}
                      outputs={jobOutputs}
                      downloadingSingle={downloadingSingle}
                      handleDownload={handleDownload}
                    />
                  </Box>
                )}
              </DetailPanel>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default Row;
