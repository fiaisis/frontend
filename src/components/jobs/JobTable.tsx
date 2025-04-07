import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
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
  const getInitialRowsPerPage = (): number => {
    const stored = localStorage.getItem('jobTableRowsPerPage');
    return stored ? parseInt(stored, 10) : 25;
  };
  const [rowsPerPage, setRowsPerPage] = useState<number>(getInitialRowsPerPage);
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

  useEffect(() => {
    fetchJobs().then(() => setLoading(false));
    void fetchTotalCount();
  }, [fetchTotalCount, fetchJobs]);

  const refreshJobs = (): void => {
    void Promise.resolve(fetchJobs());
    void Promise.resolve(fetchTotalCount);
  };
  const handleRerun = async (job: Job): Promise<void> => {
    await fiaApi.post('/job/rerun', { job_id: job.id, runner_image: job.runner_image, script: job.script.value });
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Typography
            display={'flex'}
            alignItems={'center'}
            onClick={() => setFiltersOpen(!filtersOpen)}
            sx={{ cursor: 'pointer', color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main }}
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
              // Prevents the offset from going out of range and showing an empty table
              const newRowsPerPage = parseInt(e.target.value, 10);
              const newPage = Math.floor((currentPage * rowsPerPage) / newRowsPerPage);
              setRowsPerPage(newRowsPerPage);
              localStorage.setItem('jobTableRowsPerPage', newRowsPerPage.toString());
              handlePageChange(newPage);
            }}
          />
        </Box>
        <FilterContainer
          showInstrumentFilter={selectedInstrument === 'ALL'}
          visible={filtersOpen}
          handleFiltersClose={() => setFiltersOpen(false)}
          handleFiltersChange={setFilters}
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
                  submitRerun={handleRerun}
                  refreshJobs={refreshJobs}
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
