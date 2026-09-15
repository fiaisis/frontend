import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Pagination,
  CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';

import FileCard from './FileCard';
import { getViewerControlsSx } from './styles';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

import type { FileConfig, Job } from '../../lib/types';

interface FileTreeProps {
  jobs: Job[];
  openedJob?: Job;
  isLoadingOpenedJob?: boolean;
  files: FileConfig[];
  isLoading?: boolean;
  showEmptyState?: boolean;
  initialSelection?: { jobId: number; filename: string };
  viewTabs?: React.ReactNode;
  searchControls?: React.ReactNode;
  currentPage?: number;
  totalJobs?: number;
  pageSize?: number;
  isPaginationDisabled?: boolean;
  onPageChange?: (page: number) => void;
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
  openedJob,
  isLoadingOpenedJob = false,
  files,
  isLoading = false,
  showEmptyState = true,
  initialSelection,
  viewTabs,
  searchControls,
  currentPage = 0,
  totalJobs = 0,
  pageSize = 10,
  isPaginationDisabled = false,
  onPageChange,
  onFileToggle,
  onDatasetChange,
  onSelectionChange,
  autoSelectPrimary = false,
  onAutoSelectPrimaryChange,
  activeViewerTab = '1d',
  selected2DFile = null,
  onSelect2DFile,
}): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [showEmptyJobs, setShowEmptyJobs] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'chips'>('text');

  const initialJobId = initialSelection?.jobId;
  const initialFilename = initialSelection?.filename;
  useEffect(() => {
    if (initialJobId !== undefined) {
      setExpandedJobs((previous) => new Set(previous).add(initialJobId));
    }
  }, [initialJobId, initialFilename]);

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

  const pageJobs = isLoading
    ? []
    : showEmptyJobs
      ? jobsWithOutputs
      : jobsWithOutputs.filter((job) => job.outputsArray.length > 0);
  const filteredJobs = pageJobs.filter((job) => job.id !== openedJob?.id);
  const emptyJobsCount = jobsWithOutputs.filter((job) => job.outputsArray.length === 0).length;
  const pageCount = pageSize > 0 ? Math.ceil(totalJobs / pageSize) : 0;
  const showPagination = Boolean(onPageChange && totalJobs > pageSize && pageCount > 1);
  const showJobControls =
    showPagination || emptyJobsCount > 0 || Boolean(onAutoSelectPrimaryChange && (jobs.length > 0 || openedJob));
  const firstVisibleJob = totalJobs === 0 ? 0 : currentPage * pageSize + 1;
  const lastVisibleJob = Math.min((currentPage + 1) * pageSize, totalJobs);

  const renderJob = (job: Job): JSX.Element => {
    const outputs = getJobOutputs(job);
    return (
      <Accordion
        square
        disableGutters
        elevation={0}
        key={job.id}
        expanded={expandedJobs.has(job.id)}
        onChange={handleAccordionChange(job.id)}
        sx={{
          borderBottom: `1px solid ${viewerChrome.border}`,
          backgroundColor: viewerChrome.surface,
          color: viewerChrome.text,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon fontSize="small" />}
          sx={{
            minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
            backgroundColor: viewerChrome.header,
            '&:hover, &.Mui-focusVisible': { backgroundColor: viewerChrome.hover },
            '&:focus-visible': { outline: `2px solid ${viewerChrome.accent}`, outlineOffset: -2 },
            pl: 1.5,
            pr: 1.25,
            py: 0.25,
            '&.Mui-expanded': {
              minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
              borderBottom: `1px solid ${viewerChrome.border}`,
            },
            '& .MuiAccordionSummary-content': {
              minWidth: 0,
              my: 0.5,
            },
            '& .MuiAccordionSummary-content.Mui-expanded': {
              my: 0.5,
            },
            '& .MuiAccordionSummary-expandIconWrapper': {
              ml: 1,
              color: viewerChrome.text,
            },
          }}
          slotProps={{ content: { sx: { maxWidth: '100%' } } }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
              <FolderIcon fontSize="small" sx={{ flexShrink: 0, color: viewerChrome.accent }} />
              <Typography
                variant="body2"
                noWrap
                sx={{
                  fontWeight: '600',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {job.run.filename}
              </Typography>
              <Chip
                label={`${outputs.length} files`}
                size="small"
                sx={{ height: 18, fontSize: '0.65rem', flexShrink: 0 }}
              />
            </Box>
            <Typography
              variant="caption"
              noWrap
              sx={{
                color: alpha(viewerChrome.text, 0.75),
                fontSize: '0.68rem',
                display: 'block',
              }}
            >
              {job.run.title}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0.75 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {outputs.map((output, outputIndex) => {
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
    );
  };

  return (
    <Box
      sx={{
        ...getViewerControlsSx(theme),
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {viewTabs}
      {searchControls}

      {showJobControls && (
        <Box
          sx={{
            flexShrink: 0,
            px: 1.5,
            py: 1,
            borderBottom: `1px solid ${viewerChrome.border}`,
            backgroundColor: viewerChrome.header,
          }}
        >
          {showPagination && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <Typography variant="caption" sx={{ color: alpha(viewerChrome.text, 0.75) }}>
                Showing {firstVisibleJob}-{lastVisibleJob} of {totalJobs} jobs
              </Typography>
              <Pagination
                count={pageCount}
                page={Math.min(currentPage + 1, pageCount)}
                onChange={(_event, nextPage) => {
                  onPageChange?.(nextPage - 1);
                }}
                size="small"
                disabled={isPaginationDisabled}
                siblingCount={0}
                boundaryCount={1}
                aria-label="Experiment viewer job pages"
                sx={{
                  '& .MuiPagination-ul': {
                    justifyContent: 'center',
                  },
                  '& .MuiPaginationItem-root': {
                    minWidth: 28,
                    height: 28,
                    fontSize: '0.75rem',
                    borderRadius: 0,
                    color: viewerChrome.text,
                    '&:hover': { backgroundColor: viewerChrome.hover },
                    '&.Mui-selected': {
                      color: viewerChrome.accent,
                      backgroundColor: alpha(viewerChrome.accent, 0.12),
                      boxShadow: `inset 0 -2px 0 ${viewerChrome.accent}`,
                    },
                    '&.Mui-selected:hover': { backgroundColor: alpha(viewerChrome.accent, 0.18) },
                  },
                }}
              />
            </Box>
          )}

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
            {onAutoSelectPrimaryChange && (jobs.length > 0 || openedJob) && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={autoSelectPrimary}
                    onChange={(e) => onAutoSelectPrimaryChange(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    Auto-select primary datasets
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            )}
          </Box>
        </Box>
      )}

      <Box
        aria-busy={isLoading}
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: `${viewerChrome.border} ${viewerChrome.header}`,
        }}
      >
        {(openedJob || isLoadingOpenedJob) && (
          <Box component="section" aria-label="Opened reduction">
            <Typography variant="subtitle2" sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${viewerChrome.border}` }}>
              Opened reduction
            </Typography>
            {isLoadingOpenedJob && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} aria-label="Loading opened reduction" />
              </Box>
            )}
            {openedJob && renderJob(openedJob)}
          </Box>
        )}

        {(openedJob || isLoadingOpenedJob) && (
          <Typography variant="subtitle2" sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${viewerChrome.border}` }}>
            Experiment reductions
          </Typography>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 96 }}>
            <CircularProgress size={32} aria-label="Loading jobs" />
          </Box>
        )}

        {!isLoading && showEmptyState && pageJobs.length === 0 && (
          <Typography variant="body2" align="center" sx={{ p: 3, color: alpha(viewerChrome.text, 0.75) }}>
            {jobs.length === 0 ? 'No jobs listed' : 'No jobs with files'}
          </Typography>
        )}

        {filteredJobs.map(renderJob)}
      </Box>
    </Box>
  );
};

export default FileTree;
