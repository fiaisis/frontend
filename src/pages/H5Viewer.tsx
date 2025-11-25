import '@h5web/lib/styles.css';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Switch, FormControlLabel, useTheme } from '@mui/material';
import FileTree from '../components/h5viewer/FileTree';
import PlotViewer from '../components/h5viewer/Graph';
import { fetchData1D, fetchErrorData, fetchFilePath } from '../lib/h5Api';
import { discoverFileStructure } from '../lib/h5grove';
import { fiaApi } from '../lib/api';
import type { FileConfig, LinePlotData, Job, DatasetInfo } from '../lib/types';
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
  const theme = useTheme();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [files, setFiles] = useState<FileConfig[]>([]);
  const [linePlotData, setLinePlotData] = useState<LinePlotData[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSelectPrimary, setAutoSelectPrimary] = useState(true);

  // Fetch jobs on mount
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        let jobsData: Job[];

        if (jobId) {
          // Fetch specific job by ID
          const response = await fiaApi.get<Job>(`/job/${jobId}`);
          jobsData = [response.data];
        } else if (instrumentName) {
          // Fetch jobs for instrument
          const filters = {
            instrument_in: [instrumentName],
            job_state_in: ['SUCCESSFUL'],
          };
          const response = await fiaApi.get<Job[]>('/job', {
            params: {
              filters: JSON.stringify(filters),
              include_run: 'true',
            },
          });
          jobsData = response.data;
        } else {
          // No filters - fetch recent jobs
          const response = await fiaApi.get<Job[]>('/job', {
            params: {
              include_run: 'true',
              limit: 50,
            },
          });
          jobsData = response.data;
        }

        console.log('Fetched jobs:', jobsData);
        setJobs(jobsData);

        // Create file configs for all output files and fetch their full paths
        const allFiles: FileConfig[] = [];
        let colorIndex = 0;

        // Parse outputs and collect all unique filenames
        const allFilenames: string[] = [];
        const jobOutputMap = new Map<string, { instrumentName: string; experimentNumber: number }>();

        jobsData.forEach((job) => {
          const outputs = parseOutputs(job.outputs);
          outputs.forEach((output) => {
            // Only include .h5 and .hdf5 files
            if (output.endsWith('.h5') || output.endsWith('.hdf5') || output.endsWith('.nxs')) {
              if (!allFilenames.includes(output)) {
                allFilenames.push(output);
                jobOutputMap.set(output, {
                  instrumentName: job.run.instrument_name,
                  experimentNumber: job.run.experiment_number,
                });
              }
            }
          });
        });

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
        jobsData.forEach((job) => {
          const outputs = parseOutputs(job.outputs);
          outputs.forEach((output) => {
            if (output.endsWith('.h5') || output.endsWith('.hdf5') || output.endsWith('.nxs')) {
              allFiles.push({
                filename: output,
                fullPath: filePathMap.get(output),
                path: undefined,
                errorPath: undefined,
                enabled: false,
                color: DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length],
                selection: 0,
              });
              colorIndex++;
            }
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
  }, [jobId, instrumentName]);

  // Helper to parse outputs
  const parseOutputs = (outputs: string | string[]): string[] => {
    if (typeof outputs === 'string') {
      try {
        // Split by comma for simple comma-separated strings
        return outputs
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } catch {
        return [];
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

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* Left panel - File Tree */}
      <Box
        sx={{
          width: 320,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
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
        {/* Error bar toggle */}
        {linePlotData.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 20,
            }}
          >
            <FormControlLabel
              control={
                <Switch checked={showErrors} onChange={(e) => setShowErrors(e.target.checked)} color="primary" />
              }
              label="Show Error Bars"
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 3,
                borderRadius: 2,
                px: 2,
                py: 1,
                m: 0,
              }}
            />
          </Box>
        )}

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

        <PlotViewer linePlotData={linePlotData} showErrors={showErrors} />
      </Box>
    </Box>
  );
};

export default H5Viewer;
