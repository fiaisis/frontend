import {
  CheckBox,
  Download,
  FilterList,
  IndeterminateCheckBox,
  CheckBoxOutlineBlank,
  Close,
  Replay,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useState, useRef } from 'react';

import {
  getJobTableChromeColors,
  JOB_ROWS_PER_PAGE_OPTIONS,
  JOB_TABLE_CHROME_CONTROL_HEIGHT,
  JOB_TABLE_CHROME_ROW_MIN_HEIGHT,
  JOB_TABLE_MIN_WIDTH,
  JOB_TABLE_ROW_HEIGHT,
  JOB_TABLE_SCROLLBAR_WIDTH,
  JobRowsPerPage,
} from './constants';
import JobTableHead from './JobTableHead';
import Row from './Row';
import { fiaApi } from '../../lib/api';
import { useFetchJobs, useFetchTotalCount } from '../../lib/hooks';
import { parseJobOutputs } from '../../lib/hooks';
import { Job, JobQueryFilters, MantidVersionMap } from '../../lib/types';

const formatDisplayedRows = ({ from, to, count }: { from: number; to: number; count: number }): string => {
  const total = count === -1 ? `more than ${to}` : count.toString();
  return `Showing ${from}-${to} of ${total} reductions`;
};

const JOB_TABLE_COLUMN_WIDTHS = ['14%', '12%', '12%', '12%', '12%', '12%', '22%', '4%'] as const;

const JOB_FILTER_LABELS: Record<keyof JobQueryFilters, string> = {
  experiment_number_in: 'Experiment',
  experiment_number_after: 'Experiment after',
  experiment_number_before: 'Experiment before',
  title: 'Title',
  job_state_in: 'State',
  filename: 'Filename',
  instrument_in: 'Instrument',
  job_start_before: 'Job start before',
  job_start_after: 'Job start after',
  job_end_before: 'Job end before',
  job_end_after: 'Job end after',
  run_start_before: 'Run start before',
  run_start_after: 'Run start after',
  run_end_before: 'Run end before',
  run_end_after: 'Run end after',
};

const getActiveFilterLabels = (filters: JobQueryFilters): Array<{ key: keyof JobQueryFilters; label: string }> =>
  (Object.keys(JOB_FILTER_LABELS) as Array<keyof JobQueryFilters>).flatMap((key) => {
    const value = filters[key];
    const isActive = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';

    if (!isActive) {
      return [];
    }

    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    return [{ key, label: `${JOB_FILTER_LABELS[key]}: ${displayValue}` }];
  });

const JobTableColumnGroup = (): React.ReactElement => (
  <colgroup>
    {JOB_TABLE_COLUMN_WIDTHS.map((width, index) => (
      <col key={index} style={{ width }} />
    ))}
  </colgroup>
);

