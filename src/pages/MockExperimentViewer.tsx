import '@h5web/lib/styles.css';
import React, { useState } from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';
import FileTree from '../components/experimentViewer/FileTree';
import PlotViewer from '../components/experimentViewer/Graph';
import ViewerTabs from '../components/experimentViewer/ViewerTabs';
import ExperimentSearch from '../components/experimentViewer/ExperimentSearch';
import NavArrows from '../components/navigation/NavArrows';
import type { FileConfig, Job } from '../lib/types';
import {
  buildMockFiles,
  buildMockLinePlotData,
  DEFAULT_MOCK_SEARCH,
  getDefaultMock2DFile,
  getMock2DPreview,
  getMockDatasetSelection,
  getMockJobs,
} from '../mock/experimentViewerMockData';

const initialJobs = getMockJobs(
  DEFAULT_MOCK_SEARCH.instrument,
  DEFAULT_MOCK_SEARCH.experimentNumber,
  DEFAULT_MOCK_SEARCH.limit
);
const initialFiles = buildMockFiles(initialJobs);
const initialSelected2DFile = getDefaultMock2DFile(initialJobs);

function getHeatmapColor(value: number): string {
  const hue = 210 - value * 165;
  const saturation = 76;
  const lightness = 22 + value * 56;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const EmptyViewerState: React.FC<{ description: string; title: string }> = ({ description, title }): JSX.Element => (
  <Box
    sx={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
    }}
  >
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.disabled">
        {description}
      </Typography>
    </Box>
  </Box>
);

