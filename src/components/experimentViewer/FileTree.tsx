import React, { useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FileCard from './FileCard';
import type { FileConfig, Job } from '../../lib/types';

interface FileTreeProps {
  jobs: Job[];
  files: FileConfig[];
  onFileToggle: (index: number) => void;
  onDatasetChange: (index: number, datasetPath: string) => void;
  onSelectionChange: (index: number, selections: number[]) => void;
  autoSelectPrimary?: boolean;
  onAutoSelectPrimaryChange?: (enabled: boolean) => void;
  activeViewerTab?: '1d' | '2d';
  selected2DFile?: string | null;
  onSelect2DFile?: (filename: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({
  jobs,
  files,
  onFileToggle,
  onDatasetChange,
  onSelectionChange,
  autoSelectPrimary = false,
  onAutoSelectPrimaryChange,
  activeViewerTab = '1d',
  selected2DFile = null,
  onSelect2DFile,
}): JSX.Element => {
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [showEmptyJobs, setShowEmptyJobs] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'chips'>('text');

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
                  <FileCard
                    key={outputIndex}
                    file={file}
                    fileIndex={fileIndex}
                    filename={output}
                    activeViewerTab={activeViewerTab}
                    selected2DFile={selected2DFile}
                    inputMode={inputMode}
                    onInputModeChange={setInputMode}
                    onFileToggle={onFileToggle}
                    onDatasetChange={onDatasetChange}
                    onSelectionChange={onSelectionChange}
                    onSelect2DFile={onSelect2DFile}
                  />
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
