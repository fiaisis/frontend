import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import { Box, Button, Menu, MenuItem, Typography, useTheme } from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import React, { ReactElement, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import IMATViewer from './IMATViewer';
import InstrumentConfigDrawer from '../components/configsettings/InstrumentConfigDrawer';
import { JOB_ROWS_PER_PAGE_OPTIONS, JobRowsPerPage, isJobRowsPerPage } from '../components/jobs/constants';
import FilterContainer from '../components/jobs/Filters';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import JobTable from '../components/jobs/JobTable';
import NavArrows from '../components/navigation/NavArrows';
import { isValidInstrument } from '../lib/instrumentData';
import { JobQueryFilters } from '../lib/types';

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

const IMAT_VIEW_OPTIONS = [
  { value: 0, label: 'Reduction history', path: '/reduction-history/IMAT' },
  { value: 1, label: 'Latest image', path: '/reduction-history/IMAT/latest-image' },
  { value: 2, label: 'Stack viewer', path: '/reduction-history/IMAT/stack-viewer' },
] as const;

type ImatViewValue = (typeof IMAT_VIEW_OPTIONS)[number]['value'];

const IMAT_STACK_QUERY_PARAMS = ['jobId', 'experiment', 'instrument', 'imageIndex', 'viewerSize'] as const;
const JOB_TABLE_QUERY_PARAMS = ['page', 'rowsPerPage', 'filters', 'orderBy', 'orderDir'] as const;

const getImatViewLabel = (value: number): string =>
  IMAT_VIEW_OPTIONS.find((option) => option.value === value)?.label ?? IMAT_VIEW_OPTIONS[0].label;

const getImatViewPath = (value: ImatViewValue): string =>
  IMAT_VIEW_OPTIONS.find((option) => option.value === value)?.path ?? IMAT_VIEW_OPTIONS[0].path;

const getImatBreadcrumbViewLabel = (value: number): string =>
  value === 0 ? 'Select to view images' : getImatViewLabel(value);

const getImatViewFromPath = (pathname: string): ImatViewValue => {
  if (pathname.endsWith('/latest-image')) return 1;
  if (pathname.endsWith('/stack-viewer')) return 2;
  return 0;
};

const clearImatStackQueryParams = (params: URLSearchParams): void => {
  IMAT_STACK_QUERY_PARAMS.forEach((param) => params.delete(param));
};

const clearJobTableQueryParams = (params: URLSearchParams): void => {
  JOB_TABLE_QUERY_PARAMS.forEach((param) => params.delete(param));
};

const ImatViewSelector: React.FC<{
  value: number;
  onChange: (value: ImatViewValue) => void;
}> = ({ value, onChange }) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const selectedLabel = getImatBreadcrumbViewLabel(value);
  const visibleOptions = value === 0 ? IMAT_VIEW_OPTIONS.filter((option) => option.value !== 0) : IMAT_VIEW_OPTIONS;

  const handleSelect = (nextValue: ImatViewValue): void => {
    onChange(nextValue);
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        id="imat-view-selector-button"
        className="breadcrumb-control"
        variant="text"
        aria-haspopup="menu"
        aria-controls={open ? 'imat-view-selector-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-label={`IMAT view: ${selectedLabel}`}
        endIcon={<ArrowDropDown />}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)}
        sx={{
          minWidth: 0,
          border: 0,
          borderRadius: 0,
          boxShadow: 'none',
          font: 'inherit',
          textTransform: 'none',
          '& .MuiButton-endIcon': { ml: 0.75, mr: 0, color: 'inherit' },
        }}
      >
        <Box component="span">{selectedLabel}</Box>
      </Button>
      <Menu
        id="imat-view-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{
          'aria-labelledby': 'imat-view-selector-button',
          sx: { minWidth: 180 },
        }}
      >
        {visibleOptions.map((option) => (
          <MenuItem key={option.value} selected={option.value === value} onClick={() => handleSelect(option.value)}>
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

const Jobs: React.FC = (): ReactElement => {
  const { instrumentName } = useParams<{ instrumentName?: string }>();
  const history = useHistory();
  const location = useLocation();
  const isImat = (instrumentName || '').toUpperCase() === 'IMAT';
  const isImatViewPath = location.pathname.endsWith('/latest-image') || location.pathname.endsWith('/stack-viewer');
  const imatView = React.useMemo(
    () => (isImat ? getImatViewFromPath(location.pathname) : 0),
    [isImat, location.pathname]
  );
  const [selectedInstrument, setSelectedInstrument] = React.useState<string>(instrumentName || 'ALL');
  const configAvailable = ['LOQ', 'MARI', 'SANS2D', 'VESUVIO', 'OSIRIS', 'IRIS', 'ENGINX'].includes(
    selectedInstrument.toUpperCase()
  );
  const reductionHistoryHeading = React.useMemo(() => {
    if (isImat && imatView === 1) return 'IMAT latest image';
    if (isImat && imatView === 2) return 'IMAT stack viewer';
    return selectedInstrument === 'ALL' ? 'Reduction history' : `${selectedInstrument} reduction history`;
  }, [imatView, isImat, selectedInstrument]);
  // Redirect if an instrument is specified in the URL but it's not a valid instrument name
  React.useEffect(() => {
    if ((instrumentName && !isValidInstrument(instrumentName)) || (isImatViewPath && !isImat)) {
      window.location.replace('/404/');
    }
  }, [history, instrumentName, isImat, isImatViewPath]);
  const theme = useTheme();
  const [currentPage, setCurrentPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<JobRowsPerPage>(getStoredRowsPerPage);
  const [currentFilters, setCurrentFilters] = React.useState<JobQueryFilters>({});
  const currentFiltersStringRef = React.useRef<string>(JSON.stringify(currentFilters));
  const [asUser, setAsUser] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('asUser');
    return storedValue ? JSON.parse(storedValue) : false;
  });
  const [userRole, setUserRole] = useState<'staff' | 'user' | null>(null);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('run_start');
  const [filtersOpen, setFiltersOpen] = React.useState<boolean>(false);

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
    (next: {
      page?: number;
      rowsPerPage?: JobRowsPerPage;
      filters?: JobQueryFilters;
      orderBy?: string;
      orderDirection?: 'desc' | 'asc';
    }) => {
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

      if (next.orderBy !== undefined) {
        if (next.orderBy) {
          params.set('orderBy', JSON.stringify(next.orderBy));
        } else {
          params.delete('orderBy');
        }
      }

      if (next.orderDirection !== undefined) {
        if (next.orderDirection) {
          params.set('orderDir', JSON.stringify(next.orderDirection));
        } else {
          params.delete('orderDir');
        }
      }

      if (isImat) {
        params.delete('tab');
        if (imatView !== 2) clearImatStackQueryParams(params);
      } else {
        params.delete('tab');
        clearImatStackQueryParams(params);
      }

      const newSearch = params.toString();
      const searchString = newSearch ? `?${newSearch}` : '';
      if (searchString !== location.search) {
        history.replace({ pathname: location.pathname, search: searchString });
      }
    },
    [history, imatView, isImat, location.pathname, location.search]
  );

  React.useEffect(() => {
    if (isImat && imatView !== 0) return;
    updateQueryParams({ orderBy, orderDirection });
  }, [imatView, isImat, orderBy, orderDirection, updateQueryParams]);

  const handleInstrumentChange = (newInstrument: string): void => {
    setSelectedInstrument(newInstrument);
    const params = new URLSearchParams(location.search);
    params.delete('page');
    params.delete('tab');
    if (newInstrument.toUpperCase() !== 'IMAT') {
      clearImatStackQueryParams(params);
    }
    const search = params.toString();
    history.push({
      pathname: newInstrument === 'ALL' ? `/reduction-history` : `/reduction-history/${newInstrument}`,
      search: search ? `?${search}` : '',
    });
  };

  const handleSort = (sortKey: string): void => {
    if (sortKey === orderBy) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(sortKey);
    }
    handlePageChange(0);
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
      const nextFiltersString = JSON.stringify(newFilters);
      if (currentFiltersStringRef.current === nextFiltersString) {
        return;
      }

      currentFiltersStringRef.current = nextFiltersString;
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
        setCurrentFilters((prev) => {
          const parsedFiltersString = JSON.stringify(parsedFilters);
          if (JSON.stringify(prev) === parsedFiltersString) {
            return prev;
          }

          currentFiltersStringRef.current = parsedFiltersString;
          return parsedFilters;
        });
      } catch (error) {
        console.error('Failed to parse filters from query string', error);
      }
    } else {
      setCurrentFilters((prev) => {
        if (Object.keys(prev).length === 0) {
          return prev;
        }

        currentFiltersStringRef.current = JSON.stringify({});
        return {};
      });
    }
    if (params.has('tab')) {
      updateQueryParams({});
    }
  }, [location.search, rowsPerPage, updateQueryParams]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jobTableRowsPerPage', rowsPerPage.toString());
    }
  }, [rowsPerPage]);

  React.useEffect(() => {
    if (isImat && imatView !== 0) return;
    updateQueryParams({ rowsPerPage });
  }, [imatView, isImat, rowsPerPage, updateQueryParams]);

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

  const handleImatViewChange = (newValue: ImatViewValue): void => {
    const params = new URLSearchParams(location.search);
    params.delete('tab');
    if (newValue !== 0) clearJobTableQueryParams(params);
    if (newValue !== 2) clearImatStackQueryParams(params);

    const search = params.toString();
    history.push({
      pathname: getImatViewPath(newValue),
      search: search ? `?${search}` : '',
    });
  };

  const breadcrumbTrailingCrumbs = [
    <InstrumentSelector
      key="instrument"
      selectedInstrument={selectedInstrument}
      handleInstrumentChange={handleInstrumentChange}
      variant="breadcrumb"
    />,
    ...(isImat ? [<ImatViewSelector key="imat-view" value={imatView} onChange={handleImatViewChange} />] : []),
  ];

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          mb: 2,
          pr: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          <NavArrows
            trailingCrumb={breadcrumbTrailingCrumbs}
            replaceLastCrumb={selectedInstrument !== 'ALL'}
            replaceLastCrumbCount={isImat && imatView !== 0 ? 2 : undefined}
          />
          <Typography variant="h3" component="h1" sx={{ color: theme.palette.text.primary, px: '20px', pt: 2, pb: 1 }}>
            {reductionHistoryHeading}
          </Typography>
        </Box>
        {selectedInstrument !== 'ALL' && (
          <InstrumentConfigDrawer
            drawerOpen={configDrawerOpen}
            setDrawerOpen={setConfigDrawerOpen}
            selectedInstrument={selectedInstrument}
            disabled={!configAvailable}
          />
        )}
      </Box>
      <FilterContainer
        showInstrumentFilter={selectedInstrument === 'ALL'}
        visible={filtersOpen}
        handleFiltersClose={() => setFiltersOpen(false)}
        handleFiltersChange={handleFiltersChange}
        appliedFilters={currentFilters}
        resetPageNumber={() => handlePageChange(0)}
      />
      {isImat ? (
        <>
          {imatView === 0 && (
            <Box className="tour-red-his-tablehead" sx={{ padding: '0 20px 160px' }}>
              <JobTable
                selectedInstrument={selectedInstrument}
                currentPage={currentPage}
                handlePageChange={handlePageChange}
                asUser={asUser}
                rowsPerPage={rowsPerPage}
                handleRowsPerPageChange={handleRowsPerPageChange}
                setAsUser={setAsUser}
                showAsUserControl={userRole === 'staff'}
                filters={currentFilters}
                orderBy={orderBy}
                orderDirection={orderDirection}
                handleSort={handleSort}
                filtersApplied={hasFilters(currentFilters)}
                openFilters={() => setFiltersOpen(true)}
              />
            </Box>
          )}
          {imatView === 1 && (
            <Box sx={{ pt: 2 }}>
              <IMATViewer mode="latest" showNav={false} />
            </Box>
          )}
          {imatView === 2 && (
            <Box sx={{ pt: 2 }}>
              <IMATViewer mode="stack" showNav={false} />
            </Box>
          )}
        </>
      ) : (
        <Box className="tour-red-his-tablehead" sx={{ padding: '0 20px 160px' }}>
          <JobTable
            selectedInstrument={selectedInstrument}
            currentPage={currentPage}
            handlePageChange={handlePageChange}
            asUser={asUser}
            rowsPerPage={rowsPerPage}
            handleRowsPerPageChange={handleRowsPerPageChange}
            setAsUser={setAsUser}
            showAsUserControl={userRole === 'staff'}
            filters={currentFilters}
            orderBy={orderBy}
            orderDirection={orderDirection}
            handleSort={handleSort}
            filtersApplied={hasFilters(currentFilters)}
            openFilters={() => setFiltersOpen(true)}
          />
        </Box>
      )}
    </>
  );
};

export default Jobs;
