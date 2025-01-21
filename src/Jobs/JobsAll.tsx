// React components
import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

// Material UI components
import { useTheme } from '@mui/material/styles';
import { TableCell, Link } from '@mui/material';

// Local data
import JobsBase, { useFetchJobs, useFetchTotalCount, Job, headerStyles } from './JobsBase';

const JobsAll: React.FC = () => {
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const theme = useTheme();
  const history = useHistory();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedInstrument, setSelectedInstrument] = useState(instrumentName || 'ALL');
  const [orderBy, setOrderBy] = useState<string>('run_start');
  const offset = currentPage * rowsPerPage;
  const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true`;
  const fetchJobs = useFetchJobs(`/jobs`, query, setJobs);
  const fetchTotalCount = useFetchTotalCount(`/jobs/count`, setTotalRows);

  return (
    <JobsBase
      selectedInstrument={selectedInstrument}
      handleInstrumentChange={(event) => {
        const newInstrument = event.target.value;
        setSelectedInstrument(newInstrument);
        setCurrentPage(0);
        history.push(`/reduction-history/${newInstrument}`);
      }}
      jobs={jobs}
      totalRows={totalRows}
      currentPage={currentPage}
      rowsPerPage={rowsPerPage}
      handleChangePage={(_, newPage) => setCurrentPage(newPage)}
      handleChangeRowsPerPage={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
      handleSort={(property) => {
        const isAsc = orderBy === property && orderDirection === 'asc';
        setOrderDirection(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setCurrentPage(0);
      }}
      orderBy={orderBy}
      orderDirection={orderDirection}
      fetchJobs={fetchJobs}
      fetchTotalCount={fetchTotalCount}
      customHeaders={<TableCell sx={{ width: '10%', ...headerStyles(theme) }}>Instrument</TableCell>}
      customRowCells={(job: Job) => (
        <TableCell sx={{ width: '10%' }}>
          {job.run?.instrument_name ? (
            <Link
              href={`/fia/reduction-history/${job.run.instrument_name}`}
              sx={{
                color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
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
