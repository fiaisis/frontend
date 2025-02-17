// React components
import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactGA from 'react-ga4';

// Material UI components
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CheckCircleOutline,
  ErrorOutline,
  ImageAspectRatio,
  HighlightOff,
  KeyboardArrowDown,
  KeyboardArrowUp,
  People,
  Schedule,
  Schema,
  Settings,
  StackedBarChart,
  VpnKey,
  WarningAmber,
  WorkOutline,
} from '@mui/icons-material';
import Grid from '@mui/material/Grid2';
import { CSSObject } from '@mui/system';

// Local data
import { instruments } from '../InstrumentData';
import ConfigSettingsGeneral from '../ConfigSettings/ConfigSettingsGeneral';
import ConfigSettingsLOQ from '../ConfigSettings/ConfigSettingsLOQ';
import ConfigSettingsSANS2D from '../ConfigSettings/ConfigSettingsSANS2D';
import { fiaApi } from '../api';

// JWT decoder
import { jwtDecode } from 'jwt-decode';

export const headerStyles = (theme: Theme): CSSObject => ({
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
  fontWeight: 'bold',
  borderRight: '2px solid #1f4996',
  '&:last-child': {
    borderRight: 'none',
  },
});

export interface Job {
  id: number;
  start: string;
  end: string;
  state: string;
  status_message: string;
  runner_image: string;
  type: string;
  inputs: {
    [key: string]: string | number | boolean | null;
  };
  outputs: string;
  stacktrace: string;
  script: {
    value: string;
  };
  run: {
    experiment_number: number;
    filename: string;
    run_start: string;
    run_end: string;
    title: string;
    users: string;
    good_frames: number;
    raw_frames: number;
    instrument_name: string;
  };
}

export const useFetchJobs = (
  apiPath: string,
  queryParams: string,
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
): (() => Promise<void>) => {
  return useCallback(async () => {
    fiaApi
      .get(`${apiPath}?${queryParams}`)
      .then((res) => res.data)
      .then((jobs) => setJobs(jobs))
      .catch((err) => console.error('Error fetching jobs:', err));
  }, [apiPath, queryParams, setJobs]);
};

export const useFetchTotalCount = (
  apiPath: string,
  setTotalRows: React.Dispatch<React.SetStateAction<number>>
): (() => Promise<void>) => {
  return useCallback(async () => {
    fiaApi
      .get(apiPath)
      .then((res) => setTotalRows(res.data.count))
      .catch((err) => console.error('Error fetching row count', err));
  }, [apiPath, setTotalRows]);
};

