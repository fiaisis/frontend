import { Close, FilterList } from '@mui/icons-material';
import {
  Badge,
  Box,
  Button,
  Chip,
  Pagination,
  PaginationItem,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import FastStartJobTableHead from './FastStartJobTableHead';
import FastStartRow, { FastStartJobDetailsModal } from './FastStartRow';
import { fiaApi } from '../../lib/api';
import { useFetchJobs, useFetchTotalCount } from '../../lib/hooks';
import { Job, JobQueryFilters } from '../../lib/types';
import {
  getJobTableChromeColors,
  JOB_ROWS_PER_PAGE_OPTIONS,
  JOB_TABLE_CHROME_CONTROL_HEIGHT,
  JOB_TABLE_CHROME_ROW_MIN_HEIGHT,
  JOB_TABLE_FOOTER_CONTROL_WIDTH,
  JOB_TABLE_MIN_WIDTH,
  JOB_TABLE_ROW_HEIGHT,
  JOB_TABLE_SCROLLBAR_WIDTH,
  JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
  JobRowsPerPage,
} from '../jobs/constants';

const formatDisplayedRows = ({ from, to, count }: { from: number; to: number; count: number }): string => {
  const total = count === -1 ? `more than ${to}` : count.toString();
  return `Showing ${from}-${to} of ${total} jobs`;
};

const FAST_START_TABLE_COLUMN_WIDTHS = ['10%', '18%', '24%', '24%', '24%'] as const;
const JOB_FILTER_CHIP_HEIGHT = 28;

const FAST_START_FILTER_LABELS: Partial<Record<keyof JobQueryFilters, string>> = {
  experiment_number_in: 'Experiment',
  experiment_number_after: 'Experiment after',
  experiment_number_before: 'Experiment before',
  job_state_in: 'State',
  job_start_before: 'Job start before',
  job_start_after: 'Job start after',
  job_end_before: 'Job end before',
  job_end_after: 'Job end after',
};

const getActiveFilterLabels = (filters: JobQueryFilters): Array<{ key: keyof JobQueryFilters; label: string }> =>
  (Object.keys(FAST_START_FILTER_LABELS) as Array<keyof JobQueryFilters>).flatMap((key) => {
    const value = filters[key];
    const isActive = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';

    if (!isActive) {
      return [];
    }

    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    return [{ key, label: `${FAST_START_FILTER_LABELS[key]}: ${displayValue}` }];
  });

const FastStartTableColumnGroup = (): React.ReactElement => (
  <colgroup>
    {FAST_START_TABLE_COLUMN_WIDTHS.map((width, index) => (
      <col key={index} style={{ width }} />
    ))}
  </colgroup>
);

export interface FastStartJobTableProps {
  currentPage: number;
  handlePageChange: (currentPage: number) => void;
  asUser: boolean;
  setAsUser: (asUser: boolean) => void;
  rowsPerPage: JobRowsPerPage;
  handleRowsPerPageChange: (rowsPerPage: JobRowsPerPage, newPage: number) => void;
  filters: JobQueryFilters;
  handleSort: (sortKey: string) => void;
  orderBy: string;
  orderDirection: 'desc' | 'asc';
  filtersApplied: boolean;
  openFilters: () => void;
  handleFiltersChange: (filters: JobQueryFilters) => void;
  selectedJobId: number | null;
  openJobDetails: (jobId: number) => void;
  closeJobDetails: () => void;
  userViewRestricted?: boolean;
}

const FastStartJobTable: React.FC<FastStartJobTableProps> = ({
  currentPage,
  handlePageChange,
  asUser,
  setAsUser,
  rowsPerPage,
  handleRowsPerPageChange,
  filters,
  orderBy,
  orderDirection,
  handleSort,
  filtersApplied,
  openFilters,
  handleFiltersChange,
  selectedJobId,
  openJobDetails,
  closeJobDetails,
  userViewRestricted = false,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const bodyTableRef = useRef<HTMLTableElement>(null);
  const [scrollbarGutterWidth, setScrollbarGutterWidth] = useState(JOB_TABLE_SCROLLBAR_WIDTH);

  useLayoutEffect(() => {
    const scrollContainer = tableScrollRef.current;
    const bodyTable = bodyTableRef.current;
    if (!scrollContainer || !bodyTable) return;

    const measureScrollbarGutter = (): void => {
      setScrollbarGutterWidth(
        Math.max(0, scrollContainer.getBoundingClientRect().width - bodyTable.getBoundingClientRect().width)
      );
    };

    measureScrollbarGutter();
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measureScrollbarGutter);
    resizeObserver?.observe(scrollContainer);
    resizeObserver?.observe(bodyTable);
    window.addEventListener('resize', measureScrollbarGutter);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureScrollbarGutter);
    };
  }, []);

  const offset = currentPage * rowsPerPage;

  const requestFilters = React.useMemo(() => ({ ...filters, job_type_in: ['FAST_START'] }), [filters]);
  const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true&filters=${JSON.stringify(requestFilters)}&as_user=${asUser}&include_fast_start_jobs=true`;
  const countQuery = `filters=${JSON.stringify(requestFilters)}&include_fast_start_jobs=true`;
  const fetchJobs = useFetchJobs('/jobs', query, setJobs);
  const fetchTotalCount = useFetchTotalCount('/jobs/count', countQuery, setTotalRows);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [delayPassed, setDelayPassed] = useState(false);
  const [loadedDetailJob, setLoadedDetailJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadToken, setDetailReloadToken] = useState(0);
  const [hasLoadedCounts, setHasLoadedCounts] = useState(false);

  const selectedTableJob = selectedJobId === null ? null : (jobs.find((job) => job.id === selectedJobId) ?? null);
  const detailJob = selectedTableJob ?? (loadedDetailJob?.id === selectedJobId ? loadedDetailJob : null);

  useEffect(() => {
    if (selectedJobId === null || userViewRestricted) {
      setLoadedDetailJob(null);
      setDetailLoading(false);
      setDetailError(null);
      return undefined;
    }

    if (!hasLoadedCounts) {
      setDetailLoading(true);
      setDetailError(null);
      return undefined;
    }

    if (selectedTableJob) {
      setLoadedDetailJob(null);
      setDetailLoading(false);
      setDetailError(null);
      return undefined;
    }

    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);

    fiaApi
      .get<Job>(`/job/${selectedJobId}`, { signal: controller.signal })
      .then(({ data }) => {
        setLoadedDetailJob(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(`Failed to load job ${selectedJobId}`, error);
          setDetailError('The job details could not be loaded.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      });

    return () => controller.abort();
  }, [detailReloadToken, hasLoadedCounts, selectedJobId, selectedTableJob, userViewRestricted]);

  const maxPageIndex = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
  const boundedPageForDisplay = Math.min(currentPage, maxPageIndex);
  const displayedRowsLabel = formatDisplayedRows({
    from: totalRows === 0 ? 0 : boundedPageForDisplay * rowsPerPage + 1,
    to: totalRows === 0 ? 0 : Math.min((boundedPageForDisplay + 1) * rowsPerPage, totalRows),
    count: totalRows,
  });

  useEffect(() => {
    if (!Number.isInteger(currentPage) || currentPage < 0) {
      handlePageChange(0);
      return;
    }

    if (!hasLoadedCounts) {
      return;
    }

    if (totalRows === 0) {
      if (currentPage !== 0) {
        handlePageChange(0);
      }
      return;
    }

    const boundedPage = Math.min(currentPage, maxPageIndex);

    if (boundedPage !== currentPage) {
      handlePageChange(boundedPage);
    }
  }, [currentPage, handlePageChange, hasLoadedCounts, maxPageIndex, totalRows]);

  useEffect(() => {
    if (!Number.isInteger(currentPage) || currentPage < 0) {
      return;
    }
    if (userViewRestricted) {
      setJobs([]);
      setTotalRows(0);
      setIsLoading(false);
      setHasLoadedCounts(true);
      setDelayPassed(true);
      return;
    }
    const fetchAll = async (): Promise<void> => {
      setIsLoading(true);
      try {
        await Promise.all([fetchJobs(), fetchTotalCount()]);
      } finally {
        setIsLoading(false);
        setHasLoadedCounts(true);
      }
    };
    setHasLoadedCounts(false);
    void fetchAll();
  }, [currentPage, fetchJobs, fetchTotalCount, maxPageIndex, userViewRestricted]);

  useEffect(() => {
    let timeoutId: number;

    if (userViewRestricted) {
      setDelayPassed(true);
    } else if (!isLoading && jobs.length === 0) {
      timeoutId = window.setTimeout(() => {
        setDelayPassed(true);
      }, 500);
    } else {
      setDelayPassed(false);
    }

    return () => clearTimeout(timeoutId);
  }, [isLoading, jobs, userViewRestricted]);

  const handleRowsPerPageButtonChange = (newRowsPerPage: JobRowsPerPage): void => {
    const newPage = Math.floor((currentPage * rowsPerPage) / newRowsPerPage);
    handleRowsPerPageChange(newRowsPerPage, newPage);
  };

  const theme = useTheme();
  const tableChrome = getJobTableChromeColors(theme.palette.mode);
  const toolbarTextColor = tableChrome.text;
  const selectedFooterControlStyle: React.CSSProperties = {
    borderColor: alpha(tableChrome.accent, 0.42),
    backgroundColor: alpha(tableChrome.accent, theme.palette.mode === 'dark' ? 0.18 : 0.1),
    color: tableChrome.accent,
    fontWeight: 700,
  };
  const toolbarButtonSx = {
    height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
    boxSizing: 'border-box',
    borderRadius: 0,
    border: 0,
    color: toolbarTextColor,
    '&:hover': {
      border: 0,
      backgroundColor: tableChrome.hover,
    },
    '&.Mui-disabled': {
      border: 0,
      color: alpha(toolbarTextColor, 0.42),
    },
  };

  const activeFilterLabels = getActiveFilterLabels(filters);
  const activeFilterCount = activeFilterLabels.length + (asUser ? 1 : 0);
  const emptyStateHeading = userViewRestricted
    ? asUser
      ? 'Fast start jobs are unavailable in user view'
      : 'Fast start jobs are staff only'
    : 'No fast start jobs found';
  const emptyStateMessage = userViewRestricted
    ? asUser
      ? 'Fast start jobs are not yet associated with user accounts. Disable "View as user" to view them.'
      : 'Fast start jobs are currently only available to staff.'
    : filtersApplied
      ? 'Try adjusting or clearing your filters.'
      : 'Fast start jobs will appear here once they are available.';

  const removeFilter = (key: keyof JobQueryFilters): void => {
    const nextFilters = { ...filters };
    delete nextFilters[key];
    handleFiltersChange(nextFilters);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      <Paper
        square
        elevation={0}
        data-testid="fast-start-jobs-table-paper"
        style={{ borderRadius: '0px' }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          borderLeft: `1px solid ${tableChrome.border}`,
          borderRight: `1px solid ${tableChrome.border}`,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: tableChrome.surface,
        }}
      >
        <Box
          data-testid="fast-start-jobs-table-container"
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            minHeight: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
        >
          <Box
            data-testid="fast-start-jobs-table-toolbar"
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              columnGap: 2,
              rowGap: 1,
              flexWrap: 'wrap',
              flexShrink: 0,
              minWidth: JOB_TABLE_MIN_WIDTH,
              position: 'sticky',
              top: 0,
              zIndex: 3,
              width: '100%',
              boxSizing: 'border-box',
              minHeight: JOB_TABLE_CHROME_ROW_MIN_HEIGHT,
              pl: 0,
              pr: 0,
              py: 0,
              backgroundColor: tableChrome.surface,
              color: toolbarTextColor,
              boxShadow: `inset 0 1px 0 ${tableChrome.border}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                columnGap: 4,
                rowGap: 1,
                flex: '1 1 320px',
                minWidth: 0,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                whiteSpace: 'nowrap',
              }}
            >
              {(activeFilterLabels.length > 0 || asUser) && (
                <Box
                  data-testid="active-filter-chips"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                    alignContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {activeFilterLabels.map((filter) => (
                    <Chip
                      key={filter.key}
                      label={filter.label}
                      size="small"
                      variant="outlined"
                      onDelete={() => removeFilter(filter.key)}
                      deleteIcon={<Close aria-label={`Remove filter ${filter.label}`} />}
                      sx={{
                        maxWidth: 220,
                        height: JOB_FILTER_CHIP_HEIGHT,
                        boxSizing: 'border-box',
                        borderRadius: 0,
                        color: tableChrome.accent,
                        borderColor: alpha(tableChrome.accent, 0.5),
                        backgroundColor: alpha(tableChrome.accent, 0.08),
                        fontSize: '0.75rem',
                        '& .MuiChip-label': {
                          px: 0.75,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                        '& .MuiChip-deleteIcon': {
                          width: 16,
                          height: 16,
                          ml: 0,
                          mr: 0.5,
                          color: alpha(tableChrome.accent, 0.76),
                          '&:hover': { color: tableChrome.accent },
                        },
                      }}
                    />
                  ))}
                  {asUser && (
                    <Chip
                      label="View as user"
                      size="small"
                      variant="outlined"
                      onDelete={() => {
                        setAsUser(false);
                        handlePageChange(0);
                      }}
                      deleteIcon={<Close aria-label="Remove filter View as user" />}
                      sx={{
                        height: JOB_FILTER_CHIP_HEIGHT,
                        boxSizing: 'border-box',
                        borderRadius: 0,
                        color: tableChrome.accent,
                        borderColor: alpha(tableChrome.accent, 0.5),
                        backgroundColor: alpha(tableChrome.accent, 0.08),
                        fontSize: '0.75rem',
                        '& .MuiChip-label': { px: 0.75 },
                        '& .MuiChip-deleteIcon': {
                          width: 16,
                          height: 16,
                          ml: 0,
                          mr: 0.5,
                          color: alpha(tableChrome.accent, 0.76),
                          '&:hover': { color: tableChrome.accent },
                        },
                      }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      handleFiltersChange({});
                      setAsUser(false);
                      handlePageChange(0);
                    }}
                    sx={toolbarButtonSx}
                  >
                    Clear all filters
                  </Button>
                </Box>
              )}
              <Box
                data-testid="fast-start-jobs-toolbar-actions"
                sx={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 0,
                  height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                  borderLeft: `1px solid ${tableChrome.border}`,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} applied)` : 'Filters'}
                  startIcon={
                    <Box component="span" aria-hidden="true" sx={{ display: 'inline-flex' }}>
                      <Badge
                        badgeContent={activeFilterCount}
                        invisible={activeFilterCount === 0}
                        sx={{
                          '& .MuiBadge-badge': {
                            minWidth: 16,
                            height: 16,
                            px: 0.375,
                            right: -3,
                            top: 1,
                            border: `1px solid ${tableChrome.surface}`,
                            borderRadius: '8px',
                            backgroundColor: tableChrome.accent,
                            color: tableChrome.accentContrast,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                          },
                        }}
                      >
                        <FilterList />
                      </Badge>
                    </Box>
                  }
                  onClick={openFilters}
                  sx={toolbarButtonSx}
                >
                  Filters
                </Button>
              </Box>
            </Box>
          </Box>

          <Box
            data-testid="fast-start-jobs-table-header"
            sx={{
              display: 'grid',
              gridTemplateColumns: `minmax(0, 1fr) ${scrollbarGutterWidth}px`,
              flexShrink: 0,
              minWidth: JOB_TABLE_MIN_WIDTH,
            }}
          >
            <TableContainer sx={{ minWidth: 0, overflow: 'hidden' }}>
              <Table
                aria-label="Fast start jobs column headers"
                sx={{
                  tableLayout: 'fixed',
                  width: '100%',
                }}
              >
                <FastStartTableColumnGroup />
                <FastStartJobTableHead orderBy={orderBy} orderDirection={orderDirection} handleSort={handleSort} />
              </Table>
            </TableContainer>
            <Box
              aria-hidden="true"
              data-testid="fast-start-jobs-table-header-gutter"
              sx={{
                boxSizing: 'border-box',
                backgroundColor: tableChrome.header,
                borderTop: `1px solid ${tableChrome.border}`,
                borderBottom: `1px solid ${tableChrome.border}`,
              }}
            />
          </Box>

          <TableContainer
            ref={tableScrollRef}
            data-testid="fast-start-jobs-table-scroll"
            style={{ overflowY: 'scroll', scrollbarGutter: 'stable' }}
            sx={{
              flex: '1 1 auto',
              minHeight: 0,
              minWidth: JOB_TABLE_MIN_WIDTH,
              overflowX: 'hidden',
              scrollbarColor: `${tableChrome.border} ${tableChrome.header}`,
              '&::-webkit-scrollbar': {
                width: JOB_TABLE_SCROLLBAR_WIDTH,
                backgroundColor: tableChrome.surface,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: tableChrome.header,
              },
              '&::-webkit-scrollbar-thumb': {
                minHeight: 32,
                border: `2px solid ${tableChrome.header}`,
                borderRadius: 6,
                backgroundColor: tableChrome.border,
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: alpha(tableChrome.text, 0.55),
              },
            }}
          >
            <Table
              ref={bodyTableRef}
              aria-label="Fast start jobs rows"
              sx={{
                tableLayout: 'fixed',
                width: '100%',
                height: !isLoading && delayPassed && jobs.length === 0 ? '100%' : 'auto',
                '& > .MuiTableBody-root > .MuiTableRow-root > .MuiTableCell-root:not(:last-child)': {
                  borderRight: '1px solid',
                  borderRightColor: 'divider',
                },
              }}
            >
              <FastStartTableColumnGroup />
              <TableBody>
                {isLoading || (!delayPassed && jobs.length === 0) ? (
                  [...Array(rowsPerPage)].map((_, index) => {
                    const isEven = index % 2 === 0;
                    const backgroundColor =
                      theme.palette.mode === 'light'
                        ? isEven
                          ? '#f0f0f0'
                          : theme.palette.background.default
                        : isEven
                          ? '#2d2d2d'
                          : theme.palette.background.default;

                    return (
                      <TableRow key={index} sx={{ backgroundColor, height: JOB_TABLE_ROW_HEIGHT }}>
                        {[...Array(5)].map((_, cellIndex) => (
                          <TableCell key={cellIndex} sx={{ overflow: 'hidden', py: 0.5 }}>
                            <Skeleton variant="text" height={24} />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : jobs.length === 0 ? (
                  <TableRow sx={{ height: '100%' }}>
                    <TableCell
                      colSpan={5}
                      sx={{
                        borderBottom: 'none',
                        p: 0,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      <Box
                        data-testid="fast-start-jobs-empty-state"
                        sx={{
                          display: 'flex',
                          height: '100%',
                          minHeight: 160,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: 0.5,
                          px: 2,
                        }}
                      >
                        <Typography variant="h6" color={theme.palette.text.primary}>
                          {emptyStateHeading}
                        </Typography>
                        <Typography variant="body2" color={theme.palette.text.secondary}>
                          {emptyStateMessage}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job, index) => (
                    <FastStartRow key={job.id} index={index} job={job} onOpenDetails={() => openJobDetails(job.id)} />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box
          data-testid="fast-start-jobs-pagination-footer"
          sx={{
            display: 'grid',
            gridTemplateAreas: {
              xs: '"rows summary" "pages pages"',
              lg: '"rows pages summary"',
            },
            gridTemplateColumns: {
              xs: 'auto minmax(0, 1fr)',
              lg: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            },
            alignItems: 'center',
            columnGap: 2,
            rowGap: 1,
            flexShrink: 0,
            minHeight: JOB_TABLE_CHROME_ROW_MIN_HEIGHT,
            px: 1,
            py: 0.5,
            backgroundColor: tableChrome.surface,
            color: toolbarTextColor,
            borderTop: `1px solid ${tableChrome.border}`,
            borderBottom: `1px solid ${tableChrome.border}`,
          }}
        >
          <Box
            data-testid="rows-per-page-controls"
            sx={{
              gridArea: 'rows',
              display: 'flex',
              alignItems: 'center',
              justifySelf: 'start',
              gap: 2,
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
            }}
          >
            <Typography component="span" variant="body2" sx={{ color: toolbarTextColor }}>
              Rows per page
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={rowsPerPage}
              aria-label="Rows per page"
              onChange={(_event: React.MouseEvent<HTMLElement>, newRowsPerPage: JobRowsPerPage | null) => {
                if (newRowsPerPage === null || newRowsPerPage === rowsPerPage) {
                  return;
                }

                handleRowsPerPageButtonChange(newRowsPerPage);
              }}
              sx={{
                height: JOB_TABLE_CHROME_CONTROL_HEIGHT,
                '& .MuiToggleButton-root': {
                  height: JOB_TABLE_CHROME_CONTROL_HEIGHT,
                  width: JOB_TABLE_FOOTER_CONTROL_WIDTH,
                  minWidth: JOB_TABLE_FOOTER_CONTROL_WIDTH,
                  px: 0.5,
                  borderColor: tableChrome.border,
                  color: toolbarTextColor,
                  '&.Mui-selected': { zIndex: 1 },
                  '&:hover': {
                    borderColor: tableChrome.border,
                    backgroundColor: tableChrome.hover,
                  },
                },
              }}
            >
              {JOB_ROWS_PER_PAGE_OPTIONS.map((option) => (
                <ToggleButton
                  key={option}
                  value={option}
                  aria-label={`${option} rows per page`}
                  style={{
                    borderRadius: '0px',
                    ...(option === rowsPerPage ? selectedFooterControlStyle : {}),
                  }}
                >
                  {option}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box data-testid="fast-start-jobs-page-selector" sx={{ gridArea: 'pages', justifySelf: 'center' }}>
            <Pagination
              aria-label="Fast start jobs pages"
              count={maxPageIndex + 1}
              page={boundedPageForDisplay + 1}
              boundaryCount={1}
              siblingCount={1}
              disabled={isLoading || totalRows === 0}
              onChange={(_event: React.ChangeEvent<unknown>, pageNumber: number) => {
                const newPage = pageNumber - 1;
                if (!Number.isInteger(newPage) || newPage < 0) {
                  return;
                }

                handlePageChange(Math.min(newPage, maxPageIndex));
              }}
              variant="outlined"
              renderItem={(item) => (
                <PaginationItem
                  {...item}
                  style={{
                    borderRadius: '0px',
                    ...(item.selected ? selectedFooterControlStyle : {}),
                  }}
                />
              )}
              sx={{
                '& .MuiPagination-ul': {
                  flexWrap: 'nowrap',
                  justifyContent: 'center',
                },
                '& .MuiPaginationItem-root': {
                  width: JOB_TABLE_FOOTER_CONTROL_WIDTH,
                  height: JOB_TABLE_CHROME_CONTROL_HEIGHT,
                  minWidth: JOB_TABLE_FOOTER_CONTROL_WIDTH,
                  px: 0.5,
                  m: 0.125,
                  color: toolbarTextColor,
                  borderColor: tableChrome.border,
                  '&:hover': {
                    borderColor: tableChrome.border,
                    backgroundColor: tableChrome.hover,
                  },
                },
                '& .MuiPaginationItem-root.Mui-disabled': {
                  color: alpha(toolbarTextColor, 0.42),
                  borderColor: alpha(tableChrome.border, 0.6),
                },
              }}
            />
          </Box>
          <Typography
            data-testid="fast-start-jobs-displayed-rows"
            component="p"
            variant="body2"
            sx={{ gridArea: 'summary', justifySelf: 'end', m: 0, whiteSpace: 'nowrap' }}
          >
            {displayedRowsLabel}
          </Typography>
        </Box>

        <FastStartJobDetailsModal
          open={selectedJobId !== null}
          job={detailJob}
          loading={detailLoading}
          error={detailError}
          onRetry={() => setDetailReloadToken((token) => token + 1)}
          onClose={closeJobDetails}
        />
      </Paper>
    </Box>
  );
};

export default FastStartJobTable;
