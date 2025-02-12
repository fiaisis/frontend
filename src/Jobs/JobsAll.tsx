// React components
import React, { useState } from 'react';
import { useHistory, useParams, Link } from 'react-router-dom';

// Material UI components
import { useTheme } from '@mui/material/styles';
import { TableCell } from '@mui/material';

// Local data and utilities
import JobsBase, { useFetchJobs, useFetchTotalCount, Job, headerStyles } from './JobsBase';

const JobsAll: React.FC = () => {
  // Extract instrument name from URL parameters
  const { instrumentName } = useParams<{ instrumentName: string }>();

  // Retrieve the current theme for styling
  const theme = useTheme();

  // Hook for handling navigation within the app
  const history = useHistory();

  // State variables for job data and table pagination
  const [jobs, setJobs] = useState<Job[]>([]); // Stores fetched job data
  const [totalRows, setTotalRows] = useState(0); // Stores total number of job entries
  const [currentPage, setCurrentPage] = useState(0); // Current page in pagination
  const [rowsPerPage, setRowsPerPage] = useState(25); // Number of rows displayed per page
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc'); // Sorting order (ascending/descending)
  const [selectedInstrument, setSelectedInstrument] = useState(instrumentName || 'ALL'); // Selected instrument filter
  const [orderBy, setOrderBy] = useState<string>('run_start'); // Column to sort by
  const [asUser, setAsUser] = useState<boolean>(false);

  // Calculate the offset for API query based on current page
  const offset = currentPage * rowsPerPage;

  // Construct API query string with pagination and sorting parameters
  const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true&as_user=${asUser}`;

  // Fetch job data and total count using custom hooks
  const fetchJobs = useFetchJobs(`/jobs`, query, setJobs);
  const fetchTotalCount = useFetchTotalCount(`/jobs/count`, setTotalRows);

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
      // Custom table header for instrument column
      customHeaders={<TableCell sx={{ width: '10%', ...headerStyles(theme) }}>Instrument</TableCell>}
      // Custom rendering of job row cells for instrument name with a clickable link
      customRowCells={(job: Job) => (
        <TableCell sx={{ width: '10%' }}>
          {job.run?.instrument_name ? (
            <Link
              to={`/reduction-history/${job.run.instrument_name}`}
              style={{
                color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')} // Underline on hover
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')} // Remove underline on hover out
            >
              {job.run.instrument_name}
            </Link>
          ) : (
            'Unknown' // Display 'Unknown' if no instrument name exists
          )}
        </TableCell>
      )}
      maxHeight={650} // Limit table height
      asUser={asUser}
      handleToggleAsUser={(event) => setAsUser(event.target.checked)}
    />
  );
};

export default JobsAll;
