import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import JobTable from '../components/jobs/JobTable';
import { Box, Button, FormControlLabel, SelectChangeEvent, Switch, Typography, useTheme } from '@mui/material';
import { ArrowBack, Settings } from '@mui/icons-material';
import React, { ReactElement, useState } from 'react';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import InstrumentConfigDrawer from '../components/configsettings/InstrumentConfigDrawer';
import { jwtDecode } from 'jwt-decode';
import IMATView from '../components/imat/IMATView';
import { JobQueryFilters } from '../lib/types';
import { JOB_ROWS_PER_PAGE_OPTIONS, JobRowsPerPage, isJobRowsPerPage } from '../components/jobs/constants';
import NavArrows from '../components/navigation/NavArrows';

const DEFAULT_ROWS_PER_PAGE: JobRowsPerPage = JOB_ROWS_PER_PAGE_OPTIONS[1];

// Retrieve rows per page from localStorage or use default
const getStoredRowsPerPage = (): JobRowsPerPage => {
  if (typeof window === 'undefined') {
    return DEFAULT_ROWS_PER_PAGE;
  }
  const stored = localStorage.getItem('jobTableRowsPerPage');
  const parsed = stored ? Number(stored) : NaN;
  return isJobRowsPerPage(parsed) ? parsed : DEFAULT_ROWS_PER_PAGE;
};

// Check if any filters are applied
const hasFilters = (filters: JobQueryFilters): boolean =>
  Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && value !== '';
  });

