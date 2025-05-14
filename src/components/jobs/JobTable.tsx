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
} from '@mui/material';
import {
  CheckBox,
  IndeterminateCheckBox,
  CheckBoxOutlineBlank,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import React, { useEffect, useState, useRef } from 'react';
import { Job, JobQueryFilters } from '../../lib/types';
import Row from './Row';
import JobTableHead from './JobTableHead';
import { useFetchJobs, useFetchTotalCount } from '../../lib/hooks';
import { fiaApi } from '../../lib/api';
import FilterContainer from './Filters';

const JobTable: React.FC<{
  selectedInstrument: string;
  currentPage: number;
  handlePageChange: (currentPage: number) => void;
  asUser: boolean;
}> = ({ selectedInstrument, currentPage, handlePageChange, asUser }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const getInitialRowsPerPage = (): number => {
    const stored = localStorage.getItem('jobTableRowsPerPage');
    return stored ? parseInt(stored, 10) : 25;
  };
  const [rowsPerPage, setRowsPerPage] = useState<number>(getInitialRowsPerPage);
  const previousRowsPerPage = useRef<number>(rowsPerPage);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('run_start');
  const offset = currentPage * rowsPerPage;

  const [filters, setFiltersState] = useState<JobQueryFilters>({});
  const previousFilters = useRef<JobQueryFilters>({});

  const setFilters = (newFilters: JobQueryFilters): void => {
    const prev = previousFilters.current;
    const filtersChanged = JSON.stringify(prev) !== JSON.stringify(newFilters);

    if (filtersChanged) {
      previousFilters.current = newFilters;
      setSelectedJobIds([]);
      setFiltersState(newFilters);
    }
  };

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

  useEffect(() => {
    fetchJobs();
    void fetchTotalCount();
  }, [fetchTotalCount, fetchJobs]);

  useEffect(() => {
    // Clear selections when the View as user toggle changes
    // Clear selections when the page changes
    // Clear selections when the instrument changes
    setSelectedJobIds([]);
  }, [asUser, currentPage, selectedInstrument]);

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

  const handleSort = (sortKey: string): void => {
    if (sortKey === orderBy) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(sortKey);
    }
    handlePageChange(0);
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
    <Box sx={{ maxHeight: 700, pb: 1 }}>
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
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              onPageChange={(_, newPage) => handlePageChange(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                const newRowsPerPage = parseInt(e.target.value, 10);

                // Deselect rows only if rowsPerPage is reduced
                if (newRowsPerPage < previousRowsPerPage.current) {
                  setSelectedJobIds([]);
                }

                // Prevents the offset from going out of range and showing an empty table
                const newPage = Math.floor((currentPage * rowsPerPage) / newRowsPerPage);
                setRowsPerPage(newRowsPerPage);

                // Store the new rows per page in local storage
                localStorage.setItem('jobTableRowsPerPage', newRowsPerPage.toString());
                handlePageChange(newPage);
              }}
            />
          </Box>
        </Box>

        <FilterContainer
          showInstrumentFilter={selectedInstrument === 'ALL'}
          visible={filtersOpen}
          handleFiltersClose={() => setFiltersOpen(false)}
          handleFiltersChange={setFilters}
          jobs={jobs}
          handleBulkRerun={handleBulkRerun}
          isBulkRerunning={isBulkRerunning}
          resetPageNumber={() => handlePageChange(0)} // Reset page number when filters change
        />
        <TableContainer component={Paper} sx={{ maxHeight: 660, overflowY: 'scroll' }}>
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
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={selectedInstrument === 'ALL' ? 9 : 8}>
                    <Typography
                      variant="h6"
                      style={{ textAlign: 'center', marginTop: '20px', color: theme.palette.text.primary }}
                    >
                      No reductions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {jobs.map((job, index) => (
                <Row
                  key={index}
                  index={index}
                  job={job}
                  showInstrumentColumn={selectedInstrument === 'ALL'}
                  submitRerun={submitRerun}
                  refreshJobs={refreshJobs}
                  isSelected={selectedJobIds.includes(job.id)}
                  toggleSelection={toggleJobSelection}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    </Box>
  );
};

export default JobTable;
