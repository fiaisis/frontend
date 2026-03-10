import React, { ReactElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import NavArrows from '../components/navigation/NavArrows';
import { JOB_ROWS_PER_PAGE_OPTIONS, JobRowsPerPage, isJobRowsPerPage } from '../components/jobs/constants';
import { getCurrentUserNumber, getUserRole, UserRole } from '../lib/auth';
import {
  FastStartJob,
  fetchFastStartJobCount,
  fetchFastStartJobs,
  isFastStartJobsApiUnavailable,
} from '../lib/fastStartJobs';
import { formatUtcForLocale } from '../lib/timezone';

const DEFAULT_ROWS_PER_PAGE: JobRowsPerPage = JOB_ROWS_PER_PAGE_OPTIONS[1];

const getStoredRowsPerPage = (): JobRowsPerPage => {
  if (typeof window === 'undefined') {
    return DEFAULT_ROWS_PER_PAGE;
  }

  const stored = localStorage.getItem('fastStartJobTableRowsPerPage');
  const parsed = stored ? Number(stored) : NaN;
  return isJobRowsPerPage(parsed) ? parsed : DEFAULT_ROWS_PER_PAGE;
};

const getStoredAsUser = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const stored = localStorage.getItem('fastStartJobsAsUser');
  return stored ? JSON.parse(stored) : false;
};

const headerCellStyles = {
  color: 'primary.contrastText',
  backgroundColor: 'primary.main',
  fontWeight: 'bold',
};

const getStatusChipColor = (status: string): 'default' | 'success' | 'error' | 'warning' => {
  const normalisedStatus = status.toUpperCase();

  if (normalisedStatus.includes('SUCCESS')) {
    return 'success';
  }

  if (
    normalisedStatus.includes('ERROR') ||
    normalisedStatus.includes('FAIL') ||
    normalisedStatus.includes('UNSUCCESS')
  ) {
    return 'error';
  }

  if (
    normalisedStatus.includes('RUN') ||
    normalisedStatus.includes('START') ||
    normalisedStatus.includes('PEND') ||
    normalisedStatus.includes('QUEUE')
  ) {
    return 'warning';
  }

  return 'default';
};

