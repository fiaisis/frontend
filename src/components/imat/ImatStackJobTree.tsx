import ChevronRight from '@mui/icons-material/ChevronRight';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Folder from '@mui/icons-material/Folder';
import FolderOpen from '@mui/icons-material/FolderOpen';
import ImageIcon from '@mui/icons-material/Image';
import Search from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import axios from 'axios';
import React from 'react';

import { fiaApi } from '../../lib/api';
import { formatUtcForLocale } from '../../lib/timezone';
import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';
import { viewerSidebarSx } from '../viewer/layout';

import type { Job, JobQueryFilters } from '../../lib/types';

const PAGE_SIZE = 25;
const PAGE_REQUEST_SIZE = PAGE_SIZE + 1;

type SearchType = 'experiment' | 'filename';

type ActiveSearch = {
  type: SearchType | 'all';
  value: string;
};

type JobGroup = {
  experimentNumber: number | null;
  key: string;
  jobs: Job[];
  latestRunStart: number;
};

export type ImatStackJobTreeProps = {
  selectedJobId: number | null;
  selectedJob: Job | null;
  onSelectJob: (job: Job) => void;
  onClear: () => void;
};

const getRunStartTime = (job: Job): number => {
  const timestamp = Date.parse(job.run?.run_start || job.start || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getFilename = (job: Job): string => {
  const filename = job.run?.filename?.split(/[\\/]/).pop() || '';
  return filename.replace(/\.[^.]+$/, '') || `Job ${job.id}`;
};

const isSuccessfulImatJob = (job: Job): boolean =>
  job.state === 'SUCCESSFUL' && job.run?.instrument_name?.toUpperCase() === 'IMAT';

const groupJobs = (jobs: Job[]): JobGroup[] => {
  const groups = new Map<string, JobGroup>();

  [...jobs]
    .filter(isSuccessfulImatJob)
    .sort((left, right) => getRunStartTime(right) - getRunStartTime(left))
    .forEach((job) => {
      const experimentNumber = job.run?.experiment_number ?? null;
      const key = experimentNumber === null ? 'unknown' : experimentNumber.toString();
      const existingGroup = groups.get(key);

      if (existingGroup) {
        existingGroup.jobs.push(job);
        existingGroup.latestRunStart = Math.max(existingGroup.latestRunStart, getRunStartTime(job));
      } else {
        groups.set(key, {
          experimentNumber,
          key,
          jobs: [job],
          latestRunStart: getRunStartTime(job),
        });
      }
    });

  return Array.from(groups.values()).sort((left, right) => right.latestRunStart - left.latestRunStart);
};

const getFilters = (activeSearch: ActiveSearch | null): JobQueryFilters => {
  const filters: JobQueryFilters = { job_state_in: ['SUCCESSFUL'] };

  if (activeSearch?.type === 'experiment') {
    filters.experiment_number_in = [Number(activeSearch.value)];
  } else if (activeSearch?.type === 'filename') {
    filters.filename = activeSearch.value;
  }

  return filters;
};

const mergeUniqueJobs = (currentJobs: Job[], nextJobs: Job[]): Job[] => {
  const jobsById = new Map(currentJobs.map((job) => [job.id, job]));
  nextJobs.forEach((job) => jobsById.set(job.id, job));
  return Array.from(jobsById.values()).sort((left, right) => getRunStartTime(right) - getRunStartTime(left));
};

const ImatStackJobTree: React.FC<ImatStackJobTreeProps> = ({ selectedJobId, selectedJob, onSelectJob, onClear }) => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);
  const [searchType, setSearchType] = React.useState<SearchType>('experiment');
  const [searchValue, setSearchValue] = React.useState('');
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [activeSearch, setActiveSearch] = React.useState<ActiveSearch | null>(null);
  const [expandedExperiments, setExpandedExperiments] = React.useState<Set<string>>(new Set());
  const loadMoreControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    setLoadingMore(false);
    setError(null);
    setJobs([]);
    setOffset(0);
    setHasMore(false);

    if (!activeSearch) {
      setLoading(false);
      return () => controller.abort();
    }

    const fetchFirstPage = async (): Promise<void> => {
      setLoading(true);

      try {
        const response = await fiaApi.get<Job[]>('/instrument/IMAT/jobs', {
          signal: controller.signal,
          params: {
            limit: PAGE_REQUEST_SIZE,
            offset: 0,
            order_by: 'run_start',
            order_direction: 'desc',
            include_run: true,
            filters: JSON.stringify(getFilters(activeSearch)),
          },
        });
        if (controller.signal.aborted) return;
        const visibleJobs = response.data.filter(isSuccessfulImatJob).slice(0, PAGE_SIZE);
        setJobs(visibleJobs);
        setOffset(visibleJobs.length);
        setHasMore(response.data.length > PAGE_SIZE);
      } catch (err: unknown) {
        if (controller.signal.aborted || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return;
        setError('Unable to load IMAT stacks.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchFirstPage();
    return () => controller.abort();
  }, [activeSearch, retryKey]);

  React.useEffect(() => {
    if (!selectedJob) return;
    const experimentKey = selectedJob.run?.experiment_number?.toString() ?? 'unknown';
    setExpandedExperiments((current) => {
      if (current.has(experimentKey)) return current;
      const next = new Set(current);
      next.add(experimentKey);
      return next;
    });
  }, [selectedJob]);

  React.useEffect(
    () => () => {
      loadMoreControllerRef.current?.abort();
    },
    []
  );

  const displayedJobs = React.useMemo(() => {
    if (!selectedJob || jobs.some((job) => job.id === selectedJob.id)) return jobs;
    return mergeUniqueJobs(jobs, [selectedJob]);
  }, [jobs, selectedJob]);

  const jobGroups = React.useMemo(() => groupJobs(displayedJobs), [displayedJobs]);

  const handleToggleExperiment = (experimentKey: string): void => {
    setExpandedExperiments((current) => {
      const next = new Set(current);
      if (next.has(experimentKey)) {
        next.delete(experimentKey);
      } else {
        next.add(experimentKey);
      }
      return next;
    });
  };

  const handleSearch = (event: React.FormEvent): void => {
    event.preventDefault();
    const value = searchValue.trim();

    if (!value) {
      setSearchError(null);
      setActiveSearch({ type: 'all', value: '' });
      return;
    }

    const experimentNumber = Number(value);
    if (
      searchType === 'experiment' &&
      (!/^\d+$/.test(value) || !Number.isSafeInteger(experimentNumber) || experimentNumber <= 0)
    ) {
      setSearchError('Enter a valid experiment number.');
      return;
    }

    setSearchError(null);
    setActiveSearch({ type: searchType, value });
  };

  const handleClearSearch = (): void => {
    setSearchValue('');
    setSearchError(null);
    setActiveSearch(null);
    setExpandedExperiments(new Set());
    onClear();
  };

  const handleLoadMore = async (): Promise<void> => {
    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    setLoadingMore(true);
    setError(null);

    try {
      const response = await fiaApi.get<Job[]>('/instrument/IMAT/jobs', {
        signal: controller.signal,
        params: {
          limit: PAGE_REQUEST_SIZE,
          offset,
          order_by: 'run_start',
          order_direction: 'desc',
          include_run: true,
          filters: JSON.stringify(getFilters(activeSearch)),
        },
      });
      if (controller.signal.aborted) return;
      const visibleJobs = response.data.filter(isSuccessfulImatJob).slice(0, PAGE_SIZE);
      setJobs((current) => mergeUniqueJobs(current, visibleJobs));
      setOffset((current) => current + visibleJobs.length);
      setHasMore(response.data.length > PAGE_SIZE);
    } catch (err: unknown) {
      if (controller.signal.aborted || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')) return;
      setError('Unable to load more IMAT stacks.');
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  return (
    <Paper
      component="aside"
      aria-label="IMAT stack jobs"
      square
      elevation={0}
      sx={{
        ...viewerSidebarSx,
        height: { xs: 372, md: 'auto' },
        maxHeight: { xs: 372, md: 'none' },
        border: `1px solid ${viewerChrome.border}`,
        backgroundColor: viewerChrome.surface,
        color: viewerChrome.text,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        '& .MuiButton-root': {
          minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
          borderRadius: 0,
          color: viewerChrome.accent,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { backgroundColor: viewerChrome.hover },
          '&:focus-visible': { outline: `2px solid ${viewerChrome.accent}`, outlineOffset: -2 },
          '&.Mui-disabled': { color: alpha(viewerChrome.text, 0.42) },
        },
        '& .MuiOutlinedInput-root': {
          borderRadius: 0,
          minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
          backgroundColor: viewerChrome.surface,
          color: viewerChrome.text,
          fontSize: '0.875rem',
          '&:not(.Mui-error) fieldset': { borderColor: viewerChrome.border },
          '&:not(.Mui-error):hover fieldset, &.Mui-focused:not(.Mui-error) fieldset': {
            borderColor: viewerChrome.accent,
          },
        },
        '& .MuiInputLabel-root:not(.Mui-error)': {
          color: alpha(viewerChrome.text, 0.75),
          '&.Mui-focused': { color: viewerChrome.accent },
        },
        '& .MuiSelect-icon, & .MuiCircularProgress-root': { color: viewerChrome.accent },
        '& .MuiListItemText-secondary': { color: alpha(viewerChrome.text, 0.75) },
        '& .MuiAlert-root': { borderRadius: 0 },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSearch}
        sx={{ pt: 1.5, borderBottom: `1px solid ${viewerChrome.border}`, flexShrink: 0 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 1.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="imat-stack-search-type-label">Search by</InputLabel>
            <Select
              labelId="imat-stack-search-type-label"
              value={searchType}
              label="Search by"
              onChange={(event) => {
                setSearchType(event.target.value as SearchType);
                setSearchValue('');
                setSearchError(null);
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      borderRadius: 0,
                      border: `1px solid ${viewerChrome.border}`,
                      backgroundColor: viewerChrome.surface,
                      backgroundImage: 'none',
                      color: viewerChrome.text,
                      '& .MuiMenuItem-root': {
                        minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                        fontSize: '0.875rem',
                        '&:hover, &.Mui-focusVisible': { backgroundColor: viewerChrome.hover },
                        '&.Mui-selected': { backgroundColor: alpha(viewerChrome.accent, 0.12) },
                        '&.Mui-selected:hover': { backgroundColor: alpha(viewerChrome.accent, 0.18) },
                      },
                    },
                  },
                },
              }}
            >
              <MenuItem value="experiment">Experiment number</MenuItem>
              <MenuItem value="filename">Run/file</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            autoComplete="off"
            type={searchType === 'experiment' ? 'number' : 'text'}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            size="small"
            error={Boolean(searchError)}
            sx={{ minWidth: 0 }}
            slotProps={{
              htmlInput: {
                'aria-label': 'Stack search value',
                ...(searchType === 'experiment' ? { min: 1, step: 1 } : {}),
              },
            }}
          />
        </Box>
        {searchError && (
          <Typography variant="caption" color="error" role="alert" sx={{ display: 'block', px: 1.5 }}>
            {searchError}
          </Typography>
        )}
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
            startIcon={<Search />}
            disabled={loading}
            sx={{ borderRight: `1px solid ${viewerChrome.border}` }}
          >
            Search
          </Button>
          <Button
            size="small"
            onClick={handleClearSearch}
            disabled={!activeSearch && !searchValue && selectedJobId === null && !selectedJob}
          >
            Clear
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: `${viewerChrome.border} ${viewerChrome.header}`,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} aria-label="Loading IMAT stacks" />
          </Box>
        ) : error && jobs.length === 0 ? (
          <Box sx={{ p: 1.5 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => setRetryKey((current) => current + 1)}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        ) : jobGroups.length === 0 ? (
          activeSearch ? (
            <Typography variant="body2" sx={{ p: 2, color: alpha(viewerChrome.text, 0.75) }}>
              {activeSearch.type === 'all'
                ? 'No successful IMAT stacks found.'
                : 'No successful IMAT stacks match this search.'}
            </Typography>
          ) : null
        ) : (
          <List component="nav" aria-label="Successful IMAT stacks" disablePadding>
            {jobGroups.map((group) => {
              const isExpanded = expandedExperiments.has(group.key);
              const groupLabel =
                group.experimentNumber === null ? 'Unknown experiment' : `Experiment ${group.experimentNumber}`;

              return (
                <React.Fragment key={group.key}>
                  <ListItemButton
                    onClick={() => handleToggleExperiment(group.key)}
                    aria-expanded={isExpanded}
                    aria-controls={`imat-experiment-${group.key}`}
                    sx={{
                      py: 0.75,
                      px: 1.5,
                      minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                      borderBottom: `1px solid ${viewerChrome.border}`,
                      backgroundColor: viewerChrome.header,
                      '&:hover, &.Mui-focusVisible': { backgroundColor: viewerChrome.hover },
                      '&:focus-visible': { outline: `2px solid ${viewerChrome.accent}`, outlineOffset: -2 },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28, color: viewerChrome.text }}>
                      {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 28, color: viewerChrome.accent }}>
                      {isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={groupLabel}
                      secondary={`${group.jobs.length} ${group.jobs.length === 1 ? 'stack' : 'stacks'}`}
                      slotProps={{
                        primary: { variant: 'body2', noWrap: true, sx: { fontWeight: 600 } },
                      }}
                    />
                  </ListItemButton>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List id={`imat-experiment-${group.key}`} component="div" disablePadding>
                      {group.jobs.map((job) => {
                        const isSelected = job.id === selectedJobId;
                        const secondaryParts = [formatUtcForLocale(job.run?.run_start), job.run?.title || ''].filter(
                          Boolean
                        );

                        return (
                          <ListItemButton
                            key={job.id}
                            selected={isSelected}
                            aria-current={isSelected ? 'true' : undefined}
                            onClick={() => onSelectJob(job)}
                            sx={{
                              pl: 5,
                              pr: 1.5,
                              py: 0.75,
                              alignItems: 'flex-start',
                              borderBottom: `1px solid ${viewerChrome.border}`,
                              '&:hover, &.Mui-focusVisible': { backgroundColor: viewerChrome.hover },
                              '&:focus-visible': { outline: `2px solid ${viewerChrome.accent}`, outlineOffset: -2 },
                              '&.Mui-selected': {
                                backgroundColor: alpha(viewerChrome.accent, 0.12),
                                color: viewerChrome.accent,
                                boxShadow: `inset 3px 0 0 ${viewerChrome.accent}`,
                              },
                              '&.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
                                backgroundColor: alpha(viewerChrome.accent, 0.18),
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 28,
                                mt: 0.25,
                                color: isSelected ? viewerChrome.accent : viewerChrome.text,
                              }}
                            >
                              <ImageIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={getFilename(job)}
                              secondary={secondaryParts.join(' · ') || `Job ${job.id}`}
                              slotProps={{
                                primary: {
                                  variant: 'body2',
                                  sx: { fontWeight: isSelected ? 600 : 400 },
                                  noWrap: true,
                                },

                                secondary: {
                                  variant: 'caption',
                                  noWrap: true,
                                  title: secondaryParts.join(' · '),
                                },
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      {(hasMore || loadingMore || (error && jobs.length > 0)) && (
        <Box
          sx={{ borderTop: `1px solid ${viewerChrome.border}`, backgroundColor: viewerChrome.header, flexShrink: 0 }}
        >
          {error && jobs.length > 0 && (
            <Typography variant="caption" color="error" role="alert" sx={{ display: 'block', p: 1 }}>
              {error}
            </Typography>
          )}
          <Button fullWidth size="small" onClick={() => void handleLoadMore()} disabled={loadingMore || !hasMore}>
            {loadingMore ? <CircularProgress size={20} aria-label="Loading more IMAT stacks" /> : 'Load more'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default ImatStackJobTree;