const Mock2DViewer: React.FC<{ filename: string | null }> = ({ filename }): JSX.Element => {
  if (!filename) {
    return <EmptyViewerState title="Select a file to view 2D data" description="Choose a file from the File tree" />;
  }

  const preview = getMock2DPreview(filename);

  if (!preview) {
    return (
      <EmptyViewerState
        title="No 2D dataset available"
        description="Choose a file with detector image data from the File tree"
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {preview.filename}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={preview.instrumentName} size="small" color="primary" />
          <Chip label={`Exp ${preview.experimentNumber}`} size="small" />
          <Chip label={preview.datasetPath} size="small" />
          <Chip label={preview.shape.join(' x ')} size="small" />
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper
          variant="outlined"
          sx={{
            width: 'min(100%, 960px)',
            p: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: 2, alignItems: 'stretch' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                detector index
              </Typography>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  low q
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  high q
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${preview.columns}, minmax(0, 1fr))`,
                  gap: '2px',
                  p: '2px',
                  borderRadius: 1,
                  bgcolor: 'divider',
                  boxShadow: 1,
                }}
              >
                {preview.values.map((value, index) => (
                  <Box
                    key={`${preview.filename}-${index}`}
                    sx={{
                      aspectRatio: '1 / 1',
                      borderRadius: '1px',
                      bgcolor: getHeatmapColor(value),
                    }}
                  />
                ))}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                time-of-flight bins
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

const MockExperimentViewer: React.FC = (): JSX.Element => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [files, setFiles] = useState<FileConfig[]>(initialFiles);
  const [showErrors, setShowErrors] = useState(false);
  const [autoSelectPrimary, setAutoSelectPrimary] = useState(true);
  const [activeViewerTab, setActiveViewerTab] = useState<'1d' | '2d'>('1d');
  const [selected2DFile, setSelected2DFile] = useState<string | null>(initialSelected2DFile);
  const [searchInstrument, setSearchInstrument] = useState<string | null>(DEFAULT_MOCK_SEARCH.instrument);
  const [searchExperimentNumber, setSearchExperimentNumber] = useState<number | null>(
    DEFAULT_MOCK_SEARCH.experimentNumber
  );
  const [searchLimit, setSearchLimit] = useState<number>(DEFAULT_MOCK_SEARCH.limit);
  const [isSearchActive, setIsSearchActive] = useState(true);

  const linePlotData = buildMockLinePlotData(files);

  const applyResults = (nextJobs: Job[]): void => {
    setJobs(nextJobs);
    setFiles(buildMockFiles(nextJobs));
    setSelected2DFile(getDefaultMock2DFile(nextJobs));
  };

  const handleSearch = (instrument: string | null, experimentNumber: number | null, limit: number): void => {
    setSearchInstrument(instrument);
    setSearchExperimentNumber(experimentNumber);
    setSearchLimit(limit);
    setIsSearchActive(true);
    applyResults(getMockJobs(instrument, experimentNumber, limit));
  };

  const handleClearSearch = (): void => {
    setSearchInstrument(null);
    setSearchExperimentNumber(null);
    setSearchLimit(DEFAULT_MOCK_SEARCH.limit);
    setIsSearchActive(false);
    setJobs([]);
    setFiles([]);
    setSelected2DFile(null);
  };

  const handleFileToggle = (index: number): void => {
    setFiles((prevFiles) =>
      prevFiles.map((file, fileIndex) => {
        if (fileIndex !== index) {
          return file;
        }

        const nextEnabled = !file.enabled;

        if (!nextEnabled) {
          return {
            ...file,
            enabled: false,
          };
        }

        if (file.path) {
          return {
            ...file,
            enabled: true,
          };
        }

        const defaultSelection = getMockDatasetSelection(file.filename, autoSelectPrimary);

        return {
          ...file,
          enabled: true,
          path: defaultSelection?.path,
          errorPath: defaultSelection?.errorPath,
          selectedDatasetIs2D: defaultSelection?.is2D,
          selection: defaultSelection?.is2D ? defaultSelection.defaultSelection : [],
        };
      })
    );
  };

  const handleDatasetChange = (index: number, datasetPath: string): void => {
    setFiles((prevFiles) =>
      prevFiles.map((file, fileIndex) => {
        if (fileIndex !== index || !file.discoveredDatasets) {
          return file;
        }

        const selectedDataset = file.discoveredDatasets.find((dataset) => dataset.path === datasetPath);

        if (!selectedDataset) {
          return file;
        }

        return {
          ...file,
          path: selectedDataset.path,
          errorPath: selectedDataset.errorPath,
          selectedDatasetIs2D: selectedDataset.is2D,
          selection: [],
        };
      })
    );
  };

  const handleSelectionChange = (index: number, selections: number[]): void => {
    setFiles((prevFiles) =>
      prevFiles.map((file, fileIndex) => (fileIndex === index ? { ...file, selection: selections } : file))
    );
  };

  return (
    <>
      <NavArrows />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <ExperimentSearch
            onSearch={handleSearch}
            onClear={handleClearSearch}
            initialInstrument={DEFAULT_MOCK_SEARCH.instrument || undefined}
            initialExperimentNumber={DEFAULT_MOCK_SEARCH.experimentNumber || undefined}
            isLoading={false}
            isSearchActive={isSearchActive}
          />
        </Box>

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {!isSearchActive && (
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
                  Search for HDF5 data
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Enter an instrument and/or experiment number above to browse the experiment viewer layout.
                </Typography>
              </Box>
            </Box>
          )}

          {isSearchActive && jobs.length === 0 && (
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
                  No jobs found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {searchInstrument && `Instrument: ${searchInstrument}`}
                  {searchInstrument && searchExperimentNumber && ' | '}
                  {searchExperimentNumber && `Experiment: ${searchExperimentNumber}`}
                  {!searchInstrument && !searchExperimentNumber && `Limit: ${searchLimit}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search criteria or clearing the search to start over.
                </Typography>
              </Box>
            </Box>
          )}

          {isSearchActive && jobs.length > 0 && (
            <>
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
                <ViewerTabs activeTab={activeViewerTab} onTabChange={setActiveViewerTab} />
                <FileTree
                  jobs={jobs}
                  files={files}
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

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {activeViewerTab === '1d' ? (
                  <PlotViewer linePlotData={linePlotData} showErrors={showErrors} onShowErrorsChange={setShowErrors} />
                ) : (
                  <Mock2DViewer filename={selected2DFile} />
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

export default MockExperimentViewer;
