import { Box } from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import React, { ReactElement, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import FastStartFilters from '../components/fastStartJobs/FastStartFilters';
import FastStartJobTable from '../components/fastStartJobs/FastStartJobTable';
import { isJobRowsPerPage, JOB_ROWS_PER_PAGE_OPTIONS, JobRowsPerPage } from '../components/jobs/constants';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { JobQueryFilters } from '../lib/types';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';

/**
 * Set to `true` once fast start jobs are associated with user numbers in the backend
 * to allow non-staff users (and staff in "View as user" mode) to query fast start jobs.
 */
export const FAST_START_USER_VIEW_ENABLED = false;

const DEFAULT_ROWS_PER_PAGE: JobRowsPerPage = JOB_ROWS_PER_PAGE_OPTIONS[0];
const JOB_DETAILS_QUERY_PARAM = 'jobId';

interface FastStartJobsLocationState {
  jobDetailsOpenedFromTable?: boolean;
}

const getStoredRowsPerPage = (): JobRowsPerPage => {
  if (typeof window === 'undefined') {
    return DEFAULT_ROWS_PER_PAGE;
  }
  const stored = localStorage.getItem('jobTableRowsPerPage');
  const parsed = stored ? Number(stored) : NaN;
  return isJobRowsPerPage(parsed) ? parsed : DEFAULT_ROWS_PER_PAGE;
};

const hasFilters = (filters: JobQueryFilters): boolean =>
  Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && value !== '';
  });

const getUserRole = (): 'staff' | 'user' | null => {
  if (typeof window === 'undefined') return null;
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

export interface FastStartJobsProps {
  userViewEnabled?: boolean;
}

const FastStartJobs: React.FC<FastStartJobsProps> = ({
  userViewEnabled = FAST_START_USER_VIEW_ENABLED,
}): ReactElement => {
  const { rootRef: fastStartRootRef, availableHeight: fastStartHeight } = useAvailablePluginHeight();
  const history = useHistory();
  const location = useLocation<FastStartJobsLocationState>();

  const [currentPage, setCurrentPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<JobRowsPerPage>(getStoredRowsPerPage);
  const [currentFilters, setCurrentFilters] = React.useState<JobQueryFilters>({});
  const currentFiltersStringRef = React.useRef<string>(JSON.stringify(currentFilters));
  const [asUser, setAsUser] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('asUser');
    return storedValue ? JSON.parse(storedValue) : false;
  });
  const [userRole, setUserRole] = useState<'staff' | 'user' | null>(getUserRole);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('id');
  const [filtersOpen, setFiltersOpen] = React.useState<boolean>(false);

  const userViewRestricted = !userViewEnabled && (userRole !== 'staff' || asUser);

  const rawJobId = React.useMemo(
    () => new URLSearchParams(location.search).get(JOB_DETAILS_QUERY_PARAM),
    [location.search]
  );
  const parsedJobId = rawJobId === null ? Number.NaN : Number(rawJobId);
  const selectedJobId = Number.isSafeInteger(parsedJobId) && parsedJobId > 0 ? parsedJobId : null;

  React.useEffect(() => {
    if (rawJobId === null || selectedJobId !== null) return;

    const params = new URLSearchParams(location.search);
    params.delete(JOB_DETAILS_QUERY_PARAM);
    const search = params.toString();
    history.replace({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
      state: location.state,
    });
  }, [history, location.pathname, location.search, location.state, rawJobId, selectedJobId]);

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

      const newSearch = params.toString();
      const searchString = newSearch ? `?${newSearch}` : '';
      if (searchString !== location.search) {
        history.replace({ pathname: location.pathname, search: searchString, state: location.state });
      }
    },
    [history, location.pathname, location.search, location.state]
  );

  React.useEffect(() => {
    updateQueryParams({ orderBy, orderDirection });
  }, [orderBy, orderDirection, updateQueryParams]);

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

  const handleSort = (sortKey: string): void => {
    if (sortKey === orderBy) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(sortKey);
    }
    handlePageChange(0);
  };

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
  }, [location.search, rowsPerPage, updateQueryParams]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jobTableRowsPerPage', rowsPerPage.toString());
    }
  }, [rowsPerPage]);

  React.useEffect(() => {
    localStorage.setItem('asUser', JSON.stringify(asUser));
  }, [asUser]);

  React.useEffect(() => {
    updateQueryParams({ rowsPerPage });
  }, [rowsPerPage, updateQueryParams]);

  React.useEffect(() => {
    setUserRole(getUserRole());
  }, []);

  const handleOpenJobDetails = React.useCallback(
    (jobId: number): void => {
      const params = new URLSearchParams(location.search);
      params.set(JOB_DETAILS_QUERY_PARAM, jobId.toString());
      history.push({
        pathname: location.pathname,
        search: `?${params.toString()}`,
        state: {
          ...(location.state ?? {}),
          jobDetailsOpenedFromTable: true,
        },
      });
    },
    [history, location.pathname, location.search, location.state]
  );

  const handleCloseJobDetails = React.useCallback((): void => {
    if (location.state?.jobDetailsOpenedFromTable) {
      history.goBack();
      return;
    }

    const params = new URLSearchParams(location.search);
    params.delete(JOB_DETAILS_QUERY_PARAM);
    const search = params.toString();
    history.replace({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
      state: location.state,
    });
  }, [history, location.pathname, location.search, location.state]);

  return (
    <Box
      ref={fastStartRootRef}
      data-testid="fast-start-jobs-page"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: fastStartHeight,
        maxHeight: fastStartHeight,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <PageHeader data-testid="fast-start-jobs-page-header" breadcrumbs={<NavArrows />} />
      <FastStartFilters
        visible={filtersOpen}
        handleFiltersClose={() => setFiltersOpen(false)}
        handleFiltersChange={handleFiltersChange}
        appliedFilters={currentFilters}
        resetPageNumber={() => handlePageChange(0)}
        showAsUserControl={userRole === 'staff'}
        asUser={asUser}
        setAsUser={setAsUser}
      />
      <Box sx={{ display: 'flex', flex: '1 1 auto', minHeight: 0, minWidth: 0, boxSizing: 'border-box', px: 2, pb: 2 }}>
        <FastStartJobTable
          currentPage={currentPage}
          handlePageChange={handlePageChange}
          asUser={asUser}
          rowsPerPage={rowsPerPage}
          handleRowsPerPageChange={handleRowsPerPageChange}
          setAsUser={setAsUser}
          filters={currentFilters}
          orderBy={orderBy}
          orderDirection={orderDirection}
          handleSort={handleSort}
          filtersApplied={hasFilters(currentFilters) || asUser}
          openFilters={() => setFiltersOpen(true)}
          handleFiltersChange={handleFiltersChange}
          selectedJobId={selectedJobId}
          openJobDetails={handleOpenJobDetails}
          closeJobDetails={handleCloseJobDetails}
          userViewRestricted={userViewRestricted}
        />
      </Box>
    </Box>
  );
};

export default FastStartJobs;