const JobTable: React.FC<{
  selectedInstrument: string;
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
  configControl?: React.ReactNode;
}> = ({
  selectedInstrument,
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
  configControl,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const previousRowsPerPage = useRef<JobRowsPerPage>(rowsPerPage);

  // Cache the last filter JSON so we only reset selection when the filter set
  // truly changes
  const filtersStringRef = useRef<string>(JSON.stringify(filters));

  const offset = currentPage * rowsPerPage;

  const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true&filters=${JSON.stringify(filters)}&as_user=${asUser}`;
  const countQuery = `filters=${JSON.stringify(filters)}`;
  const queryPath = selectedInstrument === 'ALL' ? '/jobs' : `/instrument/${selectedInstrument}/jobs`;
  const countQueryPath = selectedInstrument === 'ALL' ? '/jobs/count' : `/instrument/${selectedInstrument}/jobs/count`;
  const fetchJobs = useFetchJobs(queryPath, query, setJobs);
  const fetchTotalCount = useFetchTotalCount(countQueryPath, countQuery, setTotalRows);
  const [isBulkResubmitting, setIsBulkResubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [bulkResubmitSuccessful, setBulkResubmitSuccessful] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const totalDownloadableFiles = jobs
    .filter((job) => selectedJobIds.includes(job.id))
    .reduce((acc, job) => acc + parseJobOutputs(job.outputs).length, 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [delayPassed, setDelayPassed] = useState(false);
  const [downloadErrorOpen, setDownloadErrorOpen] = useState(false);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState('');
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [mantidVersions, setMantidVersions] = useState<MantidVersionMap>({});

  useEffect(() => {
    // Keep async response from touching state once the component unmounts.
    let isMounted = true;

    const fetchMantidVersions = async (): Promise<void> => {
      try {
        const { data } = await fiaApi.get('/jobs/runners');

        // Bail out on malformed responses to avoid runtime errors when the map is used.
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.error('Unexpected Mantid version response format:', data);
          if (isMounted) setMantidVersions({});
          return;
        }

        if (isMounted) setMantidVersions(data as MantidVersionMap);
      } catch (error) {
        console.error('Failed to fetch Mantid versions:', error);
      }
    };

    fetchMantidVersions();

    return () => {
      isMounted = false;
    };
  }, []);

  const [hasLoadedCounts, setHasLoadedCounts] = useState(false);

  // Highest index allowed for the pagination control
  const maxPageIndex = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
  const boundedPageForDisplay = Math.min(currentPage, maxPageIndex);
  const displayedRowsLabel = formatDisplayedRows({
    from: totalRows === 0 ? 0 : boundedPageForDisplay * rowsPerPage + 1,
    to: totalRows === 0 ? 0 : Math.min((boundedPageForDisplay + 1) * rowsPerPage, totalRows),
    count: totalRows,
  });

  useEffect(() => {
    previousRowsPerPage.current = rowsPerPage;
  }, [rowsPerPage]);

  // Ensure the current page stays within the valid range and is an integer
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
    const nextFiltersString = JSON.stringify(filters);
    if (filtersStringRef.current !== nextFiltersString) {
      filtersStringRef.current = nextFiltersString;
      setSelectedJobIds([]);
    }
  }, [filters]);

  useEffect(() => {
    if (!Number.isInteger(currentPage) || currentPage < 0) {
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
    fetchAll();
  }, [currentPage, fetchJobs, fetchTotalCount, maxPageIndex]);

  useEffect(() => {
    // Clear selections when the View as user toggle changes
    // Clear selections when the page changes
    // Clear selections when the instrument changes
    setSelectedJobIds([]);
  }, [asUser, currentPage, selectedInstrument]);

  useEffect(() => {
    let timeoutId: number;

    if (!isLoading && jobs.length === 0) {
      timeoutId = window.setTimeout(() => {
        setDelayPassed(true);
      }, 500);
    } else {
      setDelayPassed(false);
    }

    return () => clearTimeout(timeoutId);
  }, [isLoading, jobs]);

  useEffect(() => {
    // Clear selections when the View as user toggle changes
    setSelectedJobIds([]);
  }, [asUser]);

  useEffect(() => {
    // Clear selections when the page changes
    setSelectedJobIds([]);
  }, [currentPage]);

  const refreshJobs = (): void => {
    void Promise.resolve(fetchJobs());
    void Promise.resolve(fetchTotalCount);
  };
  const resubmitJob = async (job: Job): Promise<void> => {
    await fiaApi.post(`/job/${job.id}/resubmit`);
  };

  const toggleJobSelection = (jobId: number): void => {
    setSelectedJobIds((prevSelected) =>
      prevSelected.includes(jobId) ? prevSelected.filter((id) => id !== jobId) : [...prevSelected, jobId]
    );
  };

  const handleBulkResubmit = async (): Promise<void> => {
    setIsBulkResubmitting(true);
    let allSuccessful = true;

    const jobsToResubmit = jobs.filter((job) => selectedJobIds.includes(job.id));

    for (const job of jobsToResubmit) {
      console.log(`Resubmitting job ${job.id}`);
      try {
        await resubmitJob(job);
      } catch (error) {
        console.error(`Failed to resubmit job ${job.id}`, error);
        allSuccessful = false;
      }
    }

    setBulkResubmitSuccessful(allSuccessful);
    setSnackbarOpen(true);
    refreshJobs();
    setIsBulkResubmitting(false);
    setSelectedJobIds([]);
  };

  const handleBulkDownload = async (): Promise<void> => {
    const selectedJobs = jobs.filter((job) => selectedJobIds.includes(job.id));
    const jobFiles: Record<number, string[]> = {};

    for (const job of selectedJobs) {
      const outputs = parseJobOutputs(job.outputs);
      if (outputs.length > 0) {
        jobFiles[job.id] = outputs;
      }
    }

    setDownloadingBulk(true);
    try {
      const response = await fiaApi.post('/job/download-zip', jobFiles, {
        responseType: 'blob',
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        setDownloadErrorMessage(`Bulk download failed — status ${response.status}`);
        setDownloadErrorOpen(true);
        return;
      }

      const blob = new Blob([response.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'reduction_files.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download ZIP file', err);
      setDownloadErrorMessage('An unexpected error occurred during bulk download.');
      setDownloadErrorOpen(true);
    } finally {
      setDownloadingBulk(false);
    }
  };

  const toggleSelectAll = (): void => {
    const allIds = jobs.map((job) => job.id);
    const allSelected = allIds.every((id) => selectedJobIds.includes(id));

    if (allSelected) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(allIds);
    }
  };

  const handleRowsPerPageButtonChange = (newRowsPerPage: JobRowsPerPage): void => {
    // Clear job selections if reducing the rows per page value.
    // Avoids scenarios where selected jobs are not visible anymore because they're on a later page.
    if (newRowsPerPage < previousRowsPerPage.current) {
      setSelectedJobIds([]);
    }

    // Calculate what page to show: prevents the scenario where the offset is beyond the actual number of jobs.
    const newPage = Math.floor((currentPage * rowsPerPage) / newRowsPerPage);
    handleRowsPerPageChange(newRowsPerPage, newPage);
  };

  const theme = useTheme();
  const tableChrome = getJobTableChromeColors(theme.palette.mode);
  const toolbarTextColor = tableChrome.text;
  const toolbarButtonSx = {
    height: JOB_TABLE_CHROME_CONTROL_HEIGHT,
    borderColor: tableChrome.border,
    color: toolbarTextColor,
    '&:hover': {
      borderColor: tableChrome.border,
      backgroundColor: tableChrome.hover,
    },
    '&.Mui-disabled': {
      borderColor: alpha(tableChrome.border, 0.6),
      color: alpha(toolbarTextColor, 0.42),
    },
  };
  const toolbarContainedButtonSx = {
    height: JOB_TABLE_CHROME_CONTROL_HEIGHT,
    border: `1px solid ${tableChrome.accent}`,
    backgroundColor: tableChrome.accent,
    color: tableChrome.accentContrast,
    '&:hover': {
      borderColor: tableChrome.accent,
      backgroundColor: alpha(tableChrome.accent, 0.84),
    },
    '&.Mui-disabled': {
      borderColor: alpha(tableChrome.border, 0.6),
      backgroundColor: alpha(tableChrome.text, 0.12),
      color: alpha(tableChrome.text, 0.42),
    },
  };
  const allCurrentJobsSelected = jobs.length > 0 && selectedJobIds.length === jobs.length;
  const someCurrentJobsSelected = selectedJobIds.length > 0 && selectedJobIds.length < jobs.length;
  const activeFilterLabels = getActiveFilterLabels(filters);
  const emptyStateMessage = filtersApplied
    ? 'Try adjusting or clearing your filters.'
    : selectedInstrument === 'ALL'
      ? 'Reductions will appear here once they are available.'
      : `Reductions for ${selectedInstrument} will appear here once they are available.`;

  const removeFilter = (key: keyof JobQueryFilters): void => {
    const nextFilters = { ...filters };
    delete nextFilters[key];
    handleFiltersChange(nextFilters);
  };

  return (
    <>
      <Snackbar
        open={downloadErrorOpen}
        autoHideDuration={5000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') {
            setDownloadErrorOpen(false);
          }
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          sx={{
            padding: '10px 14px',
            fontSize: '1rem',
            width: '100%',
            maxWidth: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderRadius: '8px',
            fontWeight: 'bold',
          }}
          severity="error"
        >
          {downloadErrorMessage}
        </Alert>
      </Snackbar>

      {isLoading && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: 1201,
          }}
        />
      )}
      <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={5000}
          onClose={(event, reason) => {
            if (reason !== 'clickaway') {
              setSnackbarOpen(false);
            }
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            sx={{
              padding: '10px 14px',
              fontSize: '1rem',
              width: '100%',
              maxWidth: '600px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid',
              borderRadius: '8px',
              fontWeight: 'bold',
            }}
            severity={bulkResubmitSuccessful ? 'success' : 'error'}
          >
            {bulkResubmitSuccessful
              ? `Resubmissions started successfully for all selected reductions`
              : `Some reductions could not be resubmitted — please check the console for details`}
          </Alert>
        </Snackbar>

        <Paper
          square
          elevation={0}
          data-testid="reduction-history-table-paper"
          style={{ borderRadius: '0px' }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            backgroundColor: tableChrome.surface,
          }}
        >
          <Box
            data-testid="reduction-history-table-container"
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
              data-testid="reduction-history-table-toolbar"
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
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
                px: 1,
                py: 0.5,
                backgroundColor: tableChrome.surface,
                color: toolbarTextColor,
                borderTop: `1px solid ${tableChrome.border}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                <Button
                  className="tour-red-his-select-all"
                  variant={allCurrentJobsSelected ? 'contained' : 'outlined'}
                  size="small"
                  onClick={toggleSelectAll}
                  disabled={jobs.length === 0}
                  sx={{ width: 140, ...(allCurrentJobsSelected ? toolbarContainedButtonSx : toolbarButtonSx) }}
                  startIcon={
                    allCurrentJobsSelected ? (
                      <CheckBox />
                    ) : someCurrentJobsSelected ? (
                      <IndeterminateCheckBox />
                    ) : (
                      <CheckBoxOutlineBlank />
                    )
                  }
                >
                  {allCurrentJobsSelected ? 'Deselect all' : 'Select all'}
                </Button>

                {selectedJobIds.length > 0 && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={isBulkResubmitting}
                      onClick={handleBulkResubmit}
                      startIcon={!isBulkResubmitting && <Replay />}
                      sx={{ minWidth: 154, whiteSpace: 'nowrap', ...toolbarContainedButtonSx }}
                    >
                      {isBulkResubmitting ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        `Resubmit (${selectedJobIds.length})`
                      )}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleBulkDownload}
                      sx={{ width: 200, ...toolbarContainedButtonSx }}
                      startIcon={!downloadingBulk && <Download />}
                      disabled={totalDownloadableFiles === 0 || downloadingBulk}
                    >
                      {downloadingBulk ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        `Download all (${totalDownloadableFiles})`
                      )}
                    </Button>
                  </>
                )}
              </Box>

              <Box
                className="tour-job-table-adv-filters"
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
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}
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
                          maxWidth: 260,
                          height: 28,
                          color: tableChrome.accent,
                          borderColor: alpha(tableChrome.accent, 0.5),
                          backgroundColor: alpha(tableChrome.accent, 0.08),
                          '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                          '& .MuiChip-deleteIcon': {
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
                          height: 28,
                          color: tableChrome.accent,
                          borderColor: alpha(tableChrome.accent, 0.5),
                          backgroundColor: alpha(tableChrome.accent, 0.08),
                          '& .MuiChip-deleteIcon': {
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
                <Button
                  variant={filtersApplied ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<FilterList />}
                  onClick={openFilters}
                  sx={filtersApplied ? toolbarContainedButtonSx : toolbarButtonSx}
                >
                  Filters
                </Button>
                {configControl}
              </Box>
            </Box>

            <Box
              data-testid="reduction-history-table-header"
              sx={{
                display: 'grid',
                gridTemplateColumns: `minmax(0, 1fr) ${JOB_TABLE_SCROLLBAR_WIDTH}px`,
                flexShrink: 0,
                minWidth: JOB_TABLE_MIN_WIDTH,
              }}
            >
              <TableContainer sx={{ minWidth: 0, overflow: 'hidden' }}>
                <Table
                  aria-label="Reduction history column headers"
                  sx={{
                    tableLayout: 'fixed',
                    width: '100%',
                  }}
                >
                  <JobTableColumnGroup />
                  <JobTableHead
                    orderBy={orderBy}
                    orderDirection={orderDirection}
                    handleSort={handleSort}
                    allSelected={jobs.length > 0 && selectedJobIds.length === jobs.length}
                    someSelected={selectedJobIds.length > 0 && selectedJobIds.length < jobs.length}
                    toggleSelectAll={() => {
                      if (selectedJobIds.length === jobs.length) {
                        setSelectedJobIds([]);
                      } else {
                        setSelectedJobIds(jobs.map((job) => job.id));
                      }
                    }}
                  />
                </Table>
              </TableContainer>
              <Box
                aria-hidden="true"
                data-testid="reduction-history-table-header-gutter"
                sx={{
                  boxSizing: 'border-box',
                  backgroundColor: tableChrome.header,
                  borderTop: `1px solid ${tableChrome.border}`,
                  borderBottom: `1px solid ${tableChrome.border}`,
                }}
              />
            </Box>

            <TableContainer
              data-testid="reduction-history-table-scroll"
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
                aria-label="Reduction history rows"
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
                <JobTableColumnGroup />
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
                          {[...Array(6)].map((_, cellIndex) => (
                            <TableCell key={cellIndex} sx={{ overflow: 'hidden', py: 0.5 }}>
                              <Skeleton variant="text" height={24} />
                            </TableCell>
                          ))}
                          <TableCell colSpan={2} sx={{ overflow: 'hidden', py: 0.5 }}>
                            <Skeleton variant="text" height={24} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : jobs.length === 0 ? (
                    <TableRow sx={{ height: '100%' }}>
                      <TableCell
                        colSpan={8}
                        sx={{
                          borderBottom: 'none',
                          p: 0,
                          textAlign: 'center',
                          verticalAlign: 'middle',
                        }}
                      >
                        <Box
                          data-testid="reduction-history-empty-state"
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
                            No reductions found
                          </Typography>
                          <Typography variant="body2" color={theme.palette.text.secondary}>
                            {emptyStateMessage}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job, index) => (
                      <Row
                        key={index}
                        index={index}
                        job={job}
                        resubmitJob={resubmitJob}
                        refreshJobs={refreshJobs}
                        isSelected={selectedJobIds.includes(job.id)}
                        toggleSelection={toggleJobSelection}
                        mantidVersions={mantidVersions}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          <Box
            data-testid="reduction-history-pagination-footer"
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
                    minWidth: 40,
                    px: 1.5,
                    borderColor: tableChrome.border,
                    color: toolbarTextColor,
                    '&:hover': {
                      borderColor: tableChrome.border,
                      backgroundColor: tableChrome.hover,
                    },
                  },
                  '& .MuiToggleButton-root.Mui-selected': {
                    backgroundColor: tableChrome.accent,
                    color: tableChrome.accentContrast,
                    '&:hover': {
                      backgroundColor: alpha(tableChrome.accent, 0.84),
                    },
                  },
                }}
              >
                {JOB_ROWS_PER_PAGE_OPTIONS.map((option) => (
                  <ToggleButton key={option} value={option} aria-label={`${option} rows per page`}>
                    {option}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Box data-testid="reduction-history-page-selector" sx={{ gridArea: 'pages', justifySelf: 'center' }}>
              <Pagination
                aria-label="Reduction history pages"
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
                shape="rounded"
                variant="outlined"
                sx={{
                  '& .MuiPagination-ul': {
                    flexWrap: 'nowrap',
                    justifyContent: 'center',
                  },
                  '& .MuiPaginationItem-root': {
                    width: JOB_TABLE_CHROME_CONTROL_HEIGHT,
                    height: JOB_TABLE_CHROME_CONTROL_HEIGHT,
                    minWidth: JOB_TABLE_CHROME_CONTROL_HEIGHT,
                    m: 0.125,
                    color: toolbarTextColor,
                    borderColor: tableChrome.border,
                    '&:hover': {
                      borderColor: tableChrome.border,
                      backgroundColor: tableChrome.hover,
                    },
                  },
                  '& .MuiPaginationItem-root.Mui-selected': {
                    backgroundColor: tableChrome.accent,
                    color: tableChrome.accentContrast,
                    '&:hover': {
                      backgroundColor: alpha(tableChrome.accent, 0.84),
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
              data-testid="reduction-history-displayed-rows"
              component="p"
              variant="body2"
              sx={{ gridArea: 'summary', justifySelf: 'end', m: 0, whiteSpace: 'nowrap' }}
            >
              {displayedRowsLabel}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
};

export default JobTable;
