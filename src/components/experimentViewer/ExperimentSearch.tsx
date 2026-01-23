import React, { useState } from 'react';
import { Box, TextField, Button, Paper, Autocomplete, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { instruments } from '../../lib/instrumentData';

interface ExperimentSearchProps {
  onSearch: (instrumentName: string | null, experimentNumber: number | null, limit: number) => void;
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
  const [resultLimit, setResultLimit] = useState<number>(10);

  const handleSearch = (): void => {
    const expNum = experimentNumber.trim() ? parseInt(experimentNumber) : null;
    onSearch(selectedInstrument, expNum, resultLimit);
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
          slotProps={{ htmlInput: { min: 0 } }}
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

      {/* Result limit selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Results limit:
        </Typography>
        <ToggleButtonGroup
          value={resultLimit}
          exclusive
          onChange={(_, newLimit) => newLimit !== null && setResultLimit(newLimit)}
          size="small"
          disabled={isLoading}
        >
          <ToggleButton value={10}>10</ToggleButton>
          <ToggleButton value={25}>25</ToggleButton>
          <ToggleButton value={50}>50</ToggleButton>
          <ToggleButton value={100}>100</ToggleButton>
        </ToggleButtonGroup>
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
