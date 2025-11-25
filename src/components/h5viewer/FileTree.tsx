import React, { useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Tooltip,
  FormControl,
  InputLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { FileConfig, Job } from '../../lib/types';

interface FileTreeProps {
  jobs: Job[];
  files: FileConfig[];
  onFileToggle: (index: number) => void;
  onDatasetChange: (index: number, datasetPath: string) => void;
  onSelectionChange: (index: number, selection: number) => void;
  autoSelectPrimary?: boolean;
  onAutoSelectPrimaryChange?: (enabled: boolean) => void;
}

const FileTree: React.FC<FileTreeProps> = ({
  jobs,
  files,
  onFileToggle,
  onDatasetChange,
  onSelectionChange,
  autoSelectPrimary = false,
  onAutoSelectPrimaryChange,
}): JSX.Element => {
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [showEmptyJobs, setShowEmptyJobs] = useState(false);

  console.log('FileTree rendered with files:', files);

  // Helper to find file config by filename
  const getFileConfig = (filename: string): FileConfig | undefined => {
    return files.find((f) => f.filename === filename);
  };

  // Helper to get file index
  const getFileIndex = (filename: string): number => {
    return files.findIndex((f) => f.filename === filename);
  };

  const handleAccordionChange = (jobId: number) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedJobs((prev) => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(jobId);
      } else {
        newSet.delete(jobId);
      }
      return newSet;
    });
  };

  // Parse outputs string to array
  const getJobOutputs = (job: Job): string[] => {
    try {
      if (typeof job.outputs === 'string') {
        return job.outputs
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [];
    } catch {
      return [];
    }
  };

  // Filter jobs based on showEmptyJobs setting
  const jobsWithOutputs = jobs.map((job) => ({
    ...job,
    outputsArray: getJobOutputs(job),
  }));

  const filteredJobs = showEmptyJobs ? jobsWithOutputs : jobsWithOutputs.filter((job) => job.outputsArray.length > 0);
  const emptyJobsCount = jobsWithOutputs.filter((job) => job.outputsArray.length === 0).length;

  return (
    <Box
      sx={{
        height: '100%',
        p: 2,
        overflowY: 'auto',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
          File Tree
        </Typography>

        {/* Settings */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Show empty jobs toggle */}
          {emptyJobsCount > 0 && (
            <FormControlLabel
              control={
                <Checkbox size="small" checked={showEmptyJobs} onChange={(e) => setShowEmptyJobs(e.target.checked)} />
              }
              label={
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  Show empty jobs ({emptyJobsCount})
                </Typography>
              }
              sx={{ m: 0 }}
            />
          )}

          {/* Auto-select primary dataset toggle */}
          {onAutoSelectPrimaryChange && (
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={autoSelectPrimary}
                  onChange={(e) => onAutoSelectPrimaryChange(e.target.checked)}
                />
              }
              label={
                <Tooltip title="Automatically select datasets marked as primary (with 'signal' attribute)" arrow>
                  <Typography variant="caption" sx={{ fontSize: '0.75rem', cursor: 'help' }}>
                    Auto-select primary datasets
                  </Typography>
                </Tooltip>
              }
              sx={{ m: 0 }}
            />
          )}
        </Box>
      </Box>

      {filteredJobs.length === 0 && (
        <Typography variant="body2" align="center" sx={{ mt: 4 }}>
          {jobs.length === 0 ? 'No jobs available' : 'No jobs with files'}
        </Typography>
      )}

      {filteredJobs.map((job) => (
        <Accordion
          key={job.id}
          expanded={expandedJobs.has(job.id)}
          onChange={handleAccordionChange(job.id)}
          sx={{ mb: 1, boxShadow: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} slotProps={{ content: { sx: { maxWidth: '100%' } } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
                <FolderIcon color="primary" fontSize="small" sx={{ flexShrink: 0 }} />
                <Tooltip title={job.run.filename} arrow placement="top">
                  <Typography
                    variant="body2"
                    fontWeight="600"
                    noWrap
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {job.run.filename}
                  </Typography>
                </Tooltip>
                <Chip
                  label={`${job.outputsArray.length} files`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
                />
              </Box>
              <Tooltip title={job.run.title} arrow>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    fontStyle: 'italic',
                    fontSize: '0.7rem',
                    cursor: 'default',
                    display: 'block',
                  }}
                >
                  {job.run.title}
                </Typography>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {job.outputsArray.map((output, outputIndex) => {
                const fileIndex = getFileIndex(output);
                const file = getFileConfig(output);

                if (!file) return null;

                return (
                  <Card
                    key={outputIndex}
                    variant="outlined"
                    sx={{
                      border: file.enabled ? 2 : 1,
                      borderColor: file.enabled ? 'primary.main' : 'divider',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {/* File checkbox */}
                      <FormControlLabel
                        control={
                          <Checkbox size="small" checked={file.enabled} onChange={() => onFileToggle(fileIndex)} />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <InsertDriveFileIcon fontSize="small" color="action" />
                            <Typography
                              variant="body2"
                              sx={{
                                wordBreak: 'break-all',
                                fontSize: '0.8rem',
                              }}
                            >
                              {output}
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                      />

                      {/* File controls - only show if enabled */}
                      {file.enabled && (
                        <Box sx={{ mt: 2, ml: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {/* Dataset selector - dropdown for discovered datasets */}
                          <Box>
                            {file.isDiscovered && file.discoveredDatasets && file.discoveredDatasets.length > 0 ? (
                              // Show dropdown for discovered datasets
                              <FormControl fullWidth size="small">
                                <InputLabel id={`dataset-select-label-${fileIndex}`}>
                                  Dataset ({file.discoveredDatasets.length} found)
                                </InputLabel>
                                <Select
                                  labelId={`dataset-select-label-${fileIndex}`}
                                  value={file.path || ''}
                                  label={`Dataset (${file.discoveredDatasets.length} found)`}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      onDatasetChange(fileIndex, e.target.value);
                                    }
                                  }}
                                  displayEmpty
                                  sx={{
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {!file.path && (
                                    <MenuItem value="" disabled>
                                      <em>Select a dataset</em>
                                    </MenuItem>
                                  )}
                                  {file.discoveredDatasets.map((dataset) => (
                                    <MenuItem
                                      key={dataset.path}
                                      value={dataset.path}
                                      sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        py: 1.5,
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.75rem',
                                          wordBreak: 'break-all',
                                          mb: 0.5,
                                        }}
                                      >
                                        {dataset.path}
                                      </Typography>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          gap: 0.5,
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        {dataset.isPrimary && (
                                          <Chip
                                            label="Primary"
                                            size="small"
                                            color="success"
                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                                          />
                                        )}
                                        <Chip
                                          label={dataset.shape.join(' × ')}
                                          size="small"
                                          sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                        <Chip
                                          label={dataset.is2D ? '2D' : '1D'}
                                          size="small"
                                          color={dataset.is2D ? 'secondary' : 'primary'}
                                          sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                        <Chip
                                          label={dataset.dtype.class}
                                          size="small"
                                          sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                        {dataset.errorPath && (
                                          <Chip
                                            label="Supports error bars"
                                            size="small"
                                            color="info"
                                            sx={{ height: 18, fontSize: '0.65rem' }}
                                          />
                                        )}
                                      </Box>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : file.isDiscovered ? (
                              // Datasets discovered but none found
                              <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                  No numeric datasets found
                                </Typography>
                              </Box>
                            ) : (
                              // Discovering datasets
                              <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                  Discovering datasets...
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* Selection input - only for 2D datasets being sliced to 1D */}
                          {file.path && file.selectedDatasetIs2D && (
                            <Box>
                              <Typography variant="body2" fontWeight="500" sx={{ mb: 1 }}>
                                Slice Index (2D → 1D)
                              </Typography>
                              <TextField
                                type="number"
                                size="small"
                                value={file.selection ?? 0}
                                onChange={(e) => {
                                  onSelectionChange(fileIndex, parseInt(e.target.value) || 0);
                                }}
                                inputProps={{ min: 0 }}
                                placeholder="0"
                                fullWidth
                                sx={{
                                  '& .MuiInputBase-input': {
                                    fontSize: '0.875rem',
                                  },
                                }}
                                helperText="Slice 2D dataset along first dimension"
                              />
                            </Box>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default FileTree;
