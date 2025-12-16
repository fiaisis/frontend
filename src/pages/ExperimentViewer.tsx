import '@h5web/lib/styles.css';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import FileTree from '../components/experimentViewer/FileTree';
import PlotViewer from '../components/experimentViewer/Graph';
import ExperimentSearch from '../components/experimentViewer/ExperimentSearch';
import NavArrows from '../components/navigation/NavArrows';
import { discoverFileStructure, fetchData1D, fetchErrorData, fetchFilePath } from '../lib/plottingServiceAPI';
import { fiaApi } from '../lib/api';
import { FileConfig, LinePlotData, Job, DatasetInfo, JobQueryFilters, outputFilter } from '../lib/types';
import type { NumericType } from '@h5web/app';

interface RouteParams {
  instrumentName: string;
  jobId: string;
}

const ExperimentViewer: React.FC = (): JSX.Element => {
  const { instrumentName, jobId } = useParams<RouteParams>();
  const location = useLocation();
  const history = useHistory();

  const searchParams = new URLSearchParams(location.search);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [files, setFiles] = useState<FileConfig[]>([]);
  const [linePlotData, setLinePlotData] = useState<LinePlotData[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSelectPrimary, setAutoSelectPrimary] = useState(true);

  // Search state - initialize from URL params
  const [searchInstrument, setSearchInstrument] = useState<string | null>(() => searchParams.get('instrument'));
  const [searchExperimentNumber, setSearchExperimentNumber] = useState<number | null>(() => {
    const exp = searchParams.get('experiment');
    return exp ? parseInt(exp, 10) : null;
  });
  const [isSearchActive, setIsSearchActive] = useState<boolean>(() => {
    return Boolean(searchParams.get('instrument') || searchParams.get('experiment'));
  });

  // Fetch jobs based on URL params or search
  useEffect(() => {
    const loadJobs = async (): Promise<void> => {
      try {
        setLoading(true);
        let jobsData: Job[];

        if (jobId) {
          // Fetch specific job by ID (from URL)
          const response = await fiaApi.get<Job>(`/job/${jobId}`);
          jobsData = [response.data];
        } else if (instrumentName) {
          // Fetch jobs for instrument (from URL)
          const filters = {
            instrument_in: [instrumentName],
            job_state_in: ['SUCCESSFUL'],
          };
          const response = await fiaApi.get<Job[]>('/jobs', {
            params: {
              filters: JSON.stringify(filters),
              include_run: 'true',
            },
          });
          jobsData = response.data;
        } else if (isSearchActive) {
          // Fetch jobs based on search criteria
          const filters: JobQueryFilters = {
            job_state_in: ['SUCCESSFUL'],
          };

          if (searchInstrument) {
            filters.instrument_in = [searchInstrument];
          }

          if (searchExperimentNumber) {
            filters.experiment_number_in = [searchExperimentNumber];
          }

          const response = await fiaApi.get<Job[]>('/jobs', {
            params: {
              filters: JSON.stringify(filters),
              include_run: 'true',
              limit: 100,
            },
          });
          jobsData = response.data;
        } else {
          // No URL params and no search - don't fetch
          setLoading(false);
          return;
        }

        console.log('Fetched jobs:', jobsData);

        // Create file configs for all output files and fetch their full paths
        const allFiles: FileConfig[] = [];

        // Parse outputs and collect all unique filenames
        const allFilenames: string[] = [];
        const jobOutputMap = new Map<string, { instrumentName: string; experimentNumber: number }>();

        // Filter jobs to only include H5 files in outputs and store filtered outputs back
        const filteredJobs = jobsData.map((job) => {
          console.log('Job outputs:', job.outputs);

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

          console.log('Parsed outputs:', outputs);

          // Filter to only keep valid H5 files (handles case 3 - filters garbage)
          const h5Outputs = outputs.filter((output) => {
            // Must be a string with valid file extension
            return (
              typeof output === 'string' && output.length > 0 && outputFilter.some((filter) => output.endsWith(filter))
            );
          });

          console.log('Filtered job outputs:', h5Outputs);

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

          console.log('All filenames:', allFilenames);

          // Return job with filtered outputs as comma-separated string for FileTree
          return {
            ...job,
            outputs: h5Outputs.join(', '),
          };
        });

        console.log('Filtered jobs with H5 outputs:', filteredJobs);
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

        console.log('Files with paths:', allFiles);
        setFiles(allFiles);
      } catch (err) {
        console.error('Error loading jobs:', err);
        setError('Failed to load jobs from server');
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [jobId, instrumentName, isSearchActive, searchInstrument, searchExperimentNumber]);

  // Search handlers
  const handleSearch = (instrument: string | null, experimentNumber: number | null): void => {
    setSearchInstrument(instrument);
    setSearchExperimentNumber(experimentNumber);
    setIsSearchActive(true);
    setError(null);

    // Update URL search params
    const params = new URLSearchParams();
    if (instrument) {
      params.set('instrument', instrument);
    }
    if (experimentNumber !== null) {
      params.set('experiment', experimentNumber.toString());
    }
    history.push({ search: params.toString() });
  };

  const handleClearSearch = (): void => {
    setSearchInstrument(null);
    setSearchExperimentNumber(null);
    setIsSearchActive(false);
    setJobs([]);
    setFiles([]);
    setLinePlotData([]);
    setError(null);

    // Clear URL search params
    history.push({ search: '' });
  };

  // Discover datasets in a file
  const discoverDatasets = useCallback(
    async (index: number): Promise<void> => {
      const file = files[index];
      if (!file.fullPath || file.isDiscovered) {
        return;
      }

      try {
        console.log(`[H5Grove] Discovering datasets in ${file.filename}...`);
        const structure = await discoverFileStructure(file.filename, file.fullPath);
        console.log('[H5Grove] API response:', structure);

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

        console.log('[H5Grove] Discovered datasets:', discoveredDatasets);

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

                console.log(
                  `[H5Grove] Auto-selected ${primaryDataset ? 'primary' : 'first'} dataset:`,
                  datasetToSelect.path
                );
              }

              return updatedFile;
            }
            return f;
          })
        );

        console.log(`[H5Grove] Discovered ${discoveredDatasets.length} datasets in ${file.filename}`);
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
    const enabledFiles = files.filter((file) => file.enabled && file.path);

    if (enabledFiles.length === 0) {
      setLinePlotData([]);
      return;
    }

    const fetchAllData = async (): Promise<void> => {
      setLoading(true);
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
                console.log('Fetching 1D data for:', fileToFetch, '- path:', file.path);
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
              console.log('Fetching slice', slice, 'for:', fileToFetch, '- path:', file.path);

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
        setLinePlotData(lineResults);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please check your backend connection.');
        setLinePlotData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [files, showErrors]);

  // Determine if we should show search (not viewing specific job from URL)
  const showSearch = !jobId;

  return (
    <>
      <NavArrows />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
        {/* Search bar - only show when not viewing specific job */}
        {showSearch && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <ExperimentSearch
              onSearch={handleSearch}
              onClear={handleClearSearch}
              initialInstrument={searchInstrument || undefined}
              initialExperimentNumber={searchExperimentNumber || undefined}
              isLoading={loading}
              isSearchActive={isSearchActive}
            />
          </Box>
        )}

        {/* Main content area */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Empty state - no search active and no URL params */}
          {!jobId && !instrumentName && !isSearchActive && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
              }}
            >
              <Box sx={{ textAlign: 'center', maxWidth: 500, p: 4 }}>
                <Typography variant="h5" color="text.primary" sx={{ mb: 2 }}>
                  Search for HDF5 Data
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Enter an instrument and/or experiment number above to search for jobs with HDF5 output files.
                </Typography>
              </Box>
            </Box>
          )}

          {/* No results state */}
          {isSearchActive && jobs.length === 0 && !loading && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center', maxWidth: 500, p: 4 }}>
                <Typography variant="h5" color="text.primary" sx={{ mb: 2 }}>
                  No Jobs Found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {searchInstrument && `Instrument: ${searchInstrument}`}
                  {searchInstrument && searchExperimentNumber && ' | '}
                  {searchExperimentNumber && `Experiment: ${searchExperimentNumber}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search criteria or clearing the search to start over.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Results - show FileTree and Graph when we have jobs */}
          {(jobId || instrumentName || (isSearchActive && jobs.length > 0)) && (
            <>
              {/* Left panel - File Tree */}
              <Box
                sx={{
                  width: 320,
                  borderRight: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <FileTree
                  jobs={jobs}
                  files={files}
                  onFileToggle={handleFileToggle}
                  onDatasetChange={handleDatasetChange}
                  onSelectionChange={handleSelectionChange}
                  autoSelectPrimary={autoSelectPrimary}
                  onAutoSelectPrimaryChange={setAutoSelectPrimary}
                />
              </Box>

              {/* Right panel - Plot */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Loading indicator */}
                {loading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      zIndex: 10,
                    }}
                  >
                    <CircularProgress size={60} />
                  </Box>
                )}

                {/* Error message */}
                {error && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 20,
                    }}
                  >
                    <Alert severity="error" onClose={() => setError(null)}>
                      {error}
                    </Alert>
                  </Box>
                )}

                <PlotViewer linePlotData={linePlotData} showErrors={showErrors} onShowErrorsChange={setShowErrors} />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

export default ExperimentViewer;
