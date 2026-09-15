import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useId, useState } from 'react';

import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from '../jobs/constants';

type SearchType = 'experiment' | 'filename';

interface JobSearchProps {
  experimentNumber: number | null;
  filename: string | null;
  isSearchActive: boolean;
  onSearch: (experimentNumber: number | null, filename: string | null) => void;
  onClear: () => void;
}

const JobSearch: React.FC<JobSearchProps> = ({ experimentNumber, filename, isSearchActive, onSearch, onClear }) => {
  const theme = useTheme();
  const chrome = getJobTableChromeColors(theme.palette.mode);
  const labelId = useId();
  const [searchType, setSearchType] = useState<SearchType>(filename ? 'filename' : 'experiment');
  const [draft, setDraft] = useState(filename ?? experimentNumber?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filename !== null) setSearchType('filename');
    else if (experimentNumber !== null) setSearchType('experiment');
    setDraft(filename ?? experimentNumber?.toString() ?? '');
    setError(null);
  }, [experimentNumber, filename]);

  const clearSearch = (): void => {
    setDraft('');
    setError(null);
    onClear();
  };

  const applySearch = (event: React.FormEvent): void => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) {
      setDraft('');
      setError(null);
      onSearch(null, null);
      return;
    }
    if (searchType === 'filename') {
      onSearch(null, value);
      return;
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0) {
      setError('Enter a valid experiment number.');
      return;
    }
    setError(null);
    onSearch(number, null);
  };

  return (
    <Box
      component="form"
      aria-label="Search reduction jobs"
      onSubmit={applySearch}
      sx={{ pt: 1.5, borderBottom: `1px solid ${chrome.border}`, flexShrink: 0 }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 1.5 }}>
        <FormControl fullWidth size="small">
          <InputLabel id={labelId}>Search by</InputLabel>
          <Select
            labelId={labelId}
            label="Search by"
            value={searchType}
            sx={{ height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT, fontSize: '0.875rem' }}
            onChange={(event) => {
              setSearchType(event.target.value as SearchType);
              setDraft('');
              setError(null);
            }}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    borderRadius: 0,
                    border: `1px solid ${chrome.border}`,
                    backgroundColor: chrome.surface,
                    backgroundImage: 'none',
                    color: chrome.text,
                    '& .MuiMenuItem-root': {
                      minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                      fontSize: '0.875rem',
                      '&:hover, &.Mui-focusVisible': { backgroundColor: chrome.hover },
                      '&.Mui-selected': { backgroundColor: alpha(chrome.accent, 0.12) },
                      '&.Mui-selected:hover': { backgroundColor: alpha(chrome.accent, 0.18) },
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
          size="small"
          type={searchType === 'experiment' ? 'number' : 'text'}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          error={Boolean(error)}
          sx={{
            minWidth: 0,
            '& .MuiOutlinedInput-root': {
              height: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
              fontSize: '0.875rem',
            },
          }}
          slotProps={{
            htmlInput: {
              'aria-label': searchType === 'experiment' ? 'Experiment number' : 'Run/file',
              ...(searchType === 'experiment' ? { min: 0, step: 1 } : {}),
              autoComplete: 'off',
            },
          }}
        />
      </Box>
      {error && (
        <Typography variant="caption" color="error" role="alert" sx={{ display: 'block', px: 1.5 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', mt: 1.5, borderTop: `1px solid ${chrome.border}` }}>
        <Button
          type="submit"
          size="small"
          variant="text"
          startIcon={<SearchIcon fontSize="small" />}
          sx={{ borderRight: `1px solid ${chrome.border}` }}
        >
          Search
        </Button>
        <Button
          type="button"
          size="small"
          aria-label={searchType === 'experiment' ? 'Clear experiment number' : 'Clear run/file search'}
          onClick={clearSearch}
          disabled={!isSearchActive && experimentNumber === null && filename === null && !draft}
        >
          Clear
        </Button>
      </Box>
    </Box>
  );
};

export default JobSearch;