const Jobs: React.FC = (): ReactElement => {
  const { instrumentName } = useParams<{ instrumentName?: string }>();
  const history = useHistory();
  const location = useLocation();
  const [selectedInstrument, setSelectedInstrument] = React.useState<string>(instrumentName || 'ALL');
  const theme = useTheme();
  const [currentPage, setCurrentPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<JobRowsPerPage>(getStoredRowsPerPage);
  const [currentFilters, setCurrentFilters] = React.useState<JobQueryFilters>({});
  const [asUser, setAsUser] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('asUser');
    return storedValue ? JSON.parse(storedValue) : false;
  });
  const [userRole, setUserRole] = useState<'staff' | 'user' | null>(null);

  const getUserRole = (): 'staff' | 'user' | null => {
    const token = localStorage.getItem('scigateway:token');
    if (!token) return null;
    try {
      const decoded = jwtDecode<{ role?: 'staff' | 'user' }>(token);
      return decoded.role || 'user';
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Keep table state mirrored in the browser URL so views are shareable
  const updateQueryParams = React.useCallback(
    (next: { page?: number; rowsPerPage?: JobRowsPerPage; filters?: JobQueryFilters }) => {
      const params = new URLSearchParams(location.search);

      if (next.page !== undefined) {
        if (next.page <= 0) {
          params.delete('page');
        } else {
          params.set('page', next.page.toString());
        }
      }

      if (next.rowsPerPage !== undefined) {
        if (isJobRowsPerPage(next.rowsPerPage)) {
          params.set('rowsPerPage', next.rowsPerPage.toString());
        } else {
          params.delete('rowsPerPage');
        }
      }

      if (next.filters !== undefined) {
        const filtersValue = next.filters;
        if (filtersValue && hasFilters(filtersValue)) {
          params.set('filters', JSON.stringify(filtersValue));
        } else {
          params.delete('filters');
        }
      }

      const newSearch = params.toString();
      const searchString = newSearch ? `?${newSearch}` : '';
      if (searchString !== location.search) {
        history.replace({ pathname: location.pathname, search: searchString });
      }
    },
    [history, location.pathname, location.search]
  );

  const handleInstrumentChange = (event: SelectChangeEvent<string>): void => {
    const newInstrument = event.target.value;
    setSelectedInstrument(newInstrument);
    const params = new URLSearchParams(location.search);
    params.delete('page');
    const search = params.toString();
    history.push({
      pathname: newInstrument === 'ALL' ? `/reduction-history` : `/reduction-history/${newInstrument}`,
      search: search ? `?${search}` : '',
    });
  };

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      if (!Number.isInteger(newPage) || newPage < 0) {
        return;
      }

      setCurrentPage(newPage);
      updateQueryParams({ page: newPage });
    },
    [updateQueryParams]
  );

  const handleRowsPerPageChange = React.useCallback(
    (newRowsPerPage: JobRowsPerPage, newPage: number) => {
      if (!isJobRowsPerPage(newRowsPerPage)) {
        return;
      }

      setRowsPerPage(newRowsPerPage);
      setCurrentPage(newPage);
      updateQueryParams({ rowsPerPage: newRowsPerPage, page: newPage });
    },
    [updateQueryParams]
  );

  const handleFiltersChange = React.useCallback(
    (newFilters: JobQueryFilters) => {
      setCurrentFilters(newFilters);
      setCurrentPage(0);
      updateQueryParams({ filters: newFilters, page: 0 });
    },
    [updateQueryParams]
  );

  // When the location changes (navigation/back button), hydrate local state from the URL
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);

    const rawPage = params.get('page');
    const parsedPage = rawPage === null ? Number.NaN : Number(rawPage);
    const sanitizedPage = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0;
    setCurrentPage((prev) => (prev !== sanitizedPage ? sanitizedPage : prev));
    if (rawPage !== null && (!Number.isInteger(parsedPage) || parsedPage < 0 || sanitizedPage !== parsedPage)) {
      updateQueryParams({ page: sanitizedPage });
    }

    const rowsParam = Number.parseInt(params.get('rowsPerPage') ?? '', 10);
    if (!Number.isNaN(rowsParam) && isJobRowsPerPage(rowsParam) && rowsParam !== rowsPerPage) {
      setRowsPerPage(rowsParam);
    } else if (params.has('rowsPerPage') && !isJobRowsPerPage(rowsParam)) {
      updateQueryParams({ rowsPerPage });
    }

    const filtersParam = params.get('filters');
    if (filtersParam) {
      try {
        const parsedFilters = JSON.parse(filtersParam) as JobQueryFilters;
        setCurrentFilters((prev) => (JSON.stringify(prev) !== JSON.stringify(parsedFilters) ? parsedFilters : prev));
      } catch (error) {
        console.error('Failed to parse filters from query string', error);
      }
    } else {
      setCurrentFilters((prev) => (Object.keys(prev).length > 0 ? {} : prev));
    }
  }, [location.search, rowsPerPage, updateQueryParams]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jobTableRowsPerPage', rowsPerPage.toString());
    }
  }, [rowsPerPage]);

  React.useEffect(() => {
    updateQueryParams({ rowsPerPage });
  }, [rowsPerPage, updateQueryParams]);

  React.useEffect(() => {
    setSelectedInstrument(instrumentName || 'ALL');
  }, [instrumentName]);

  const previousInstrumentRef = React.useRef<string>(selectedInstrument);
  // Instrument navigation must reset pagination and URL state to the first page
  React.useEffect(() => {
    if (previousInstrumentRef.current !== selectedInstrument) {
      setCurrentPage(0);
      updateQueryParams({ page: 0 });
    }
    previousInstrumentRef.current = selectedInstrument;
  }, [selectedInstrument, updateQueryParams]);

  React.useEffect(() => {
    setUserRole(getUserRole());
  }, []);

  const [configDrawerOpen, setConfigDrawerOpen] = React.useState<boolean>(false);
  const showConfigButton = ['LOQ', 'MARI', 'SANS2D', 'VESUVIO', 'OSIRIS', 'IRIS', 'ENGINX'].includes(
    selectedInstrument
  );

  return (
    <>
      <NavArrows />
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ padding: '20px', height: '100%' }}>
        <Box display="flex" flexDirection="column">
          <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
            {selectedInstrument} reductions
          </Typography>
          <Box sx={{ height: '24px' }}>
            {selectedInstrument !== 'ALL' && (
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
                <ArrowBack style={{ marginRight: '4px' }} />
                View reductions for all instruments
              </Typography>
            )}
          </Box>
        </Box>
        <Box className="tour-view-as-user" display="flex" alignItems="center">
          {userRole === 'staff' && (
            <FormControlLabel
              control={<Switch checked={asUser} onChange={() => setAsUser(!asUser)} color="secondary" />}
              label={
                <Typography variant="body1" color={theme.palette.text.primary}>
                  View as user
                </Typography>
              }
              sx={{ marginRight: '16px' }}
            />
          )}
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={() => setConfigDrawerOpen(true)}
            disabled={!showConfigButton}
            sx={{ marginRight: '20px' }}
          >
            Config
          </Button>
          <InstrumentSelector selectedInstrument={selectedInstrument} handleInstrumentChange={handleInstrumentChange} />
        </Box>
      </Box>
      <InstrumentConfigDrawer
        drawerOpen={configDrawerOpen}
        setDrawerOpen={setConfigDrawerOpen}
        selectedInstrument={selectedInstrument}
      />
      <Box className="tour-red-his-tablehead" sx={{ padding: '0 20px 20px' }}>
        {selectedInstrument === 'IMAT' ? (
          <IMATView />
        ) : (
          <JobTable
            selectedInstrument={selectedInstrument}
            currentPage={currentPage}
            handlePageChange={handlePageChange}
            asUser={asUser}
            rowsPerPage={rowsPerPage}
            handleRowsPerPageChange={handleRowsPerPageChange}
            filters={currentFilters}
            handleFiltersChange={handleFiltersChange}
          />
        )}
      </Box>
    </>
  );
};

export default Jobs;
