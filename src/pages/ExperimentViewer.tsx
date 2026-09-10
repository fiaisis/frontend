import '@h5web/lib/styles.css';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Button, CircularProgress, TextField } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import FileTree from '../components/experimentViewer/FileTree';
import PlotViewer from '../components/experimentViewer/Graph';
import Viewer2D from '../components/experimentViewer/Viewer2D';
import ViewerTabs from '../components/experimentViewer/ViewerTabs';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../components/jobs/constants';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import NavArrows from '../components/navigation/NavArrows';
import PageHeader from '../components/navigation/PageHeader';
import { viewerColumnsSx, viewerContentSx, viewerSidebarSx } from '../components/viewer/layout';
import { fiaApi } from '../lib/api';
import { instruments, isValidInstrument } from '../lib/instrumentData';
import { REDUCTION_SUPPORTED_INSTRUMENTS } from '../lib/instrumentSupport';
import { discoverFileStructure, fetchData1D, fetchErrorData, fetchFilePath } from '../lib/plottingServiceAPI';
import { DatasetInfo, FileConfig, Job, JobQueryFilters, LinePlotData, outputFilter } from '../lib/types';
import { useAvailablePluginHeight } from '../lib/useAvailablePluginHeight';

import type { NumericType } from '@h5web/app';

interface RouteParams {
  instrumentName?: string;
  experimentNumber?: string;
  experimentOnlyNumber?: string;
  jobId?: string;
}

const EXPERIMENT_VIEWER_PAGE_SIZE = 10;

const parseExperimentNumber = (experimentNumber: string | undefined): number | null => {
  if (!experimentNumber) {
    return null;
  }

  const parsedExperimentNumber = Number(experimentNumber);
  return Number.isInteger(parsedExperimentNumber) && parsedExperimentNumber >= 0 ? parsedExperimentNumber : null;
};

const getExperimentViewerPath = (instrument: string | null, experimentNumber: number | null = null): string => {
  if (!instrument) {
    return experimentNumber === null ? '/experiment-viewer' : `/experiment-viewer/experiment/${experimentNumber}`;
  }

  const instrumentPath = `/experiment-viewer/${encodeURIComponent(instrument)}`;
  return experimentNumber === null ? instrumentPath : `${instrumentPath}/${experimentNumber}`;
};

const getCanonicalInstrumentName = (name: string | undefined): string | undefined =>
  instruments.find((instrument) => instrument.name.toUpperCase() === name?.toUpperCase())?.name;

const ExperimentNumberSearch: React.FC<{
  experimentNumber: number | null;
  onExperimentNumberChange: (experimentNumber: number | null) => void;
}> = ({ experimentNumber, onExperimentNumberChange }): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);
  const [draftExperimentNumber, setDraftExperimentNumber] = useState(experimentNumber?.toString() ?? '');

  useEffect(() => {
    setDraftExperimentNumber(experimentNumber?.toString() ?? '');
  }, [experimentNumber]);

  const clearExperimentNumber = (): void => {
    setDraftExperimentNumber('');
    if (experimentNumber !== null) {
      onExperimentNumberChange(null);
    }
  };

  const applyExperimentNumber = (event: React.FormEvent): void => {
    event.preventDefault();
    const trimmedExperimentNumber = draftExperimentNumber.trim();

    if (trimmedExperimentNumber.length === 0) {
      onExperimentNumberChange(null);
      return;
    }

    const parsedExperimentNumber = Number(trimmedExperimentNumber);
    if (!Number.isInteger(parsedExperimentNumber) || parsedExperimentNumber < 0) {
      return;
    }

    onExperimentNumberChange(parsedExperimentNumber);
  };

  return (
    <Box
      component="form"
      aria-label="Search experiment number"
      onSubmit={applyExperimentNumber}
      sx={{ pt: 1.5, borderBottom: `1px solid ${viewerChrome.border}`, flexShrink: 0 }}
    >
      <Box sx={{ px: 1.5 }}>
        <TextField
          fullWidth
          autoComplete="off"
          size="small"
          type="number"
          label="Experiment number"
          value={draftExperimentNumber}
          onChange={(event) => setDraftExperimentNumber(event.target.value)}
          inputProps={{ min: 0, step: 1, autoComplete: 'off' }}
          sx={{
            minWidth: 0,
            '& .MuiOutlinedInput-root': {
              height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
              fontSize: '0.875rem',
            },
          }}
        />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          mt: 1.5,
          borderTop: `1px solid ${viewerChrome.border}`,
        }}
      >
        <Button
          type="submit"
          size="small"
          variant="text"
          startIcon={<SearchIcon fontSize="small" />}
          sx={{ borderRight: `1px solid ${viewerChrome.border}` }}
        >
          Search
        </Button>
        <Button
          type="button"
          size="small"
          aria-label="Clear experiment number"
          onClick={clearExperimentNumber}
          disabled={experimentNumber === null && !draftExperimentNumber}
        >
          Clear
        </Button>
      </Box>
    </Box>
  );
};

