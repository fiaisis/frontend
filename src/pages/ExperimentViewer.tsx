import '@h5web/lib/styles.css';
import { Alert, Box, CircularProgress, Link as MuiLink, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useHistory, useLocation } from 'react-router-dom';

import FileTree from '../components/experimentViewer/FileTree';
import PlotViewer from '../components/experimentViewer/Graph';
import JobSearch from '../components/experimentViewer/JobSearch';
import Viewer2D from '../components/experimentViewer/Viewer2D';
import ViewerTabs from '../components/experimentViewer/ViewerTabs';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../components/jobs/constants';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { viewerColumnsSx, viewerContentSx, viewerSidebarSx } from '../components/viewer/layout';
import { fiaApi } from '../lib/api';
import { getExperimentViewerUrl } from '../lib/experimentViewerUrl';
import { parseJobOutputs } from '../lib/hooks';
import { instruments, isValidInstrument } from '../lib/instrumentData';
import { REDUCTION_SUPPORTED_INSTRUMENTS } from '../lib/instrumentSupport';
import { discoverFileStructure, fetchData1D, fetchErrorData, fetchFilePath } from '../lib/plottingServiceAPI';
import { DatasetInfo, FileConfig, Job, JobQueryFilters, LinePlotData, outputFilter } from '../lib/types';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';

import type { NumericType } from '@h5web/app';

type PlottedFile = Pick<
  FileConfig,
  'filename' | 'fullPath' | 'path' | 'errorPath' | 'selectedDatasetIs2D' | 'selection'
>;

const EXPERIMENT_VIEWER_PAGE_SIZE = 10;

