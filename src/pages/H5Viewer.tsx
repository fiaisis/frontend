import '@h5web/lib/styles.css';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, useTheme } from '@mui/material';
import FileTree from '../components/h5viewer/FileTree';
import PlotViewer from '../components/h5viewer/Graph';
import ExperimentSearch from '../components/h5viewer/ExperimentSearch';
import { fetchData1D, fetchErrorData, fetchFilePath } from '../lib/h5Api';
import { discoverFileStructure } from '../lib/h5grove';
import { fiaApi } from '../lib/api';
import type { FileConfig, LinePlotData, Job, DatasetInfo, JobQueryFilters } from '../lib/types';
import type { NumericType } from '@h5web/app';

// Default colors for multiple lines - bright, vibrant colors
const DEFAULT_COLORS = [
  '#00bfff', // sky blue
  '#f97316', // orange
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#f472b6', // pink
];

interface RouteParams {
  instrumentName: string;
  jobId: string;
}

const H5Viewer: React.FC = (): JSX.Element => {
  const { instrumentName, jobId } = useParams<RouteParams>();
  const location = useLocation();
  const history = useHistory();
  const theme = useTheme();

  // Parse URL search params
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
    const loadJobs = async () => {
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
              limit: 100, // Reasonable limit for experiment search
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
        let colorIndex = 0;

        // Parse outputs and collect all unique filenames
        const allFilenames: string[] = [];
        const jobOutputMap = new Map<string, { instrumentName: string; experimentNumber: number }>();

        // Filter jobs to only include H5 files in outputs and store filtered outputs back
        const filteredJobs = jobsData.map((job) => {
          console.log('Job outputs:', job.outputs);
          const outputs = JSON.parse(job.outputs.replace(/'/g, '"')) as string[];
          console.log('Parsed outputs:', outputs);
          const h5Outputs = outputs.filter(
            (output) =>
              output.endsWith('.h5') ||
              output.endsWith('.hdf5') ||
              output.endsWith('.nxs') ||
              output.endsWith('.nxspe')
          );

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
            color: DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length],
            selection: 0,
          });
          colorIndex++;
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
  const handleSearch = (instrument: string | null, experimentNumber: number | null) => {
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

  const handleClearSearch = () => {
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

  const parseOutputs = (outputs: string | string[]): string[] => {
    if (typeof outputs === 'string') {
      try {
        // Try parsing as JSON array first
        const parsed = JSON.parse(outputs);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // If JSON parsing fails, fall back to comma-separated split
        return outputs
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }
    return Array.isArray(outputs) ? outputs : [];
  };

  // Discover datasets in a file
  const discoverDatasets = useCallback(
    async (index: number) => {
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
              return {
                ...f,
                discoveredDatasets,
                isDiscovered: true,
              };
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
    [files]
  );

  // Handle file toggle
  const handleFileToggle = async (index: number) => {
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
  const handleDatasetChange = (index: number, datasetPath: string) => {
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
              selection: 0,
            };
          }
        }
        return file;
      });
    });
  };

  // Handle selection change
  const handleSelectionChange = (index: number, selection: number) => {
    setFiles((prevFiles) => prevFiles.map((file, i) => (i === index ? { ...file, selection } : file)));
  };

  // Fetch data for all enabled files with paths selected
  useEffect(() => {
    const enabledFiles = files.filter((file) => file.enabled && file.path);

    if (enabledFiles.length === 0) {
      setLinePlotData([]);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        const lineDataPromises = enabledFiles.map(async (file) => {
          const fileToFetch = file.fullPath || file.filename;
          const is1DDataset = !file.selectedDatasetIs2D;
          const selectionParam = is1DDataset ? undefined : (file.selection ?? 0);

          console.log(
            'Fetching data for: ',
            fileToFetch,
            ' - path: ',
            file.path,
            ' - is1D: ',
            is1DDataset,
            ' - selection: ',
            selectionParam ?? 'none'
          );

          if (!file.path) {
            throw new Error('No dataset path selected');
          }

          const data = await fetchData1D(fileToFetch, file.path, selectionParam);
          console.log(`Fetched data for ${file.filename}:`, data);

          let errors: number[] | undefined;
          if (showErrors && file.errorPath) {
            console.log(`Fetching error data for ${file.filename}`);
            try {
              errors = await fetchErrorData(fileToFetch, file.errorPath, selectionParam);
            } catch (err) {
              console.warn(`Failed to fetch error data for ${file.filename}:`, err);
            }
          }

          return {
            filename: file.filename,
            data,
            errors,
            color: file.color,
          };
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
  );
};

export default H5Viewer;
