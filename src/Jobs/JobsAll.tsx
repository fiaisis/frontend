// React components
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Material UI components
import { useTheme } from '@mui/material/styles';
import { TableCell } from '@mui/material';

// Local data
import JobsBase, { Job, headerStyles } from './JobsBase';

const JobsAll: React.FC = () => {
  const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
  const theme = useTheme();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('run_start');

  const fetchTotalCount = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${fiaApiUrl}/jobs/count`);
      const data = await response.json();
      setTotalRows(data.count);
    } catch (error) {
      console.error('Error fetching run count:', error);
    }
  }, [fiaApiUrl]);

  const fetchJobs = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('scigateway:token');
      const offset = currentPage * rowsPerPage;
      const query = `limit=${rowsPerPage}&offset=${offset}&order_direction=${orderDirection}&include_run=true`;
      const response = await fetch(`${fiaApiUrl}/jobs?${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      setJobs(data);
    } catch (error) {
      console.error('Error fetching reductions:', error);
    }
  }, [currentPage, rowsPerPage, orderDirection, fiaApiUrl]);

  useEffect(() => {
    fetchTotalCount();
    fetchJobs();
  }, [fetchTotalCount, fetchJobs]);

  const handleChangePage = (event: unknown, newPage: number): void => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const handleSort = (property: string): void => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setCurrentPage(0);
  };

  return (
    <JobsBase
      selectedInstrument="All"
      jobs={jobs}
      totalRows={totalRows}
      currentPage={currentPage}
      rowsPerPage={rowsPerPage}
      handleChangePage={handleChangePage}
      handleChangeRowsPerPage={handleChangeRowsPerPage}
      handleSort={handleSort}
      orderBy={orderBy}
      orderDirection={orderDirection}
      customHeaders={<TableCell sx={{ width: '10%', ...headerStyles(theme) }}>Instrument</TableCell>}
      customRowCells={(job: Job) => (
        <TableCell sx={{ width: '10%' }}>
          {job.run?.instrument_name ? (
            <Link
              to={`/reduction-history/${job.run.instrument_name}`}
              style={{
                color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                textDecoration: 'none',
              }}
            >
              {job.run.instrument_name}
            </Link>
          ) : (
            'Unknown'
          )}
        </TableCell>
      )}
      maxHeight={650}
    />
  );
};

export default JobsAll;
