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
  // Extract the instrument name from URL parameters
  const { instrumentName } = useParams<{ instrumentName: string }>();

  // Hook for handling navigation
  const history = useHistory();

  // Retrieve the current theme for styling
  const theme = useTheme();

  // State variables for job data and table pagination
  const [jobs, setJobs] = useState<Job[]>([]); // Stores fetched job data
  const [totalRows, setTotalRows] = useState(0); // Stores total number of job entries
  const [selectedInstrument, setSelectedInstrument] = useState(instrumentName); // Stores currently selected instrument
  const [currentPage, setCurrentPage] = useState(0); // Current page in pagination
  const [rowsPerPage, setRowsPerPage] = useState(25); // Number of rows displayed per page
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc'); // Sorting order (ascending/descending)
  const [orderBy, setOrderBy] = useState<string>('run_start'); // Column to sort by
  const [asUser, setAsUser] = useState<boolean>(() => {
    // Whether to display jobs as a user or not
    const storedValue = localStorage.getItem('asUser');
    return storedValue ? JSON.parse(storedValue) : false; // Default to false
  });

  // Calculate the offset for API query based on current page
  const offset = currentPage * rowsPerPage;

  // Construct API query string with pagination and sorting parameters
  const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true&as_user=${asUser}`;

  // Fetch job data and total count using custom hooks
  const fetchJobs = useFetchJobs(`/instrument/${selectedInstrument}/jobs`, query, setJobs);
  const fetchTotalCount = useFetchTotalCount(`/instrument/${selectedInstrument}/jobs/count`, setTotalRows);

  const handleToggleAsUser = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.checked;
    setAsUser(newValue);
    localStorage.setItem('asUser', JSON.stringify(newValue)); // Save to localStorage
  };

  return (
    <JobsBase
      selectedInstrument={selectedInstrument}
      handleInstrumentChange={(event) => {
        const newInstrument = event.target.value;
        setSelectedInstrument(newInstrument);
        setCurrentPage(0);
        history.push(`/reduction-history/${newInstrument}`); // Navigate to selected instrument's history
      }}
      jobs={jobs}
      totalRows={totalRows}
      currentPage={currentPage}
      rowsPerPage={rowsPerPage}
      handleChangePage={(_, newPage) => setCurrentPage(newPage)}
      handleChangeRowsPerPage={(e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setCurrentPage(Math.floor((currentPage * rowsPerPage) / parseInt(e.target.value, 10))); // Prevents the offset from going out of range (NOTE: 10 is the radix for the parseInt func, do not confuse for number of rows)
      }}
      handleSort={(property) => {
        const isAsc = orderBy === property && orderDirection === 'asc';
        setOrderDirection(isAsc ? 'desc' : 'asc'); // Toggle sorting order
        setOrderBy(property);
        setCurrentPage(0); // Reset to first page after sorting
      }}
      orderBy={orderBy}
      orderDirection={orderDirection}
      fetchJobs={fetchJobs}
      fetchTotalCount={fetchTotalCount}
      showConfigButton={
        selectedInstrument === 'LOQ' || selectedInstrument === 'MARI' || selectedInstrument === 'SANS2D'
      } // Show config button only for specific instruments
      asUser={asUser}
      handleToggleAsUser={handleToggleAsUser}
    >
      {/* Link to view reductions for all instruments */}
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
