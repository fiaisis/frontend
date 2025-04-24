import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  IconButton,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { Close, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { Snackbar, Alert } from '@mui/material';
import React, { useEffect, useState } from 'react';
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
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('run_start');
  const [loading, setLoading] = useState<boolean>(true);
  const offset = currentPage * rowsPerPage;
  const [filters, setFilters] = useState<JobQueryFilters>({});
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
    fetchJobs().then(() => setLoading(false));
    void fetchTotalCount();
  }, [fetchTotalCount, fetchJobs]);

  useEffect(() => {
    // Clear selections when the View as user toggle changes
    setSelectedJobIds([]);
  }, [asUser]);

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

  const clearSelectedJobs: () => void = () => setSelectedJobIds([]);

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

  const theme = useTheme();

  return loading ? (
    <CircularProgress />
  ) : (
    <Box sx={{ maxHeight: 660, pb: 1 }}>
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
              ? `All reductions rerun successfully`
              : `Some reductions could not be rerun — please check the console for details`}
          </Alert>
        </Snackbar>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              display={'flex'}
              alignItems={'center'}
              onClick={() => setFiltersOpen(!filtersOpen)}
              sx={{ cursor: 'pointer', color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main }}
            >
              Advanced filters {filtersOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </Typography>

            {/* Bulk rerun button */}
            <Button
              variant="contained"
              color="primary"
              disabled={selectedJobIds.length === 0 || isBulkRerunning}
              onClick={handleBulkRerun}
              sx={{ height: '36px' }}
            >
              {isBulkRerunning ? 'Rerunning...' : `Rerun selected reductions (${selectedJobIds.length})`}
            </Button>

            {/* Clear selection button */}
            <Tooltip title="Clear selection">
              <IconButton onClick={clearSelectedJobs} disabled={selectedJobIds.length === 0}>
                <Close />
              </IconButton>
            </Tooltip>
          </Box>

          <TablePagination
            component="div"
            count={totalRows}
            page={currentPage}
            onPageChange={(_, newPage) => handlePageChange(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          />
        </Box>

        <FilterContainer
          showInstrumentFilter={selectedInstrument === 'ALL'}
          visible={filtersOpen}
          handleFiltersClose={() => setFiltersOpen(false)}
          handleFiltersChange={setFilters}
          jobs={jobs}
          handleBulkRerun={handleBulkRerun}
          isBulkRerunning={isBulkRerunning}
        />
        <TableContainer component={Paper} sx={{ maxHeight: 624, overflowY: 'scroll' }}>
          <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
            <JobTableHead
              selectedInstrument={selectedInstrument}
              orderBy={orderBy}
              orderDirection={orderDirection}
              handleSort={handleSort}
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
