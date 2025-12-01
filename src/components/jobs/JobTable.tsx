import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
  Typography,
  useTheme,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import {
  CheckBox,
  Download,
  IndeterminateCheckBox,
  CheckBoxOutlineBlank,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import React, { useEffect, useState, useRef } from 'react';
import { Job, JobQueryFilters, MantidVersionMap } from '../../lib/types';
import Row from './Row';
import JobTableHead from './JobTableHead';
import { useFetchJobs, useFetchTotalCount } from '../../lib/hooks';
import { fiaApi } from '../../lib/api';
import FilterContainer from './Filters';
import { parseJobOutputs } from '../../lib/hooks';
import { JOB_ROWS_PER_PAGE_OPTIONS, JobRowsPerPage, isJobRowsPerPage } from './constants';

const JobTable: React.FC<{
  selectedInstrument: string;
  currentPage: number;
  handlePageChange: (currentPage: number) => void;
  asUser: boolean;
  rowsPerPage: JobRowsPerPage;
  handleRowsPerPageChange: (rowsPerPage: JobRowsPerPage, newPage: number) => void;
  filters: JobQueryFilters;
  handleFiltersChange: (filters: JobQueryFilters) => void;
  handleSort: (sortKey: string) => void;
  orderBy: string;
  orderDirection: "desc" | "asc";
}> = ({
  selectedInstrument,
  currentPage,
  handlePageChange,
  asUser,
  rowsPerPage,
  handleRowsPerPageChange,
  filters,
  handleFiltersChange,
  orderBy,
  orderDirection,
  handleSort,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const previousRowsPerPage = useRef<JobRowsPerPage>(rowsPerPage);

  // Cache the last filter JSON so we only reset selection when the filter set
  // truly changes
  const filtersStringRef = useRef<string>(JSON.stringify(filters));

  const offset = currentPage * rowsPerPage;

  const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true&filters=${JSON.stringify(filters)}&as_user=${asUser}`;
  const countQuery = `filters=${JSON.stringify(filters)}`;
  const queryPath = selectedInstrument === 'ALL' ? '/jobs' : `/instrument/${selectedInstrument}/jobs`;
  const countQueryPath = selectedInstrument === 'ALL' ? '/jobs/count' : `/instrument/${selectedInstrument}/jobs/count`;
  const fetchJobs = useFetchJobs(queryPath, query, setJobs);
  const fetchTotalCount = useFetchTotalCount(countQueryPath, countQuery, setTotalRows);
  const [isBulkRerunning, setIsBulkRerunning] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [bulkRerunSuccessful, setBulkRerunSuccessful] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const totalDownloadableFiles = jobs
    .filter((job) => selectedJobIds.includes(job.id))
    .reduce((acc, job) => acc + parseJobOutputs(job.outputs).length, 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [delayPassed, setDelayPassed] = useState(false);
  const [downloadErrorOpen, setDownloadErrorOpen] = useState(false);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState('');
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [mantidVersions, setMantidVersions] = useState<MantidVersionMap>({});

  useEffect(() => {
    // Keep async response from touching state once the component unmounts.
    let isMounted = true;

    const fetchMantidVersions = async (): Promise<void> => {
      try {
        const { data } = await fiaApi.get('/jobs/runners');

        // Bail out on malformed responses to avoid runtime errors when the map is used.
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.error('Unexpected Mantid version response format:', data);
          if (isMounted) setMantidVersions({});
          return;
        }

        if (isMounted) setMantidVersions(data as MantidVersionMap);
      } catch (error) {
        console.error('Failed to fetch Mantid versions:', error);
      }
    };

    fetchMantidVersions();

    return () => {
      isMounted = false;
    };
  }, []);

  const [hasLoadedCounts, setHasLoadedCounts] = useState(false);

  // Highest index allowed for the pagination control
  const maxPageIndex = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);

  useEffect(() => {
    previousRowsPerPage.current = rowsPerPage;
  }, [rowsPerPage]);

  // Ensure the current page stays within the valid range and is an integer
  useEffect(() => {
    if (!Number.isInteger(currentPage) || currentPage < 0) {
      handlePageChange(0);
      return;
    }

    if (!hasLoadedCounts) {
      return;
    }

    if (totalRows === 0) {
      if (currentPage !== 0) {
        handlePageChange(0);
      }
      return;
    }

    const boundedPage = Math.min(currentPage, maxPageIndex);

    if (boundedPage !== currentPage) {
      handlePageChange(boundedPage);
    }
  }, [currentPage, handlePageChange, hasLoadedCounts, maxPageIndex, totalRows]);

  useEffect(() => {
    const nextFiltersString = JSON.stringify(filters);
    if (filtersStringRef.current !== nextFiltersString) {
      filtersStringRef.current = nextFiltersString;
      setSelectedJobIds([]);
    }
  }, [filters]);

  // Forward changes upstream only when the payload differs so URL sync stays
  // stable
  const onFiltersChange = (newFilters: JobQueryFilters): void => {
    const nextFiltersString = JSON.stringify(newFilters);
    if (filtersStringRef.current !== nextFiltersString) {
      filtersStringRef.current = nextFiltersString;
      setSelectedJobIds([]);
      handleFiltersChange(newFilters);
    }
  };

  useEffect(() => {
    if (!Number.isInteger(currentPage) || currentPage < 0) {
      return;
    }
    const fetchAll = async (): Promise<void> => {
      setIsLoading(true);
      try {
        await Promise.all([fetchJobs(), fetchTotalCount()]);
      } finally {
        setIsLoading(false);
        setHasLoadedCounts(true);
      }
    };
    setHasLoadedCounts(false);
    fetchAll();
  }, [currentPage, fetchJobs, fetchTotalCount, maxPageIndex]);

  useEffect(() => {
    // Clear selections when the View as user toggle changes
    // Clear selections when the page changes
    // Clear selections when the instrument changes
    setSelectedJobIds([]);
  }, [asUser, currentPage, selectedInstrument]);

  useEffect(() => {
    let timeoutId: number;

    if (!isLoading && jobs.length === 0) {
      timeoutId = window.setTimeout(() => {
        setDelayPassed(true);
      }, 500);
    } else {
      setDelayPassed(false);
    }

    return () => clearTimeout(timeoutId);
  }, [isLoading, jobs]);

  useEffect(() => {
    // Clear selections when the View as user toggle changes
    setSelectedJobIds([]);
  }, [asUser]);

  useEffect(() => {
    // Clear selections when the page changes
    setSelectedJobIds([]);
  }, [currentPage]);

  const refreshJobs = (): void => {
    void Promise.resolve(fetchJobs());
    void Promise.resolve(fetchTotalCount);
  };
  const submitRerun = async (job: Job): Promise<void> => {
    await fiaApi.post('/job/rerun', { job_id: job.id, runner_image: job.runner_image, script: job.script.value });
  };

  const toggleJobSelection = (jobId: number): void => {
    setSelectedJobIds((prevSelected) =>
      prevSelected.includes(jobId) ? prevSelected.filter((id) => id !== jobId) : [...prevSelected, jobId]
    );
  };

  const handleBulkRerun = async (): Promise<void> => {
    setIsBulkRerunning(true);
    let allSuccessful = true;

    const jobsToRerun = jobs.filter((job) => selectedJobIds.includes(job.id));

    for (const job of jobsToRerun) {
      console.log(`Rerunning job ${job.id}`);
      try {
        await submitRerun(job);
      } catch (error) {
        console.error(`Failed to rerun job ${job.id}`, error);
        allSuccessful = false;
      }
    }

    setBulkRerunSuccessful(allSuccessful);
    setSnackbarOpen(true);
    refreshJobs();
    setIsBulkRerunning(false);
    setSelectedJobIds([]);
  };

  const handleBulkDownload = async (): Promise<void> => {
    const selectedJobs = jobs.filter((job) => selectedJobIds.includes(job.id));
    const jobFiles: Record<number, string[]> = {};

    for (const job of selectedJobs) {
      const outputs = parseJobOutputs(job.outputs);
      if (outputs.length > 0) {
        jobFiles[job.id] = outputs;
      }
    }

    setDownloadingBulk(true);
    try {
      const response = await fiaApi.post('/job/download-zip', jobFiles, {
        responseType: 'blob',
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        setDownloadErrorMessage(`Bulk download failed — status ${response.status}`);
        setDownloadErrorOpen(true);
        return;
      }

      const blob = new Blob([response.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'reduction_files.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download ZIP file', err);
      setDownloadErrorMessage('An unexpected error occurred during bulk download.');
      setDownloadErrorOpen(true);
    } finally {
      setDownloadingBulk(false);
    }
  };

  const toggleSelectAll = (): void => {
    const allIds = jobs.map((job) => job.id);
    const allSelected = allIds.every((id) => selectedJobIds.includes(id));

    if (allSelected) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(allIds);
    }
  };

  const theme = useTheme();

  return (
    <>
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

      {isLoading && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: 1201,
          }}
        />
      )}
      <Box>
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
            severity={bulkRerunSuccessful ? 'success' : 'error'}
          >
            {bulkRerunSuccessful
              ? `Reruns started successfully for all selected reductions`
              : `Some reductions could not be rerun — please check the console for details`}
          </Alert>
        </Snackbar>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              className="tour-red-his-select-all"
              variant="contained"
              color="primary"
              size="small"
              onClick={toggleSelectAll}
              disabled={jobs.length === 0}
              sx={{ height: '36px', width: 140 }}
              startIcon={
                selectedJobIds.length === jobs.length ? (
                  <CheckBox />
                ) : selectedJobIds.length > 0 ? (
                  <IndeterminateCheckBox />
                ) : (
                  <CheckBoxOutlineBlank />
                )
              }
            >
              {selectedJobIds.length === jobs.length ? 'Deselect all' : 'Select all'}
            </Button>

            {selectedJobIds.length > 0 && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={isBulkRerunning}
                  onClick={handleBulkRerun}
                  sx={{ height: '36px', width: 120 }}
                >
                  {isBulkRerunning ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    `Rerun (${selectedJobIds.length})`
                  )}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBulkDownload}
                  sx={{ height: '36px', width: 200 }}
                  startIcon={!downloadingBulk && <Download />}
                  disabled={totalDownloadableFiles === 0 || downloadingBulk}
                >
                  {downloadingBulk ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    `Download all (${totalDownloadableFiles})`
                  )}
                </Button>
              </>
            )}
          </Box>

          <Box className="tour-job-table-adv-filters" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              display={'flex'}
              alignItems={'center'}
              onClick={() => setFiltersOpen(!filtersOpen)}
              sx={{
                cursor: 'pointer',
                color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
              }}
            >
              Advanced filters {filtersOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </Typography>

            <TablePagination
              component="div"
              count={totalRows}
              page={currentPage}
              onPageChange={(_, newPage) => {
                if (!Number.isInteger(newPage) || newPage < 0) {
                  return;
                }

                if (totalRows > 0 && newPage > maxPageIndex) {
                  handlePageChange(maxPageIndex);
                  return;
                }

                handlePageChange(newPage);
              }}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={JOB_ROWS_PER_PAGE_OPTIONS}
              slotProps={{
                actions: {
                  previousButton: { disabled: isLoading || currentPage === 0 },
                  nextButton: {
                    disabled: isLoading || currentPage >= Math.ceil(totalRows / rowsPerPage) - 1,
                  },
                },
              }}
              labelRowsPerPage="Rows per page"
              onRowsPerPageChange={(e) => {
                const newRowsPerPage = Number(e.target.value);

                if (!isJobRowsPerPage(newRowsPerPage)) {
                  return;
                }

                // Clear job selections if reducing the rows per page value.
                // Avoids scenarios where selected jobs are not visible
                // anymore because they're on a later page
                if (newRowsPerPage < previousRowsPerPage.current) {
                  setSelectedJobIds([]);
                }

                // Calculate what page to show: prevents the scenario where the
                // offset isbeyond the actual number of jobs
                const newPage = Math.floor((currentPage * rowsPerPage) / newRowsPerPage);
                handleRowsPerPageChange(newRowsPerPage, newPage);
              }}
            />
          </Box>
        </Box>

        <FilterContainer
          showInstrumentFilter={selectedInstrument === 'ALL'}
          visible={filtersOpen}
          handleFiltersClose={() => setFiltersOpen(false)}
          handleFiltersChange={onFiltersChange}
          appliedFilters={filters}
          jobs={jobs}
          handleBulkRerun={handleBulkRerun}
          isBulkRerunning={isBulkRerunning}
          resetPageNumber={() => handlePageChange(0)} // Reset page number when filters change
        />
        <TableContainer component={Paper} sx={{ maxHeight: 640, minHeight: 640 }}>
          <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
            <JobTableHead
              selectedInstrument={selectedInstrument}
              orderBy={orderBy}
              orderDirection={orderDirection}
              handleSort={handleSort}
              allSelected={jobs.length > 0 && selectedJobIds.length === jobs.length}
              someSelected={selectedJobIds.length > 0 && selectedJobIds.length < jobs.length}
              toggleSelectAll={() => {
                if (selectedJobIds.length === jobs.length) {
                  setSelectedJobIds([]);
                } else {
                  setSelectedJobIds(jobs.map((job) => job.id));
                }
              }}
            />

            <TableBody>
              {isLoading || (!delayPassed && jobs.length === 0) ? (
                [...Array(rowsPerPage)].map((_, index) => {
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
                    <TableRow key={index} sx={{ backgroundColor, height: 74 }}>
                      {(selectedInstrument === 'ALL' ? [...Array(10)] : [...Array(9)]).map((_, cellIndex) => (
                        <TableCell key={cellIndex} sx={{ overflow: 'hidden' }}>
                          <Skeleton variant="text" height={28} />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : jobs.length === 0 ? (
                <TableCell
                  colSpan={selectedInstrument === 'ALL' ? 10 : 9}
                  sx={{
                    borderBottom: 'none',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" mt={2} color={theme.palette.text.primary}>
                    No reductions found
                  </Typography>
                </TableCell>
              ) : (
                jobs.map((job, index) => (
                  <Row
                    key={index}
                    index={index}
                    job={job}
                    showInstrumentColumn={selectedInstrument === 'ALL'}
                    submitRerun={submitRerun}
                    refreshJobs={refreshJobs}
                    isSelected={selectedJobIds.includes(job.id)}
                    toggleSelection={toggleJobSelection}
                    mantidVersions={mantidVersions}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

export default JobTable;
