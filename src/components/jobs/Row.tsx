import React, { ReactElement, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Checkbox,
  Collapse,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { Job } from '../../lib/types';
import {
  CheckCircleOutline,
  Download,
  ErrorOutline,
  HighlightOff,
  ImageAspectRatio,
  KeyboardArrowDown,
  KeyboardArrowUp,
  People,
  Schedule,
  Schema,
  StackedBarChart,
  VpnKey,
  WarningAmber,
  WorkOutline,
} from '@mui/icons-material';
import ReactGA from 'react-ga4';
import { Link } from 'react-router-dom';
import Grid from '@mui/material/Grid2';
import { fiaApi } from '../../lib/api';
import { parseJobOutputs } from '../../lib/hooks';

const ellipsisWrap = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '200px',
};

const DATA_VIEWER_URL = process.env.REACT_APP_FIA_DATA_VIEWER_URL;

const openDataViewer = (jobId: number, instrumentName: string, experimentNumber: number, output: string): void => {
  const url = `${DATA_VIEWER_URL}/view/${instrumentName}/${experimentNumber}/${output}`;
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

  return <Tooltip title={state}>{icons[state] || <ErrorOutline />}</Tooltip>;
};

const JobOutput: React.FC<{
  job: Job;
  downloadingSingle: string | null;
  handleDownload: (job: Job, output: string) => Promise<void>;
}> = ({ job, downloadingSingle, handleDownload }) => {
  try {
    if (typeof job.outputs !== 'string') {
      return <Typography>No outputs to show</Typography>;
    }

    let parsedOutputs;
    if (job.outputs.startsWith('[') && job.outputs.endsWith(']')) {
      parsedOutputs = JSON.parse(job.outputs.replace(/'/g, '"'));
    } else {
      parsedOutputs = [job.outputs];
    }
    return parsedOutputs.map((output: string, index: number) => (
      <TableRow key={index}>
        <TableCell>
          <Box
            maxHeight="80px"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            sx={{ flexWrap: 'nowrap', gap: 2 }}
          >
            <Box display="flex" alignItems="center">
              <Box display="flex" alignItems="center" sx={{ overflow: 'hidden' }}>
                <Typography
                  variant="body2"
                  sx={{
                    ...ellipsisWrap,
                    maxWidth: `calc(${ellipsisWrap.maxWidth} + 60px)`,
                  }}
                  title={output}
                >
                  {output}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: 1,
                whiteSpace: 'nowrap',
                minWidth: 'fit-content',
              }}
            >
              <Button
                variant="contained"
                onClick={() =>
                  openDataViewer(job.id, job.run?.instrument_name || 'unknown', job.run?.experiment_number || 0, output)
                }
              >
                View
              </Button>
              <Button
                variant="contained"
                startIcon={downloadingSingle === output ? null : <Download />}
                onClick={() => handleDownload(job, output)}
                disabled={downloadingSingle === output}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap', width: 110, height: 38 }}
              >
                {downloadingSingle === output ? <CircularProgress size={24} color="inherit" /> : 'Download'}
              </Button>
            </Box>
          </Box>
        </TableCell>
      </TableRow>
    ));
  } catch (error) {
    console.error('Failed to parse job outputs as JSON:', job.outputs);
    console.error('Error:', error);
    return <TableCell>{job.outputs}</TableCell>;
  }
};

