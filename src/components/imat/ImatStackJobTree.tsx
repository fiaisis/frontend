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
} from '@mui/material';
import axios from 'axios';
import React from 'react';

import { fiaApi } from '../../lib/api';
import { formatUtcForLocale } from '../../lib/timezone';

import type { Job, JobQueryFilters } from '../../lib/types';

const PAGE_SIZE = 25;
const PAGE_REQUEST_SIZE = PAGE_SIZE + 1;

type SearchType = 'experiment' | 'filename';

type ActiveSearch = {
  type: SearchType;
  value: string;
};

type JobGroup = {
  experimentNumber: number | null;
  key: string;
  jobs: Job[];
  latestRunStart: number;
};

export type ImatStackJobTreeProps = {
  autoSelect: boolean;
  selectedJobId: number | null;
  selectedJob: Job | null;
  onSelectJob: (job: Job, replace?: boolean) => void;
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

const ImatStackJobTree: React.FC<ImatStackJobTreeProps> = ({ autoSelect, selectedJobId, selectedJob, onSelectJob }) => {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
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

    const fetchFirstPage = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      setJobs([]);
      setOffset(0);
      setHasMore(false);

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
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        setError('Unable to load IMAT stacks.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchFirstPage();
    return () => controller.abort();
  }, [activeSearch, retryKey]);

  React.useEffect(() => {
    if (autoSelect && !loading && selectedJobId === null && jobs.length > 0) {
      onSelectJob(jobs[0], true);
    }
  }, [autoSelect, jobs, loading, onSelectJob, selectedJobId]);

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
      setSearchError('Enter a search value.');
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
      if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
      setError('Unable to load more IMAT stacks.');
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  return (
    <Paper
      component="aside"
      aria-label="IMAT stack jobs"
      elevation={0}
      sx={{
        width: { xs: '100%', md: 300 },
        minWidth: { md: 300 },
        height: { xs: 320, md: 'auto' },
        maxHeight: { xs: 320, md: 'none' },
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box component="form" onSubmit={handleSearch} sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
          Stacks
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 112 }}>
            <InputLabel id="imat-stack-search-type-label">Search by</InputLabel>
            <Select
              labelId="imat-stack-search-type-label"
              value={searchType}
              label="Search by"
              onChange={(event) => {
                setSearchType(event.target.value as SearchType);
                setSearchError(null);
              }}
            >
              <MenuItem value="experiment">Experiment</MenuItem>
              <MenuItem value="filename">Run/file</MenuItem>
            </Select>
          </FormControl>
          <TextField
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            size="small"
            label={searchType === 'experiment' ? 'Number' : 'Name'}
            error={Boolean(searchError)}
            inputProps={{ 'aria-label': 'Stack search value' }}
            sx={{ minWidth: 0, flex: 1 }}
          />
        </Box>
        {searchError && (
          <Typography variant="caption" color="error" role="alert">
            {searchError}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button type="submit" size="small" variant="contained" startIcon={<Search />} disabled={loading}>
            Search
          </Button>
          <Button size="small" onClick={handleClearSearch} disabled={loading || (!activeSearch && !searchValue)}>
            Clear
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {activeSearch ? 'No successful IMAT stacks match this search.' : 'No successful IMAT stacks found.'}
          </Typography>
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
                    sx={{ py: 0.75, px: 1.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {isExpanded ? <FolderOpen fontSize="small" color="primary" /> : <Folder fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={groupLabel}
                      secondary={`${group.jobs.length} ${group.jobs.length === 1 ? 'stack' : 'stacks'}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
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
                            sx={{ pl: 6.5, pr: 1.5, py: 0.75, alignItems: 'flex-start' }}
                          >
                            <ListItemIcon sx={{ minWidth: 30, mt: 0.25 }}>
                              <ImageIcon fontSize="small" color={isSelected ? 'primary' : 'inherit'} />
                            </ListItemIcon>
                            <ListItemText
                              primary={getFilename(job)}
                              secondary={secondaryParts.join(' · ') || `Job ${job.id}`}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: isSelected ? 600 : 400,
                                noWrap: true,
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                noWrap: true,
                                title: secondaryParts.join(' · '),
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
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          {error && jobs.length > 0 && (
            <Typography variant="caption" color="error" role="alert" sx={{ display: 'block', mb: 0.5 }}>
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
