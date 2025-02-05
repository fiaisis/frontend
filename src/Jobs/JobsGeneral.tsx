// React components
import React, { useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';

// Material UI components
import { Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Local data
import JobsBase, { useFetchJobs, useFetchTotalCount, Job } from './JobsBase';

const JobsGeneral: React.FC = () => {
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const history = useHistory();
  const theme = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState(instrumentName);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('run_start');
  const offset = currentPage * rowsPerPage;
  const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true`;
  const fetchJobs = useFetchJobs(`/instrument/${selectedInstrument}/jobs`, query, setJobs);
  const fetchTotalCount = useFetchTotalCount(`/instrument/${selectedInstrument}/jobs/count`, setTotalRows);

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
      handleChangeRowsPerPage={(e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setCurrentPage(Math.floor((currentPage * rowsPerPage) / parseInt(e.target.value, 10))); // Prevents the offset from going out of range
      }}
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
      showConfigButton={selectedInstrument === 'LOQ' || selectedInstrument === 'MARI'}
    >
      <Typography
        variant="body1"
        component={Link}
        to="/reduction-history/ALL"
        sx={{
          color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          marginTop: '10px',
          width: 'fit-content',
          '&:hover': {
            textDecoration: 'underline',
          },
        }}
      >
        <ArrowBack style={{ marginRight: '4px' }} />
        View reductions for all instruments
      </Typography>
    </JobsBase>
  );
};

export default JobsGeneral;