const JobInput: React.FC<{ job: Job }> = ({ job }: { job: Job }): ReactElement => {
  const entries = Object.entries(job.inputs);
  if (entries.length === 0) {
    return (
      <Typography variant="body2" sx={{ margin: 2 }}>
        No input data available
      </Typography>
    );
  }
  return (
    <>
      {entries.map(([key, value], index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '4px',
            wordBreak: 'break-word',
            maxWidth: '100%',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 'bold',
              marginRight: '16px',
              whiteSpace: 'nowrap', // Stops the key from wrapping
            }}
          >
            {key}:
          </Typography>
          <Typography
            variant="body2"
            title={value as string}
            sx={{
              flex: '1 1 auto',
              ...ellipsisWrap,
              maxWidth: `calc(${ellipsisWrap.maxWidth} + 300px)`,
            }}
          >
            {`${value}`}
          </Typography>
        </Box>
      ))}
    </>
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
  showInstrumentColumn: boolean;
  index: number;
  isSelected: boolean;
  toggleSelection: (jobId: number) => void;
  submitRerun: (job: Job) => Promise<void>;
  refreshJobs: () => void;
}> = ({ job, showInstrumentColumn, index, submitRerun, refreshJobs, isSelected, toggleSelection }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const rerunJobId = useRef<number | null>(null);
  const rerunSuccessful = useRef<boolean | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const jobOutputs = parseJobOutputs(job.outputs);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSingle, setDownloadingSingle] = useState<string | null>(null);

  const downloadFile = async (job: Job, output: string): Promise<void> => {
    const payload = { [job.id]: [output] };
    const { data } = await fiaApi.post('/job/download-zip', payload, {
      responseType: 'blob',
    });

    const blob = new Blob([data], { type: 'application/zip' });
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${output.replace(/\.[^/.]+$/, '')}.zip`,
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (job: Job, output: string): Promise<void> => {
    try {
      setDownloadingSingle(output);
      await downloadFile(job, output);
    } catch (err) {
      console.error('Failed to download ZIP file:', err);
    } finally {
      setDownloadingSingle(null);
    }
  };

  const handleDownloadAll = async (): Promise<void> => {
    try {
      setDownloadingAll(true);
      const payload = { [job.id]: jobOutputs };

      const { data } = await fiaApi.post('/job/download-zip', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);

      link.download = `${job.id}-outputs.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download-all failed:', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const extractFilename = (path: string): string => path.split('/').pop()?.split('.')[0] ?? '';
  const formatDateTime = (dateTimeStr: string | null): string => dateTimeStr?.replace('I', '\n') ?? '';

  const openValueEditor = (jobId: number): void => {
    const url = `/fia/value-editor/${jobId}`;
    const windowName = 'ValueEditorWindow';
    const features = 'width=1200,height=800,resizable=no';
    window.open(url, windowName, features);
    ReactGA.event({
      category: 'Button',
      action: 'Click',
      label: 'Value editor button',
      value: jobId,
    });
  };

  const handleRerun = async (): Promise<void> => {
    setLoading(true);
    rerunJobId.current = job.id;
    submitRerun(job)
      .then(() => (rerunSuccessful.current = true))
      .catch((err) => {
        console.log('Error rerunning job', err);
        rerunSuccessful.current = false;
      })
      .finally(() => {
        setTimeout(() => {
          setLoading(false);
          setSnackbarOpen(true);
          refreshJobs();
        }, 2000);
      });
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

  const formatJobType = (jobType: string): string => {
    const formattedType = jobType.replace('JobType.', '');
    return formattedType.charAt(0).toUpperCase() + formattedType.slice(1).toLowerCase();
  };

  const runDetails = [
    { icon: <VpnKey fontSize="small" />, label: 'Reduction ID:', value: job.id },
    { icon: <WorkOutline fontSize="small" />, label: 'Job type:', value: job.type ? formatJobType(job.type) : 'N/A' },
    {
      icon: <ImageAspectRatio fontSize="small" />,
      label: 'Runner image:',
      value: job.runner_image || 'N/A',
    },
    { icon: <Schema fontSize="small" />, label: 'Instrument:', value: job.run?.instrument_name || 'N/A' },
    {
      icon: <Schedule fontSize="small" />,
      label: 'Reduction start:',
      value: formatDateTime(job.start) || 'N/A',
    },
    {
      icon: <Schedule fontSize="small" />,
      label: 'Reduction end:',
      value: formatDateTime(job.end) || 'N/A',
    },
    {
      icon: <StackedBarChart fontSize="small" />,
      label: 'Good frames:',
      value: job.run?.good_frames?.toLocaleString() || 'N/A',
    },
    {
      icon: <StackedBarChart fontSize="small" />,
      label: 'Raw frames:',
      value: job.run?.raw_frames?.toLocaleString() || 'N/A',
    },
    { icon: <People fontSize="small" />, label: 'Users:', value: job.run?.users || 'N/A' },
  ];

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
          severity={rerunSuccessful.current ? 'success' : 'error'}
        >
          {rerunSuccessful.current
            ? `Rerun started successfully for reduction ${rerunJobId.current}`
            : `Rerun could not be started for ${rerunJobId.current} — please try again later or contact staff`}
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
        <TableCell sx={{ py: 0, px: 1, ...ellipsisWrap }}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Checkbox
              color="primary"
              checked={isSelected}
              onChange={() => toggleSelection(job.id)}
              onClick={(e) => e.stopPropagation()}
              sx={{ p: 0.5 }}
            />
            <JobStatusIcon state={job.state} />
          </Box>
        </TableCell>

        <TableCell sx={{ width: '18%', px: 1 }}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flexGrow: 1,
            }}
            title={String(job.run?.experiment_number)}
          >
            {job.run?.experiment_number || 'N/A'}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            ...ellipsisWrap,
          }}
        >
          {extractFilename(job.run?.filename || 'N/A')}
        </TableCell>
        <TableCell
          sx={{
            ...ellipsisWrap,
          }}
        >
          {formatDateTime(job.run?.run_start || 'N/A')}
        </TableCell>
        <TableCell
          sx={{
            ...ellipsisWrap,
          }}
        >
          {formatDateTime(job.run?.run_end || 'N/A')}
        </TableCell>
        <TableCell
          sx={{
            ...ellipsisWrap,
          }}
        >
          {formatDateTime(job.start) || 'N/A'}
        </TableCell>
        <TableCell
          sx={{
            ...ellipsisWrap,
          }}
        >
          {formatDateTime(job.end) || 'N/A'}
        </TableCell>
        {showInstrumentColumn && (
          <TableCell
            sx={{
              ...ellipsisWrap,
            }}
          >
            {job.run?.title || 'N/A'}
          </TableCell>
        )}

        {showInstrumentColumn ? (
          // Merge the reduction instrument name and expand icon into one cell for "ALL" page
          <TableCell>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexGrow: 1,
                  color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                }}
                title={job.run.instrument_name}
              >
                <Link
                  to={`/reduction-history/${job.run.instrument_name}`}
                  onClick={(evt) => evt.stopPropagation()}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {job.run.instrument_name}
                </Link>
              </Typography>

              <IconButton
                aria-label="expand row"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(!open);
                }}
                sx={{ ml: 1 }}
              >
                {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
            </Box>
          </TableCell>
        ) : (
          // Merge the reduction title and expand icon into one cell for instrument specific pages
          <TableCell colSpan={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography
                variant="body2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexGrow: 1,
                }}
                title={job.run?.title || 'N/A'}
              >
                {job.run?.title || 'N/A'}
              </Typography>
              <IconButton
                aria-label="expand row"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(!open);
                }}
                sx={{ ml: 1 }}
              >
                {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
            </Box>
          </TableCell>
        )}
      </TableRow>
      <TableRow>
        <TableCell
          colSpan={showInstrumentColumn ? 10 : 9}
          style={{ paddingBottom: 0, paddingTop: 0, backgroundColor: bandedRows.backgroundColor }}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={2}>
              <Typography variant="h6" gutterBottom>
                <JobStatus state={job.state} statusMessage={job.status_message} />
              </Typography>
              <Grid container spacing={3}>
                <Grid size={4}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {job.state === 'UNSUCCESSFUL' || job.state === 'ERROR' ? 'Stacktrace output' : 'Reduction outputs'}
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {job.state === 'NOT_STARTED' ? (
                      <Typography variant="body2" style={{ margin: 2 }}>
                        No output files to show
                      </Typography>
                    ) : job.state === 'UNSUCCESSFUL' || job.state === 'ERROR' ? (
                      <Typography variant="body2" style={{ margin: 2, whiteSpace: 'pre-wrap' }}>
                        {job.stacktrace ? job.stacktrace : 'No detailed stacktrace to show'}
                      </Typography>
                    ) : (
                      <Table size="small" aria-label="details">
                        <TableBody>
                          <JobOutput job={job} downloadingSingle={downloadingSingle} handleDownload={handleDownload} />
                        </TableBody>
                      </Table>
                    )}
                  </Box>
                </Grid>
                <Grid size={3}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Run details
                  </Typography>
                  {runDetails.map(({ icon, label, value }, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        marginBottom: '4px',
                      }}
                    >
                      {React.cloneElement(icon, { sx: { mr: 1, flexShrink: 0 } })}
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1, display: 'inline' }}>
                        {label}
                      </Typography>
                      <Typography variant="body2" sx={{ ...ellipsisWrap, display: 'inline' }} title={String(value)}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Grid>
                <Grid size={5}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Reduction inputs
                  </Typography>
                  <Box
                    sx={{
                      height: 160,
                      overflowY: 'auto',
                      overflowX: 'auto',
                      marginBottom: 2,
                      width: '100%',
                    }}
                  >
                    <JobInput job={job} />
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    sx={{
                      gap: 1,
                      flexWrap: 'nowrap',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={() => openValueEditor(job.id)}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Value editor
                    </Button>
                    <Button
                      variant="contained"
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap', width: 60, height: 38 }}
                      disabled={loading}
                      onClick={handleRerun}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Rerun'}
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={!downloadingAll && <Download />}
                      onClick={handleDownloadAll}
                      disabled={jobOutputs.length === 0 || downloadingAll}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap', width: 140, height: 38 }}
                    >
                      {downloadingAll ? <CircularProgress size={24} color="inherit" /> : 'Download all'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default Row;