const FastStartJobs: React.FC = (): ReactElement => {
  const theme = useTheme();
  const [jobs, setJobs] = useState<FastStartJob[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<JobRowsPerPage>(getStoredRowsPerPage);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiUnavailable, setApiUnavailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedScriptJob, setSelectedScriptJob] = useState<FastStartJob | null>(null);
  const [userRole] = useState<UserRole | null>(() => getUserRole());
  const [currentUserNumber] = useState<string | null>(() => getCurrentUserNumber());
  const [asUser, setAsUser] = useState<boolean>(getStoredAsUser);

  const showOwnJobsOnly = userRole !== 'staff' || asUser;
  const maxPageIndex = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fastStartJobTableRowsPerPage', rowsPerPage.toString());
    }
  }, [rowsPerPage]);

  useEffect(() => {
    if (typeof window !== 'undefined' && userRole === 'staff') {
      localStorage.setItem('fastStartJobsAsUser', JSON.stringify(asUser));
    }
  }, [asUser, userRole]);

  useEffect(() => {
    if (currentPage > maxPageIndex) {
      setCurrentPage(maxPageIndex);
    }
  }, [currentPage, maxPageIndex]);

  useEffect(() => {
    let isActive = true;

    const loadFastStartJobs = async (): Promise<void> => {
      setLoading(true);
      setApiUnavailable(false);
      setErrorMessage(null);

      try {
        const requestParams = {
          limit: rowsPerPage,
          offset: currentPage * rowsPerPage,
          order_by: 'start_time',
          order_direction: 'desc',
          as_user: showOwnJobsOnly,
        };

        const [nextJobs, nextCount] = await Promise.all([
          fetchFastStartJobs(requestParams, currentUserNumber),
          fetchFastStartJobCount({ as_user: showOwnJobsOnly }).catch((error) => {
            if (isFastStartJobsApiUnavailable(error)) {
              return null;
            }

            throw error;
          }),
        ]);

        if (!isActive) {
          return;
        }

        setJobs(nextJobs);
        setTotalRows(nextCount ?? nextJobs.length);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (isFastStartJobsApiUnavailable(error)) {
          setApiUnavailable(true);
          setJobs([]);
          setTotalRows(0);
          return;
        }

        console.error('Failed to fetch fast start jobs:', error);
        setErrorMessage('Fast start jobs could not be loaded.');
        setJobs([]);
        setTotalRows(0);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadFastStartJobs();

    return () => {
      isActive = false;
    };
  }, [currentPage, rowsPerPage, showOwnJobsOnly, currentUserNumber]);

  return (
    <>
      <NavArrows />
      <Box sx={{ p: '20px' }}>
        <Box
          display="flex"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={2}
          mb={3}
        >
          <Box display="flex" flexDirection="column" gap={1}>
            <Typography variant="h3" component="h1" color={theme.palette.text.primary}>
              Fast start jobs
            </Typography>
            <Typography variant="body1" color={theme.palette.text.secondary}>
              {showOwnJobsOnly ? 'Showing only your fast start jobs.' : 'Showing fast start jobs for all users.'}
            </Typography>
            <Typography
              variant="body1"
              component={Link}
              to="/reduction-history"
              sx={{
                color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                display: 'flex',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <ArrowBack sx={{ mr: 0.5 }} />
              Back to reduction history
            </Typography>
          </Box>

          {userRole === 'staff' && (
            <FormControlLabel
              control={
                <Switch
                  checked={asUser}
                  onChange={() => {
                    setAsUser((prev) => !prev);
                    setCurrentPage(0);
                  }}
                  color="secondary"
                />
              }
              label="View as user"
            />
          )}
        </Box>

        {apiUnavailable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This page is ready, but the fast start jobs API is not available yet.
          </Alert>
        )}

        {errorMessage && !apiUnavailable && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {!apiUnavailable && (
          <TableContainer component={Paper} sx={{ maxHeight: 680, minHeight: 480 }}>
            <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead sx={{ '& th': { py: 1 } }}>
                <TableRow>
                  <TableCell sx={{ width: '14%', ...headerCellStyles }}>User number</TableCell>
                  <TableCell sx={{ width: '16%', ...headerCellStyles }}>Start time</TableCell>
                  <TableCell sx={{ width: '16%', ...headerCellStyles }}>End time</TableCell>
                  <TableCell sx={{ width: '12%', ...headerCellStyles }}>Status</TableCell>
                  <TableCell sx={{ width: '12%', ...headerCellStyles }}>Script</TableCell>
                  <TableCell sx={{ width: '30%', ...headerCellStyles }}>Output paths</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [...Array(rowsPerPage)].map((_, index) => (
                    <TableRow key={`fast-start-loading-${index}`}>
                      {Array.from({ length: 6 }).map((__, cellIndex) => (
                        <TableCell key={`fast-start-loading-cell-${cellIndex}`}>
                          <Box
                            sx={{
                              height: 22,
                              borderRadius: 1,
                              backgroundColor: theme.palette.action.hover,
                            }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ borderBottom: 'none', textAlign: 'center', py: 6 }}>
                      <Typography variant="h6" color={theme.palette.text.primary}>
                        No fast start jobs found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job, index) => {
                    const isEven = index % 2 === 0;
                    const backgroundColor =
                      theme.palette.mode === 'light'
                        ? isEven
                          ? '#f0f0f0'
                          : theme.palette.background.default
                        : isEven
                          ? '#2d2d2d'
                          : theme.palette.background.default;

                    return (
                      <TableRow key={job.id} sx={{ backgroundColor }}>
                        <TableCell>{job.userNumber}</TableCell>
                        <TableCell>{formatUtcForLocale(job.startTime)}</TableCell>
                        <TableCell>{formatUtcForLocale(job.endTime)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={job.status.replace(/_/g, ' ')}
                            color={getStatusChipColor(job.status)}
                            variant={getStatusChipColor(job.status) === 'default' ? 'outlined' : 'filled'}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!job.script}
                            onClick={() => setSelectedScriptJob(job)}
                          >
                            View
                          </Button>
                        </TableCell>
                        <TableCell>
                          {job.outputPaths.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, py: 0.5 }}>
                              {job.outputPaths.map((path) => (
                                <Typography
                                  key={`${job.id}-${path}`}
                                  variant="body2"
                                  title={path}
                                  sx={{
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {path}
                                </Typography>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color={theme.palette.text.secondary}>
                              No outputs recorded
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalRows}
              page={currentPage}
              onPageChange={(_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) =>
                setCurrentPage(newPage)
              }
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={JOB_ROWS_PER_PAGE_OPTIONS}
              labelRowsPerPage="Rows per page"
              onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const nextRowsPerPage = Number(event.target.value);
                if (!isJobRowsPerPage(nextRowsPerPage)) {
                  return;
                }

                setRowsPerPage(nextRowsPerPage);
                setCurrentPage(0);
              }}
            />
          </TableContainer>
        )}
      </Box>

      <Dialog open={Boolean(selectedScriptJob)} onClose={() => setSelectedScriptJob(null)} fullWidth maxWidth="md">
        <DialogTitle>Fast start script</DialogTitle>
        <DialogContent dividers>
          <Typography
            component="pre"
            sx={{
              m: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
            }}
          >
            {selectedScriptJob?.script || 'No script available'}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FastStartJobs;