interface JobsBaseProps {
  selectedInstrument: string;
  handleInstrumentChange?: (event: SelectChangeEvent<string>, child: React.ReactNode) => void;
  jobs: Job[];
  totalRows: number;
  currentPage: number;
  rowsPerPage: number;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSort: (property: string) => void;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
  customHeaders?: React.ReactNode;
  customRowCells?: (Job: Job) => React.ReactNode;
  children?: React.ReactNode;
  fetchJobs: () => Promise<void>;
  fetchTotalCount: () => Promise<void>;
  maxHeight?: number;
  showConfigButton?: boolean;
  asUser: boolean;
  handleToggleAsUser: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const JobsBase: React.FC<JobsBaseProps> = ({
  selectedInstrument,
  handleInstrumentChange,
  jobs,
  totalRows,
  currentPage,
  rowsPerPage,
  handleChangePage,
  handleChangeRowsPerPage,
  handleSort,
  orderBy,
  orderDirection,
  customHeaders,
  customRowCells,
  children,
  fetchJobs,
  fetchTotalCount,
  maxHeight = 624,
  showConfigButton = false,
  asUser,
  handleToggleAsUser,
}) => {
  const theme = useTheme();
  const allInstruments = [{ name: 'ALL' }, ...instruments]; // Add 'ALL' option to the instruments list
  const baseColumnCount = 9; // Number of base columns defined in the TableHead
  const customColumnCount = customHeaders ? 1 : 0;
  const totalColumnCount = baseColumnCount + customColumnCount;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [userRole, setUserRole] = useState<'staff' | 'user' | null>(null);
  const rerunSuccessful = useRef<boolean | null>(null);
  const rerunJobId = useRef<number | null>(null);

  useEffect(() => {
    fetchTotalCount();
    fetchJobs();
    setUserRole(getUserRole());
  }, [fetchTotalCount, fetchJobs]);

  const DATA_VIEWER_URL = process.env.REACT_APP_FIA_DATA_VIEWER_URL;

  const getUserRole = (): 'staff' | 'user' | null => {
    const token = localStorage.getItem('scigateway:token');
    if (!token) return null;

    try {
      const decoded = jwtDecode<{ role?: 'staff' | 'user' }>(token);
      return decoded.role || 'user';
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

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

  const openConfigSettings = (): void => {
    setDrawerOpen(true);
  };

  const closeConfigSettings = (): void => {
    setDrawerOpen(false);
  };

  const renderConfigSettings = (): JSX.Element => {
    switch (selectedInstrument) {
      case 'LOQ':
        return <ConfigSettingsLOQ />;
      case 'SANS2D':
        return <ConfigSettingsSANS2D />;
      default:
        return <ConfigSettingsGeneral />;
    }
  };

  const Row: React.FC<{ job: Job; index: number }> = ({ job, index }) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();
    const [loading, setLoading] = useState(false);

    const JobStatus = ({ state }: { state: string }): JSX.Element => {
      const getComponent = (): JSX.Element => {
        switch (state) {
          case 'ERROR':
            return <ErrorOutline color="error" />;
          case 'SUCCESSFUL':
            return <CheckCircleOutline color="success" />;
          case 'UNSUCCESSFUL':
            return <WarningAmber color="warning" />;
          case 'NOT_STARTED':
            return <HighlightOff color="action" />;
          default:
            return <ErrorOutline />;
        }
      };
      return (
        <Tooltip title={state}>
          <span>{getComponent()}</span>
        </Tooltip>
      );
    };

    const formatDateTime = (dateTimeStr: string | null): string => {
      if (!dateTimeStr) {
        return '';
      }
      return dateTimeStr.replace('T', '\n');
    };

    const extractFileName = (path: string): string => {
      const fileNameWithExtension = path.split('/').pop();
      if (typeof fileNameWithExtension === 'undefined') {
        return '';
      }
      return fileNameWithExtension.split('.')[0];
    };

    const parseJobOutputs = (): JSX.Element | JSX.Element[] | undefined => {
      try {
        let outputs;
        if (job.outputs.startsWith('[') && job.outputs.endsWith(']')) {
          const preParsedOutputs = job.outputs.replace(/'/g, '"');
          outputs = JSON.parse(preParsedOutputs);
        } else {
          outputs = [job.outputs];
        }

        if (Array.isArray(outputs)) {
          return outputs.map((output, index: number) => (
            <TableRow key={index}>
              <TableCell>
                <Box maxHeight="80px" display="flex" alignItems="center" justifyContent="space-between" width="100%">
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
                  <Box>
                    <Button
                      variant="contained"
                      sx={{ marginLeft: 2 }}
                      onClick={() =>
                        openDataViewer(
                          job.id,
                          job.run?.instrument_name || 'unknown',
                          job.run?.experiment_number || 0,
                          output
                        )
                      }
                    >
                      View
                    </Button>
                    <Tooltip title="Will be added in the future">
                      <span>
                        <Button variant="contained" sx={{ marginLeft: 2 }} disabled>
                          Download
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          ));
        }
      } catch (error) {
        console.error('Failed to parse job outputs as JSON:', job.outputs);
        console.error('Error:', error);
        return <TableCell>{job.outputs}</TableCell>;
      }
    };

    const renderJobInputs = (): JSX.Element | JSX.Element[] => {
      const entries = Object.entries(job.inputs);
      if (entries.length === 0) {
        return (
          <Typography variant="body2" style={{ margin: 2 }}>
            No input data available
          </Typography>
        );
      }

      return entries.map(([key, value], index) => (
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
            title={String(value)}
            sx={{ flex: '1 1 auto', ...ellipsisWrap, maxWidth: `calc(${ellipsisWrap.maxWidth} + 300px)` }}
          >
            {value}
          </Typography>
        </Box>
      ));
    };

    const renderJobStatus = (): JSX.Element => {
      switch (job.state) {
        case 'ERROR':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.error.dark, fontWeight: 'bold' }}>
              [ERROR] {job.status_message}
            </Typography>
          );
        case 'SUCCESSFUL':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.success.main, fontWeight: 'bold' }}>
              [SUCCESS] Reduction performed successfully
            </Typography>
          );
        case 'NOT_STARTED':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.grey[700], fontWeight: 'bold' }}>
              [NOT STARTED] This reduction has not been started yet
            </Typography>
          );
        case 'UNSUCCESSFUL':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.warning.main, fontWeight: 'bold' }}>
              [UNSUCCESSFUL] {job.status_message}
            </Typography>
          );
        default:
          return <></>;
      }
    };

    const handleRerun = async (): Promise<void> => {
      setLoading(true);
      rerunJobId.current = job.id;
      fiaApi
        .post('/job/rerun', { job_id: job.id, runner_image: job.runner_image, script: job.script.value })
        .then(() => (rerunSuccessful.current = true))
        .catch((err) => {
          console.error('Error rerunning job', err);
          rerunSuccessful.current = false;
        })
        .finally(() => {
          setTimeout(() => {
            setLoading(false);
            setSnackbarOpen(true);
            Promise.resolve(fetchJobs());
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

    const ellipsisWrap = {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '200px',
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
          disableWindowBlurListener={false}
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
          <TableCell>
            <IconButton aria-label="expand row" size="small">
              {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </TableCell>
          <TableCell
            sx={{
              ...ellipsisWrap,
            }}
          >
            <JobStatus state={job.state} />
          </TableCell>
          <TableCell
            sx={{
              ...ellipsisWrap,
            }}
          >
            {job.run?.experiment_number || 'N/A'}
          </TableCell>
          <TableCell
            sx={{
              ...ellipsisWrap,
            }}
          >
            {extractFileName(job.run?.filename || 'N/A')}
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
          <TableCell
            sx={{
              ...ellipsisWrap,
            }}
          >
            {job.run?.title || 'N/A'}
          </TableCell>
          {customRowCells && customRowCells(job)}
        </TableRow>

        <TableRow>
          <TableCell
            colSpan={totalColumnCount}
            style={{ paddingBottom: 0, paddingTop: 0, backgroundColor: bandedRows.backgroundColor }}
          >
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box margin={2}>
                <Typography variant="h6" gutterBottom>
                  {renderJobStatus()}
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={4}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {job.state === 'UNSUCCESSFUL' || job.state === 'ERROR'
                        ? 'Stacktrace output'
                        : 'Reduction outputs'}
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
                          <TableBody>{parseJobOutputs()}</TableBody>
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
                        marginBottom: 2,
                      }}
                    >
                      {renderJobInputs()}
                    </Box>
                    <Box display="flex" justifyContent="right">
                      <Button variant="contained" onClick={() => openValueEditor(job.id)}>
                        Value editor
                      </Button>
                      <Button
                        variant="contained"
                        sx={{ marginLeft: 2, width: 60, height: 38 }}
                        disabled={loading}
                        onClick={handleRerun}
                      >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Rerun'}
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

  return (
    <div style={{ padding: '20px' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom="20px">
        <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
          {selectedInstrument} reductions
        </Typography>
        <Box display="flex" alignItems="center">
          {showConfigButton && (
            <Button
              variant="contained"
              startIcon={<Settings />}
              onClick={openConfigSettings}
              style={{ marginRight: '20px' }}
            >
              Config
            </Button>
          )}
          {userRole === 'staff' && (
            <FormControlLabel
              control={<Switch checked={asUser} onChange={handleToggleAsUser} color="warning" />}
              label={
                <Typography variant="body1" color={theme.palette.text.primary}>
                  View as user
                </Typography>
              }
            />
          )}
          {handleInstrumentChange && (
            <FormControl style={{ width: '200px', marginLeft: '20px' }}>
              <InputLabel id="instrument-select-label">Instrument</InputLabel>
              <Select
                labelId="instrument-select-label"
                value={selectedInstrument}
                label="Instrument"
                onChange={handleInstrumentChange}
              >
                {allInstruments.map((instrument) => (
                  <MenuItem key={instrument.name} value={instrument.name}>
                    {instrument.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      {/* Render children passed from parent */}
      {children}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeConfigSettings}
        sx={{
          '& .MuiDrawer-paper': {
            width: '600px',
            padding: '16px',
            backgroundColor: theme.palette.background.default,
          },
        }}
      >
        <Box>{renderConfigSettings()}</Box>
      </Drawer>

      {jobs.length === 0 ? (
        <Typography variant="h6" style={{ textAlign: 'center', marginTop: '20px', color: theme.palette.text.primary }}>
          No reductions to show for this instrument
        </Typography>
      ) : (
        <>
          <TablePagination
            component="div"
            count={totalRows}
            page={currentPage}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          <TableContainer component={Paper} style={{ maxHeight, overflowY: 'scroll' }}>
            <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerStyles(theme), width: '10%' }} colSpan={2}>
                    {selectedInstrument}
                  </TableCell>
                  <TableCell
                    sx={{ width: '12%', ...headerStyles(theme) }}
                    onClick={() => handleSort('experiment_number')}
                  >
                    Experiment number {orderBy === 'experiment_number' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '8%', ...headerStyles(theme) }} onClick={() => handleSort('filename')}>
                    Filename {orderBy === 'filename' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '12%', ...headerStyles(theme) }} onClick={() => handleSort('run_start')}>
                    Run start {orderBy === 'run_start' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '12%', ...headerStyles(theme) }} onClick={() => handleSort('run_end')}>
                    Run end {orderBy === 'run_end' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '12%', ...headerStyles(theme) }} onClick={() => handleSort('start')}>
                    Job start {orderBy === 'start' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '12%', ...headerStyles(theme) }} onClick={() => handleSort('end')}>
                    Job end {orderBy === 'end' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '24%', ...headerStyles(theme) }}>Title</TableCell>
                  {customHeaders && customHeaders}
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job, index) => (
                  <Row key={job.id} job={job} index={index} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </div>
  );
};

export default JobsBase;