const parseExperimentNumber = (experimentNumber: string | null): number | null => {
  if (!experimentNumber?.trim()) return null;
  const parsed = Number(experimentNumber);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const getCanonicalInstrumentName = (name: string | undefined): string | undefined =>
  instruments.find((instrument) => instrument.name.toUpperCase() === name?.toUpperCase())?.name;

const getJobOutputs = (job: Job): string[] =>
  parseJobOutputs(job.outputs.trim()).filter(
    (output) => typeof output === 'string' && outputFilter.some((extension) => output.endsWith(extension))
  );

const toTreeJob = (job: Job): Job => ({ ...job, outputs: getJobOutputs(job).join(', ') });

const ExperimentViewer: React.FC = (): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);
  const history = useHistory();
  const location = useLocation();
  const navigationKey = `${location.key ?? ''}:${location.pathname}${location.search}`;
  const query = new URLSearchParams(location.search);
  const instrumentName = query.get('instrument')?.trim() || undefined;
  const experimentNumber = query.get('experiment');
  const jobId = query.get('jobId');
  const requestedFile = query.get('file');
  const searchExperimentNumber = parseExperimentNumber(experimentNumber);
  const hasSelection = jobId !== null || requestedFile !== null;
  const invalidSelection =
    hasSelection &&
    (!instrumentName ||
      !isValidInstrument(instrumentName) ||
      searchExperimentNumber === null ||
      !jobId ||
      !/^[1-9]\d*$/.test(jobId) ||
      !Number.isSafeInteger(Number(jobId)) ||
      !requestedFile ||
      !outputFilter.some((extension) => requestedFile.endsWith(extension)));
  const hasInitialSelection = hasSelection && !invalidSelection;
  const { rootRef: viewerRootRef, availableHeight: viewerHeight } = useAvailablePluginHeight();
  // Input-file searches and output selection use different query parameters.
  const searchFilename = searchExperimentNumber === null ? query.get('filename')?.trim() || null : null;
  const hasExperimentNumber = experimentNumber !== null;
  const searchInstrument = instrumentName ?? null;
  const isSearchActive =
    query.get('search') !== 'false' &&
    (query.get('search') === 'true' || searchExperimentNumber !== null || Boolean(searchFilename));

  useEffect(() => {
    if (
      (instrumentName && !isValidInstrument(instrumentName)) ||
      (hasExperimentNumber && searchExperimentNumber === null)
    ) {
      window.location.replace('/404/');
    }
  }, [hasExperimentNumber, instrumentName, searchExperimentNumber]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [openedJob, setOpenedJob] = useState<Job>();
  const [pageFiles, setPageFiles] = useState<FileConfig[]>([]);
  const [openedFiles, setOpenedFiles] = useState<FileConfig[]>([]);
  const files = useMemo(
    () => [
      ...openedFiles,
      ...pageFiles.filter((file) => !openedFiles.some((opened) => opened.filename === file.filename)),
    ],
    [openedFiles, pageFiles]
  );
  const [dismissedSelectionKey, setDismissedSelectionKey] = useState<string>();
  const [initialPageJobs, setInitialPageJobs] = useState<{ key: string; jobs: Job[] }>();
  const [linePlotData, setLinePlotData] = useState<LinePlotData[]>([]);
  const plottedData = useRef(new Map<string, LinePlotData>());
  const [showErrors, setShowErrors] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingOpenedJob, setLoadingOpenedJob] = useState(false);
  const [loadingPlotData, setLoadingPlotData] = useState(false);
  const [loadingFileSelection, setLoadingFileSelection] = useState(false);
  const [initialSelection, setInitialSelection] = useState<{ jobId: number; filename: string }>();
  const filesRequestId = useRef(0);
  const pageRequestId = useRef(0);
  const filePaths = useRef(new Map<string, Promise<string>>());
  const [error, setError] = useState<string | null>(null);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [autoSelectPrimary, setAutoSelectPrimary] = useState(true);
  const [activeViewerTab, setActiveViewerTab] = useState<'1d' | '2d'>('1d');
  const [selected2DFile, setSelected2DFile] = useState<string | null>(null);
  const selected2DFilePath = files.find((file) => file.filename === selected2DFile)?.fullPath ?? null;
  const [pagination, setPagination] = useState({ key: navigationKey, page: 0 });
  const currentPage = pagination.key === navigationKey ? pagination.page : 0;
  const [totalJobs, setTotalJobs] = useState(0);

  // A navigation reapplies its linked output; paging clears all file selections.
  useEffect(() => {
    filesRequestId.current += 1;
    filePaths.current.clear();
    plottedData.current.clear();
    setDismissedSelectionKey(undefined);
    setOpenedJob(undefined);
    setOpenedFiles([]);
    setPageFiles([]);
    setJobs([]);
    setInitialPageJobs(undefined);
    setInitialSelection(undefined);
    setPagination({ key: navigationKey, page: 0 });
    setLinePlotData([]);
    setSelected2DFile(null);
    setTotalJobs(0);
    setLoadingOpenedJob(false);
    setLoadingFileSelection(false);
    setError(null);
    setJobsError(null);
    setSelectionError(invalidSelection ? 'The selected output link is invalid.' : null);
    if (hasInitialSelection) setActiveViewerTab('1d');

    return () => {
      filesRequestId.current += 1;
    };
  }, [navigationKey, invalidSelection, hasInitialSelection]);

  const getFilesForJobs = useCallback(async (sourceJobs: Job[], strictFilename?: string): Promise<FileConfig[]> => {
    const owners = new Map<string, Job>();
    sourceJobs.forEach((job) =>
      getJobOutputs(job).forEach((filename) => {
        if (!owners.has(filename)) owners.set(filename, job);
      })
    );
    return Promise.all(
      Array.from(owners, async ([filename, job]) => {
        let fullPath = filename;
        try {
          const key = JSON.stringify([job.run.instrument_name, job.run.experiment_number, filename]);
          let pendingPath = filePaths.current.get(key);
          if (!pendingPath) {
            pendingPath = fetchFilePath(filename, job.run.instrument_name, job.run.experiment_number);
            filePaths.current.set(key, pendingPath);
          }
          fullPath = await pendingPath;
        } catch (error) {
          if (filename === strictFilename) throw error;
          console.warn(`Failed to fetch path for ${filename}, using filename as fallback`, error);
        }
        return { filename, fullPath, enabled: false, selection: [], selectionInputMode: 'text' };
      })
    );
  }, []);

  // Dataset discovery must not restore selections after paging or navigation.
  const discoverDatasets = useCallback(
    async (file: FileConfig, selectPrimary: boolean, isOpenedFile: boolean): Promise<void> => {
      if (!file.fullPath || file.isDiscovered) return;
      const navigationId = filesRequestId.current;
      const pageId = pageRequestId.current;
      const isCurrent = (): boolean => navigationId === filesRequestId.current && pageId === pageRequestId.current;
      const setSourceFiles = isOpenedFile ? setOpenedFiles : setPageFiles;
      try {
        const structure = await discoverFileStructure(file.filename, file.fullPath);
        if (!isCurrent()) return;
        const discoveredDatasets: DatasetInfo[] = structure.datasets.map((dataset) => ({
          path: dataset.path,
          shape: dataset.shape,
          dtype: dataset.dtype as NumericType,
          errorPath: dataset.errorPath,
          is1D: dataset.is1D,
          is2D: dataset.is2D,
          isPrimary: dataset.isPrimary,
        }));
        if (discoveredDatasets.length === 0) setError(`No numeric datasets found in ${file.filename}.`);
        setSourceFiles((previous) => {
          if (!isCurrent()) return previous;
          return previous.map((current) => {
            if (current.filename !== file.filename || current.fullPath !== file.fullPath) return current;
            const updated = { ...current, discoveredDatasets, isDiscovered: true };
            const primary = discoveredDatasets.find((dataset) => dataset.isPrimary) ?? discoveredDatasets[0];
            return selectPrimary && !current.path && primary
              ? {
                  ...updated,
                  path: primary.path,
                  errorPath: primary.errorPath,
                  selectedDatasetIs2D: primary.is2D,
                  selection: [],
                }
              : updated;
          });
        });
      } catch (error) {
        if (!isCurrent()) return;
        console.error(`[H5Grove] Failed to discover datasets in ${file.filename}:`, error);
        setError(`Failed to load datasets for ${file.filename}.`);
        setSourceFiles((previous) => {
          if (!isCurrent()) return previous;
          return previous.map((current) =>
            current.filename === file.filename && current.fullPath === file.fullPath
              ? { ...current, isDiscovered: true }
              : current
          );
        });
      }
    },
    []
  );

  useEffect(() => {
    let isCurrent = true;
    pageRequestId.current += 1;
    setPageFiles([]);
    setOpenedJob(undefined);
    setOpenedFiles([]);
    setInitialSelection(undefined);
    setLoadingOpenedJob(false);
    setLoadingFileSelection(false);
    setJobs([]);
    setJobsError(null);
    setError(null);
    setSelected2DFile(null);
    if (currentPage !== 0) {
      setDismissedSelectionKey(navigationKey);
      setSelectionError(null);
    }

    const rememberInitialPage = (sourceJobs: Job[]): void => {
      setInitialPageJobs((previous) =>
        previous?.key === navigationKey ? previous : { key: navigationKey, jobs: sourceJobs }
      );
    };
    const loadPage = async (): Promise<void> => {
      if (!isSearchActive) {
        setLoadingJobs(false);
        return;
      }
      setLoadingJobs(true);
      try {
        const filters: JobQueryFilters = {
          job_state_in: ['SUCCESSFUL'],
          ...(searchInstrument ? { instrument_in: [searchInstrument] } : {}),
          ...(searchExperimentNumber !== null ? { experiment_number_in: [searchExperimentNumber] } : {}),
          ...(searchFilename ? { filename: searchFilename } : {}),
        };
        const count = await fiaApi.get<{ count: number }>('/jobs/count', {
          params: { filters: JSON.stringify(filters) },
        });
        if (!isCurrent) return;
        setTotalJobs(count.data.count);
        const maxPage = Math.max(0, Math.ceil(count.data.count / EXPERIMENT_VIEWER_PAGE_SIZE) - 1);
        if (currentPage > maxPage) {
          setPagination({ key: navigationKey, page: maxPage });
          return;
        }
        const page =
          count.data.count === 0
            ? []
            : (
                await fiaApi.get<Job[]>('/jobs', {
                  params: {
                    filters: JSON.stringify(filters),
                    include_run: 'true',
                    limit: EXPERIMENT_VIEWER_PAGE_SIZE,
                    offset: currentPage * EXPERIMENT_VIEWER_PAGE_SIZE,
                    order_by: 'run_start',
                    order_direction: 'desc',
                  },
                })
              ).data;
        if (!isCurrent) return;
        if (!searchInstrument && searchExperimentNumber !== null) {
          const instrument = page.find((job) => isValidInstrument(job.run.instrument_name))?.run.instrument_name;
          if (instrument) {
            history.replace(getExperimentViewerUrl({ instrument, experiment: searchExperimentNumber }));
            return;
          }
        }
        rememberInitialPage(page);
        setJobs(page.map(toTreeJob));
        const nextFiles = await getFilesForJobs(page);
        if (isCurrent) setPageFiles(nextFiles);
      } catch (error) {
        if (!isCurrent) return;
        console.error('Error loading jobs:', error);
        setJobsError('Failed to load jobs from server');
        // A failed list request must not prevent opening the explicitly requested job.
        rememberInitialPage([]);
      } finally {
        if (isCurrent) setLoadingJobs(false);
      }
    };
    void loadPage();
    return () => {
      isCurrent = false;
      pageRequestId.current += 1;
    };
  }, [
    navigationKey,
    currentPage,
    isSearchActive,
    searchInstrument,
    searchExperimentNumber,
    searchFilename,
    history,
    getFilesForJobs,
  ]);

  useEffect(() => {
    if (
      !hasInitialSelection ||
      !jobId ||
      !requestedFile ||
      initialPageJobs?.key !== navigationKey ||
      currentPage !== 0 ||
      dismissedSelectionKey === navigationKey
    )
      return;
    let isCurrent = true;
    const openOutput = async (): Promise<void> => {
      setLoadingOpenedJob(true);
      try {
        const job =
          initialPageJobs.jobs.find((candidate) => candidate.id === Number(jobId)) ??
          (await fiaApi.get<Job>(`/job/${jobId}`)).data;
        if (!isCurrent) return;
        if (
          job.id !== Number(jobId) ||
          job.run.instrument_name.toUpperCase() !== instrumentName?.toUpperCase() ||
          job.run.experiment_number !== searchExperimentNumber
        ) {
          setSelectionError('The selected reduction does not belong to this experiment.');
          return;
        }
        const outputs = getJobOutputs(job);
        setOpenedJob(toTreeJob(job));
        setLoadingOpenedJob(false);
        const hasOutput = outputs.includes(requestedFile);
        if (!hasOutput) setSelectionError('The selected output is no longer available.');
        if (hasOutput) setLoadingFileSelection(true);
        const nextFiles = await getFilesForJobs([job], hasOutput ? requestedFile : undefined);
        if (!isCurrent) return;
        setOpenedFiles(nextFiles.map((file) => ({ ...file, enabled: hasOutput && file.filename === requestedFile })));
        if (hasOutput) {
          setInitialSelection({ jobId: job.id, filename: requestedFile });
          const file = nextFiles.find((candidate) => candidate.filename === requestedFile)!;
          await discoverDatasets(file, true, true);
        }
      } catch (error) {
        if (!isCurrent) return;
        console.error('Error opening reduction output:', error);
        setSelectionError('The selected output could not be loaded.');
      } finally {
        if (isCurrent) {
          setLoadingOpenedJob(false);
          setLoadingFileSelection(false);
        }
      }
    };
    void openOutput();
    return () => {
      isCurrent = false;
    };
  }, [
    initialPageJobs,
    navigationKey,
    currentPage,
    dismissedSelectionKey,
    hasInitialSelection,
    jobId,
    requestedFile,
    instrumentName,
    searchExperimentNumber,
    getFilesForJobs,
    discoverDatasets,
  ]);

  const handleInstrumentChange = (instrument: string): void => {
    const nextInstrument = instrument === 'ALL' ? null : instrument;
    history.push(
      getExperimentViewerUrl({
        instrument: nextInstrument,
        experiment: nextInstrument ? searchExperimentNumber : null,
        filename: nextInstrument ? searchFilename : null,
        search: nextInstrument && (searchExperimentNumber !== null || searchFilename) ? false : undefined,
      })
    );
  };

  const handleJobSearch = (experimentNumber: number | null, filename: string | null): void => {
    history.push(
      getExperimentViewerUrl({
        instrument: searchInstrument,
        experiment: experimentNumber,
        filename,
        search: experimentNumber === null && filename === null ? true : undefined,
      })
    );
  };

  const handlePageChange = (nextPage: number): void => {
    if (!Number.isInteger(nextPage) || nextPage < 0) return;
    const maxPage = Math.max(0, Math.ceil(totalJobs / EXPERIMENT_VIEWER_PAGE_SIZE) - 1);
    setPagination({ key: navigationKey, page: Math.min(nextPage, maxPage) });
  };

  const updateFile = (index: number, update: (file: FileConfig) => FileConfig): void => {
    const file = files[index];
    const setSourceFiles = openedFiles.includes(file) ? setOpenedFiles : setPageFiles;
    setSourceFiles((previous) =>
      previous.map((current) =>
        current.filename === file.filename && current.fullPath === file.fullPath ? update(current) : current
      )
    );
  };

  // Handle file toggle
  const handleFileToggle = async (index: number): Promise<void> => {
    const file = files[index];
    const willBeEnabled = !file.enabled;

    // Update enabled state
    updateFile(index, (current) => ({ ...current, enabled: !current.enabled }));

    // If enabling and not yet discovered, discover datasets
    if (willBeEnabled && !file.isDiscovered) {
      await discoverDatasets(file, autoSelectPrimary, openedFiles.includes(file));
    }
  };

  const handleDatasetChange = (index: number, datasetPath: string): void => {
    updateFile(index, (file) => {
      const dataset = file.discoveredDatasets?.find((candidate) => candidate.path === datasetPath);
      return dataset
        ? {
            ...file,
            path: dataset.path,
            errorPath: dataset.errorPath,
            selectedDatasetIs2D: dataset.is2D,
            selection: [],
          }
        : file;
    });
  };

  const handleSelectionChange = (index: number, selections: number[]): void => {
    updateFile(index, (file) => ({ ...file, selection: selections }));
  };

  // Only changes to plotted files should reload the graph, not an unrelated jobs page.
  const plotSelection = JSON.stringify(
    files
      .filter((file) => file.enabled && file.path)
      .map((file) => ({
        filename: file.filename,
        fullPath: file.fullPath,
        path: file.path,
        errorPath: file.errorPath,
        selectedDatasetIs2D: file.selectedDatasetIs2D,
        selection: file.selection,
      }))
  );

  useEffect(() => {
    let isCurrent = true;
    const navigationId = filesRequestId.current;
    const enabledFiles: PlottedFile[] = JSON.parse(plotSelection);
    const previousData = plottedData.current;
    const requests = enabledFiles.flatMap((file) => {
      const slices = file.selectedDatasetIs2D ? (file.selection?.length ? file.selection : [0]) : [undefined];
      return slices.map((slice) => ({
        file,
        slice,
        key: JSON.stringify([file.filename, file.fullPath, file.path, file.errorPath, slice, showErrors]),
      }));
    });

    if (requests.length === 0) {
      plottedData.current.clear();
      setLinePlotData([]);
      setLoadingPlotData(false);
      return;
    }

    const fetchAllData = async (): Promise<void> => {
      setLoadingPlotData(requests.some(({ key }) => !previousData.has(key)));
      setError(null);
      try {
        const results = await Promise.all(
          requests.map(async ({ file, slice, key }) => {
            const cached = previousData.get(key);
            if (cached) return { key, line: cached };
            const filepath = file.fullPath || file.filename;
            const data = await fetchData1D(filepath, file.path!, slice);
            let errors: number[] | undefined;
            if (showErrors && file.errorPath) {
              try {
                errors = await fetchErrorData(filepath, file.errorPath, slice);
              } catch (error) {
                console.warn(`Failed to fetch error data for ${file.filename}:`, error);
              }
            }
            return {
              key,
              line: {
                filename: slice === undefined ? file.filename : `${file.filename} [slice ${slice}]`,
                data,
                errors,
              },
            };
          })
        );
        if (isCurrent && navigationId === filesRequestId.current) {
          // Retain only the current curves, so returning to a deselected file still refreshes its data.
          plottedData.current = new Map(results.map(({ key, line }) => [key, line]));
          setLinePlotData(results.map(({ line }) => line));
        }
      } catch (error) {
        if (!isCurrent || navigationId !== filesRequestId.current) return;
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please check your backend connection.');
        setLinePlotData([]);
      } finally {
        if (isCurrent && navigationId === filesRequestId.current) setLoadingPlotData(false);
      }
    };
    void fetchAllData();
    return () => {
      isCurrent = false;
    };
  }, [plotSelection, showErrors]);

  const selectedInstrumentName = getCanonicalInstrumentName(instrumentName);
  const instrumentCrumb = selectedInstrumentName ? (
    searchExperimentNumber === null ? (
      <Typography className="breadcrumb-current" aria-current="page">
        {selectedInstrumentName}
      </Typography>
    ) : (
      <MuiLink component={RouterLink} to={getExperimentViewerUrl({ instrument: searchInstrument })}>
        {selectedInstrumentName}
      </MuiLink>
    )
  ) : undefined;
  const pageControls = (
    <InstrumentSelector
      selectedInstrument={searchInstrument || 'ALL'}
      handleInstrumentChange={handleInstrumentChange}
      variant="compact"
      allInstrumentsLabel="Clear filters"
      compactLabel="Browse instruments"
      support={{ page: 'experiment-viewer', instruments: REDUCTION_SUPPORTED_INSTRUMENTS }}
    />
  );
  const hasViewableFiles = files.length > 0;
  const isGenericViewer = !searchInstrument && !isSearchActive;
  const viewerError = selectionError || jobsError || error;

  return (
    <Box
      ref={viewerRootRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: viewerHeight,
        maxHeight: viewerHeight,
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
        color: viewerChrome.text,
        '& .MuiCircularProgress-root': { color: viewerChrome.accent },
      }}
    >
      <PageHeader
        breadcrumbs={<NavArrows linkCurrentPage={isSearchActive} trailingCrumb={instrumentCrumb} />}
        controls={pageControls}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          width: '100%',
          boxSizing: 'border-box',
          px: 2,
          pb: 2,
        }}
      >
        {/* Main content area */}
        <Box sx={viewerColumnsSx}>
          {/* Left panel - File tree */}
          <Box
            component="aside"
            aria-label="Experiment viewer files"
            sx={{
              ...viewerSidebarSx,
              height: { xs: 372, md: 'auto' },
              border: `1px solid ${viewerChrome.border}`,
              borderRadius: 0,
              backgroundColor: viewerChrome.surface,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <FileTree
              searchControls={
                <JobSearch
                  experimentNumber={searchExperimentNumber}
                  filename={searchFilename}
                  isSearchActive={isSearchActive}
                  onSearch={handleJobSearch}
                  onClear={() => history.push(getExperimentViewerUrl({ instrument: searchInstrument }))}
                />
              }
              viewTabs={
                <ViewerTabs
                  activeTab={isGenericViewer ? false : activeViewerTab}
                  onTabChange={setActiveViewerTab}
                  disabled={isGenericViewer || !hasViewableFiles}
                />
              }
              jobs={jobs}
              openedJob={openedJob}
              isLoadingOpenedJob={loadingOpenedJob}
              files={files}
              initialSelection={initialSelection}
              isLoading={loadingJobs}
              showEmptyState={isSearchActive}
              currentPage={currentPage}
              totalJobs={totalJobs}
              pageSize={EXPERIMENT_VIEWER_PAGE_SIZE}
              isPaginationDisabled={loadingJobs}
              onPageChange={handlePageChange}
              onFileToggle={handleFileToggle}
              onDatasetChange={handleDatasetChange}
              onSelectionChange={handleSelectionChange}
              autoSelectPrimary={autoSelectPrimary}
              onAutoSelectPrimaryChange={setAutoSelectPrimary}
              activeViewerTab={activeViewerTab}
              selected2DFile={selected2DFile}
              onSelect2DFile={setSelected2DFile}
            />
          </Box>

          {/* Right panel - Plot or 2D Viewer */}
          <Box
            sx={{
              ...viewerContentSx,
              position: 'relative',
              overflow: 'hidden',
              border: `1px solid ${viewerChrome.border}`,
              borderRadius: 0,
              backgroundColor: viewerChrome.surface,
            }}
          >
            {/* Loading indicator */}
            {(loadingPlotData || loadingFileSelection) && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  top: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(viewerChrome.surface, 0.85),
                  zIndex: 10,
                }}
              >
                <CircularProgress size={40} aria-label="Loading experiment data" />
              </Box>
            )}

            {/* Error message */}
            {viewerError && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                }}
              >
                <Alert
                  severity="error"
                  sx={{ borderRadius: 0 }}
                  onClose={() => {
                    setError(null);
                    setJobsError(null);
                    setSelectionError(null);
                  }}
                >
                  {viewerError}
                </Alert>
              </Box>
            )}

            {/* Conditional viewer rendering */}
            {activeViewerTab === '1d' ? (
              <PlotViewer
                linePlotData={linePlotData}
                showErrors={showErrors}
                onShowErrorsChange={setShowErrors}
                emptyTitle={isSearchActive ? undefined : 'Search by instrument, experiment number, or run/file'}
                emptyMessage={
                  isSearchActive
                    ? undefined
                    : 'Choose filters, then press Search. Leave the search empty to browse all reductions.'
                }
              />
            ) : (
              <Viewer2D filepath={selected2DFilePath} />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ExperimentViewer;
