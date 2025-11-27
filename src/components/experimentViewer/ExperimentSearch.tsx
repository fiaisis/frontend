import React, { useState } from 'react';
import { Box, TextField, Button, Paper, Autocomplete, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { instruments } from '../../lib/instrumentData';

interface ExperimentSearchProps {
  onSearch: (instrumentName: string | null, experimentNumber: number | null) => void;
  onClear: () => void;
  initialInstrument?: string;
  initialExperimentNumber?: number;
  isLoading?: boolean;
  isSearchActive?: boolean;
}

const ExperimentSearch: React.FC<ExperimentSearchProps> = ({
  onSearch,
  onClear,
  initialInstrument,
  initialExperimentNumber,
  isLoading = false,
  isSearchActive = false,
}): JSX.Element => {
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(initialInstrument || null);
  const [experimentNumber, setExperimentNumber] = useState<string>(
    initialExperimentNumber ? initialExperimentNumber.toString() : ''
  );

  const handleSearch = (): void => {
    const expNum = experimentNumber.trim() ? parseInt(experimentNumber) : null;
    onSearch(selectedInstrument, expNum);
  };

  const handleClear = (): void => {
    setSelectedInstrument(null);
    setExperimentNumber('');
    onClear();
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Get instrument names for autocomplete
  const instrumentNames = instruments.map((instrument) => instrument.name);

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ mr: 1 }}>
          Search for Jobs:
        </Typography>

        <Autocomplete
          value={selectedInstrument}
          onChange={(_, newValue) => setSelectedInstrument(newValue)}
          options={instrumentNames}
          sx={{ width: 200 }}
          size="small"
          renderInput={(params) => <TextField {...params} label="Instrument" placeholder="Select instrument" />}
          disabled={isLoading}
        />

        <TextField
          label="Experiment Number"
          value={experimentNumber}
          onChange={(e) => setExperimentNumber(e.target.value)}
          onKeyPress={handleKeyPress}
          type="number"
          size="small"
          sx={{ width: 175 }}
          placeholder="Enter number"
          disabled={isLoading}
        />

        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          disabled={isLoading || (!selectedInstrument && !experimentNumber)}
          sx={{ height: 40 }}
        >
          Search
        </Button>

        {isSearchActive && (
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            disabled={isLoading}
            sx={{ height: 40 }}
          >
            Clear
          </Button>
        )}
      </Box>

      {isSearchActive && (selectedInstrument || experimentNumber) && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Searching for: {selectedInstrument && <strong>Instrument: {selectedInstrument}</strong>}
            {selectedInstrument && experimentNumber && ' | '}
            {experimentNumber && <strong>Experiment: {experimentNumber}</strong>}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ExperimentSearch;