const ExperimentViewer: React.FC = (): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);
  const { instrumentName, experimentNumber, experimentOnlyNumber, jobId } = useParams<RouteParams>();
  const history = useHistory();
  const { rootRef: viewerRootRef, availableHeight: viewerHeight } = useAvailablePluginHeight();
  const routeExperimentNumber = parseExperimentNumber(experimentOnlyNumber ?? experimentNumber);
  const hasRouteExperimentNumber = experimentNumber !== undefined || experimentOnlyNumber !== undefined;

  // Redirect if an instrument is specified in the URL but it's not a valid instrument name
  useEffect(() => {
    if (
      (instrumentName && !isValidInstrument(instrumentName)) ||
      (hasRouteExperimentNumber && routeExperimentNumber === null)
    ) {
      window.location.replace('/404/');
    }
  }, [hasRouteExperimentNumber, instrumentName, routeExperimentNumber]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [files, setFiles] = useState<FileConfig[]>([]);
  const [linePlotData, setLinePlotData] = useState<LinePlotData[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingPlotData, setLoadingPlotData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSelectPrimary, setAutoSelectPrimary] = useState(true);
  const [activeViewerTab, setActiveViewerTab] = useState<'1d' | '2d'>('1d');
  const [selected2DFile, setSelected2DFile] = useState<string | null>(null);
  const [selected2DFilePath, setSelected2DFilePath] = useState<string | null>(null);
  const [loading2DPath, setLoading2DPath] = useState(false);
  const [viewer2DError, setViewer2DError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);

  // Search state - initialize from route params
  const [searchInstrument, setSearchInstrument] = useState<string | null>(() => instrumentName ?? null);
  const [searchExperimentNumber, setSearchExperimentNumber] = useState<number | null>(() => routeExperimentNumber);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(() => {
    return Boolean(instrumentName || routeExperimentNumber !== null);
  });

  useEffect(() => {
    const nextSearchActive = Boolean(instrumentName || routeExperimentNumber !== null);

    setSearchInstrument(instrumentName ?? null);
    setSearchExperimentNumber(routeExperimentNumber);
    setIsSearchActive(nextSearchActive);
    setCurrentPage(0);

    if (!jobId && !nextSearchActive) {
      setJobs([]);
      setFiles([]);
      setLinePlotData([]);
      setSelected2DFile(null);
      setSelected2DFilePath(null);
      setViewer2DError(null);
      setTotalJobs(0);
      setLoadingJobs(false);
      setError(null);
    }
  }, [instrumentName, jobId, routeExperimentNumber]);

  const clearViewerSelections = useCallback((): void => {
    setLinePlotData([]);
    setSelected2DFile(null);
    setSelected2DFilePath(null);
    setViewer2DError(null);
    setFiles((prevFiles) =>
      prevFiles.map((file) => ({
        ...file,
        enabled: false,
        path: undefined,
        errorPath: undefined,
        selection: [],
        selectedDatasetIs2D: undefined,
      }))
    );
  }, []);

  // Fetch jobs based on URL params or search
  useEffect(() => {
    let isCurrentRequest = true;

    const resetLoadedData = (): void => {
      if (!isCurrentRequest) {
        return;
      }

      setJobs([]);
      setFiles([]);
      setLinePlotData([]);
      setSelected2DFile(null);
      setSelected2DFilePath(null);
      setViewer2DError(null);
      setTotalJobs(0);
      setLoadingJobs(false);
    };

    const loadJobs = async (): Promise<void> => {
      try {
        if (!jobId && !isSearchActive) {
          resetLoadedData();
          return;
        }

        setLoadingJobs(true);
        setError(null);
        clearViewerSelections();
        let jobsData: Job[];

        if (jobId) {
          // Fetch specific job by ID (from URL)
          const response = await fiaApi.get<Job>(`/job/${jobId}`);
          if (!isCurrentRequest) {
            return;
          }
          jobsData = [response.data];
          setTotalJobs(1);
        } else if (isSearchActive) {
          // Fetch jobs based on search criteria
          const filters: JobQueryFilters = {
            job_state_in: ['SUCCESSFUL'],
          };

          if (searchInstrument) {
            filters.instrument_in = [searchInstrument];
          }

          if (searchExperimentNumber !== null) {
            filters.experiment_number_in = [searchExperimentNumber];
          }

          const countResponse = await fiaApi.get<{ count: number }>('/jobs/count', {
            params: {
              filters: JSON.stringify(filters),
            },
          });
          if (!isCurrentRequest) {
            return;
          }
          const totalMatchingJobs = countResponse.data.count;
          setTotalJobs(totalMatchingJobs);

          if (totalMatchingJobs === 0) {
            jobsData = [];
          } else {
            const maxPageIndex = Math.max(0, Math.ceil(totalMatchingJobs / EXPERIMENT_VIEWER_PAGE_SIZE) - 1);

            if (currentPage > maxPageIndex) {
              setCurrentPage(maxPageIndex);
              return;
            }

            const response = await fiaApi.get<Job[]>('/jobs', {
              params: {
                filters: JSON.stringify(filters),
                include_run: 'true',
                limit: EXPERIMENT_VIEWER_PAGE_SIZE,
                offset: currentPage * EXPERIMENT_VIEWER_PAGE_SIZE,
                order_by: 'run_start',
                order_direction: 'desc',
              },
            });
            if (!isCurrentRequest) {
              return;
            }
            jobsData = response.data;

            if (!searchInstrument && searchExperimentNumber !== null) {
              const resolvedJob = jobsData.find((job) => isValidInstrument(job.run.instrument_name));
              const resolvedInstrument = resolvedJob?.run.instrument_name;

              if (resolvedInstrument) {
                setSearchInstrument(resolvedInstrument);
                history.replace(getExperimentViewerPath(resolvedInstrument, searchExperimentNumber));
                return;
              }
            }
          }
        } else {
          // No URL params and no search - don't fetch
          resetLoadedData();
          return;
        }

        // Create file configs for all output files and fetch their full paths
        const allFiles: FileConfig[] = [];

        // Parse outputs and collect all unique filenames
        const allFilenames: string[] = [];
        const jobOutputMap = new Map<string, { instrumentName: string; experimentNumber: number }>();

        // Filter jobs to only include H5 files in outputs and store filtered outputs back
        const filteredJobs = jobsData.map((job) => {
          // Parse outputs - handle 3 cases:
          // 1. Lists like "['file1', 'file2']" - split on "', '"
          // 2. Individual files without brackets - treat as single file
          // 3. Lists with non-file garbage - filter out non-files
          let outputs: string[] = [];

          const outputStr = job.outputs.trim();

          // Case 1 & 3: Check if it's a list (starts with [ and ends with ])
          if (outputStr.startsWith('[') && outputStr.endsWith(']')) {
            // Remove brackets and split on "', '"
            const withoutBrackets = outputStr.slice(1, -1);
            outputs = withoutBrackets
              .split("', '")
              .map((s) => s.replace(/^['"]|['"]$/g, '').trim()) // Remove quotes and trim
              .filter((s) => s.length > 0); // Remove empty strings
          } else {
            // Case 2: Individual file without brackets
            outputs = [outputStr];
          }

          // Filter to only keep valid H5 files (handles case 3 - filters garbage)
          const h5Outputs = outputs.filter((output) => {
            // Must be a string with valid file extension
            return (
              typeof output === 'string' && output.length > 0 && outputFilter.some((filter) => output.endsWith(filter))
            );
          });

          // Collect unique filenames
          h5Outputs.forEach((output) => {
            if (!allFilenames.includes(output)) {
              allFilenames.push(output);
              jobOutputMap.set(output, {
                instrumentName: job.run.instrument_name,
                experimentNumber: job.run.experiment_number,
              });
            }
          });

          // Return job with filtered outputs as comma-separated string for FileTree
          return {
            ...job,
            outputs: h5Outputs.join(', '),
          };
        });

        if (!isCurrentRequest) {
          return;
        }

        setJobs(filteredJobs);

        // Fetch full paths for all files in parallel
        const filePathPromises = allFilenames.map(async (filename) => {
          try {
            const jobInfo = jobOutputMap.get(filename);
            if (!jobInfo) {
              throw new Error('Job info not found');
            }
            const fullPath = await fetchFilePath(filename, jobInfo.instrumentName, jobInfo.experimentNumber);
            return { filename, fullPath };
          } catch (error) {
            console.warn(`Failed to fetch path for ${filename}, using filename as fallback`, error);
            return { filename, fullPath: filename };
          }
        });

        const filePathResults = await Promise.all(filePathPromises);
        if (!isCurrentRequest) {
          return;
        }
        const filePathMap = new Map(filePathResults.map((r) => [r.filename, r.fullPath]));

        // Create file configs with full paths
        allFilenames.forEach((filename) => {
          allFiles.push({
            filename: filename,
            fullPath: filePathMap.get(filename),
            path: undefined,
            errorPath: undefined,
            enabled: false,
            selection: [], // Initialize as empty array for multi-slice support
            selectionInputMode: 'text', // Default to text input mode
          });
        });

        setFiles(allFiles);
      } catch (err) {
        if (!isCurrentRequest) {
          return;
        }
        console.error('Error loading jobs:', err);
        setError('Failed to load jobs from server');
      } finally {
        if (isCurrentRequest) {
          setLoadingJobs(false);
        }
      }
    };

    loadJobs();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    clearViewerSelections,
    currentPage,
    jobId,
    history,
    instrumentName,
    isSearchActive,
    searchInstrument,
    searchExperimentNumber,
  ]);

  const handleInstrumentChange = (instrument: string): void => {
    const nextInstrument = instrument === 'ALL' ? null : instrument;
    const nextExperimentNumber = nextInstrument ? searchExperimentNumber : null;
    const nextSearchActive = Boolean(nextInstrument || nextExperimentNumber);

    setSearchInstrument(nextInstrument);
    setSearchExperimentNumber(nextExperimentNumber);
    setIsSearchActive(nextSearchActive);
    setCurrentPage(0);
    clearViewerSelections();
    setError(null);

    if (!nextSearchActive) {
      setJobs([]);
      setFiles([]);
      setLinePlotData([]);
      setTotalJobs(0);
    }

    history.push(getExperimentViewerPath(nextInstrument, nextExperimentNumber));
  };

  const handleExperimentNumberChange = (experimentNumber: number | null): void => {
    const nextSearchActive = Boolean(searchInstrument || experimentNumber !== null);

    setSearchInstrument(searchInstrument);
    setSearchExperimentNumber(experimentNumber);
    setIsSearchActive(nextSearchActive);
    setCurrentPage(0);
    clearViewerSelections();
    setError(null);

    if (!nextSearchActive) {
      setJobs([]);
      setFiles([]);
      setLinePlotData([]);
      setTotalJobs(0);
    }

    history.push(getExperimentViewerPath(searchInstrument, experimentNumber));
  };

  const handlePageChange = (nextPage: number): void => {
    if (!Number.isInteger(nextPage) || nextPage < 0) {
      return;
    }

    const maxPageIndex = Math.max(0, Math.ceil(totalJobs / EXPERIMENT_VIEWER_PAGE_SIZE) - 1);
    const boundedPage = Math.min(nextPage, maxPageIndex);

    if (boundedPage === currentPage) {
      return;
    }

    clearViewerSelections();
    setCurrentPage(boundedPage);
  };

  // Discover datasets in a file
  const discoverDatasets = useCallback(
    async (index: number): Promise<void> => {
      const file = files[index];
      if (!file.fullPath || file.isDiscovered) {
        return;
      }

      try {
        const structure = await discoverFileStructure(file.filename, file.fullPath);

        // Convert discovered datasets to our format
        const discoveredDatasets: DatasetInfo[] = structure.datasets.map((ds) => ({
          path: ds.path,
          shape: ds.shape,
          dtype: ds.dtype as NumericType,
          errorPath: ds.errorPath,
          is1D: ds.is1D,
          is2D: ds.is2D,
          isPrimary: ds.isPrimary,
        }));

        // Update file config with discovered datasets
        setFiles((prevFiles) =>
          prevFiles.map((f, i) => {
            if (i === index) {
              let updatedFile = {
                ...f,
                discoveredDatasets,
                isDiscovered: true,
              };

              // Auto-select primary dataset if enabled and no dataset selected yet
              if (autoSelectPrimary && !f.path && discoveredDatasets.length > 0) {
                // Find first dataset with isPrimary flag
                const primaryDataset = discoveredDatasets.find((ds) => ds.isPrimary);
                const datasetToSelect = primaryDataset || discoveredDatasets[0];

                // Set selected dataset fields
                updatedFile = {
                  ...updatedFile,
                  path: datasetToSelect.path,
                  errorPath: datasetToSelect.errorPath,
                  selectedDatasetIs2D: datasetToSelect.is2D,
                  selection: [],
                };
              }

              return updatedFile;
            }
            return f;
          })
        );
      } catch (error) {
        console.error(`[H5Grove] Failed to discover datasets in ${file.filename}:`, error);
        // Mark as discovered anyway to avoid repeated attempts
        setFiles((prevFiles) => prevFiles.map((f, i) => (i === index ? { ...f, isDiscovered: true } : f)));
      }
    },
    [files, autoSelectPrimary]
  );

  // Handle file toggle
  const handleFileToggle = async (index: number): Promise<void> => {
    const file = files[index];
    const willBeEnabled = !file.enabled;

    // Update enabled state
    setFiles((prevFiles) => prevFiles.map((f, i) => (i === index ? { ...f, enabled: !f.enabled } : f)));

    // If enabling and not yet discovered, discover datasets
    if (willBeEnabled && !file.isDiscovered) {
      await discoverDatasets(index);
    }
  };

  // Handle dataset selection
  const handleDatasetChange = (index: number, datasetPath: string): void => {
    setFiles((prevFiles) => {
      return prevFiles.map((file, i) => {
        if (i === index && file.discoveredDatasets) {
          const selectedDataset = file.discoveredDatasets.find((ds) => ds.path === datasetPath);
          if (selectedDataset) {
            return {
              ...file,
              path: selectedDataset.path,
              errorPath: selectedDataset.errorPath,
              selectedDatasetIs2D: selectedDataset.is2D,
              selection: [], // Reset to empty array when dataset changes
            };
          }
        }
        return file;
      });
    });
  };

  // Handle selection change - now accepts array of selections
  const handleSelectionChange = (index: number, selections: number[]): void => {
    setFiles((prevFiles) => prevFiles.map((file, i) => (i === index ? { ...file, selection: selections } : file)));
  };

  // Fetch data for all enabled files with paths selected
  useEffect(() => {
    let isCurrentRequest = true;
    const enabledFiles = files.filter((file) => file.enabled && file.path);

    if (enabledFiles.length === 0) {
      setLinePlotData([]);
      setLoadingPlotData(false);
      return;
    }

    const fetchAllData = async (): Promise<void> => {
      setLoadingPlotData(true);
      setError(null);

      try {
        // For each file, create separate fetch promises for each selected slice
        const lineDataPromises = enabledFiles.flatMap((file) => {
          const fileToFetch = file.fullPath || file.filename;
          const is1DDataset = !file.selectedDatasetIs2D;

          if (!file.path) {
            throw new Error('No dataset path selected');
          }

          // For 1D datasets, single fetch with no selection
          if (is1DDataset) {
            return [
              (async () => {
                const data = await fetchData1D(fileToFetch, file.path!, undefined);

                let errors: number[] | undefined;
                if (showErrors && file.errorPath) {
                  try {
                    errors = await fetchErrorData(fileToFetch, file.errorPath, undefined);
                  } catch (err) {
                    console.warn(`Failed to fetch error data for ${file.filename}:`, err);
                  }
                }

                return {
                  filename: file.filename,
                  data,
                  errors,
                };
              })(),
            ];
          }

          // For 2D datasets, make separate API call for each slice
          const selections = file.selection && file.selection.length > 0 ? file.selection : [0];

          return selections.map((slice) =>
            (async () => {
              const data = await fetchData1D(fileToFetch, file.path!, slice);

              let errors: number[] | undefined;
              if (showErrors && file.errorPath) {
                try {
                  errors = await fetchErrorData(fileToFetch, file.errorPath, slice);
                } catch (err) {
                  console.warn(`Failed to fetch error data for ${file.filename} slice ${slice}:`, err);
                }
              }

              return {
                filename: `${file.filename} [slice ${slice}]`,
                data,
                errors,
              };
            })()
          );
        });

        const lineResults = await Promise.all(lineDataPromises);
        if (isCurrentRequest) {
          setLinePlotData(lineResults);
        }
      } catch (err) {
        if (!isCurrentRequest) {
          return;
        }
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please check your backend connection.');
        setLinePlotData([]);
      } finally {
        if (isCurrentRequest) {
          setLoadingPlotData(false);
        }
      }
    };

    fetchAllData();

    return () => {
      isCurrentRequest = false;
    };
  }, [files, showErrors]);

  // Fetch filepath for 2D viewer when file is selected
  useEffect(() => {
    if (activeViewerTab !== '2d' || !selected2DFile) {
      setSelected2DFilePath(null);
      setViewer2DError(null);
      return;
    }

    const fetchPath = async (): Promise<void> => {
      setLoading2DPath(true);
      setViewer2DError(null);

      try {
        // Find file config (may have cached fullPath)
        const fileConfig = files.find((f) => f.filename === selected2DFile);

        if (!fileConfig) {
          throw new Error('File configuration not found');
        }

        // Use cached path if available
        if (fileConfig.fullPath) {
          setSelected2DFilePath(fileConfig.fullPath);
        } else {
          // Find job that contains this file (to get instrument/experiment info)
          const job = jobs.find((job) => {
            const outputs = job.outputs.split(',').map((s) => s.trim());
            return outputs.includes(selected2DFile);
          });

          if (!job) {
            throw new Error('Job information not found for file');
          }

          // Fetch full path from API
          const fullPath = await fetchFilePath(selected2DFile, job.run.instrument_name, job.run.experiment_number);

          setSelected2DFilePath(fullPath);
        }
      } catch (error) {
        console.error('Error fetching file path for 2D viewer:', error);
        setViewer2DError('Failed to load file path');
        setSelected2DFilePath(null);
      } finally {
        setLoading2DPath(false);
      }
    };

    fetchPath();
  }, [activeViewerTab, selected2DFile, files, jobs]);

  const showSearchControls = !jobId;
  const breadcrumbRouteCrumbCount = searchInstrument
    ? searchExperimentNumber === null
      ? 0
      : 1
    : searchExperimentNumber === null
      ? 0
      : 2;
  const selectedRouteInstrumentName = getCanonicalInstrumentName(instrumentName);
  const breadcrumbLabelOverrides = selectedRouteInstrumentName
    ? { [instrumentName ?? selectedRouteInstrumentName]: selectedRouteInstrumentName }
    : undefined;
  const pageControls = showSearchControls ? (
    <InstrumentSelector
      selectedInstrument={searchInstrument || 'ALL'}
      handleInstrumentChange={handleInstrumentChange}
      variant="compact"
      allInstrumentsLabel="Clear filters"
      compactLabel="Browse instruments"
      support={{ page: 'experiment-viewer', instruments: REDUCTION_SUPPORTED_INSTRUMENTS }}
    />
  ) : undefined;
  const hasViewableFiles = files.length > 0;

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
        breadcrumbs={
          <NavArrows
            omitLastCrumbCount={showSearchControls ? breadcrumbRouteCrumbCount : 0}
            labelOverrides={breadcrumbLabelOverrides}
          />
        }
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
              height: { xs: 320, md: 'auto' },
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
                showSearchControls && (
                  <ExperimentNumberSearch
                    experimentNumber={searchExperimentNumber}
                    onExperimentNumberChange={handleExperimentNumberChange}
                  />
                )
              }
              viewTabs={
                <ViewerTabs activeTab={activeViewerTab} onTabChange={setActiveViewerTab} disabled={!hasViewableFiles} />
              }
              jobs={jobs}
              files={files}
              isLoading={loadingJobs}
              showEmptyState={isSearchActive || Boolean(jobId)}
              currentPage={showSearchControls ? currentPage : undefined}
              totalJobs={showSearchControls ? totalJobs : undefined}
              pageSize={EXPERIMENT_VIEWER_PAGE_SIZE}
              isPaginationDisabled={loadingJobs}
              onPageChange={showSearchControls ? handlePageChange : undefined}
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
            {(loadingPlotData || loading2DPath) && (
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
            {(error || viewer2DError) && (
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
                    setViewer2DError(null);
                  }}
                >
                  {error || viewer2DError}
                </Alert>
              </Box>
            )}

            {/* Conditional viewer rendering */}
            {activeViewerTab === '1d' ? (
              <PlotViewer
                linePlotData={linePlotData}
                showErrors={showErrors}
                onShowErrorsChange={setShowErrors}
                emptyTitle={hasViewableFiles ? undefined : 'Search by instrument and experiment number'}
                emptyMessage={
                  hasViewableFiles
                    ? undefined
                    : 'Use Browse instruments or enter an experiment number in the search field.'
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
