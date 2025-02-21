import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import React from 'react';
import { instruments } from '../../lib/InstrumentData';

const InstrumentSelector: React.FC<{
  selectedInstrument: string;
  handleInstrumentChange: (event: SelectChangeEvent<string>) => void;
}> = ({ selectedInstrument, handleInstrumentChange }) => {
  return (
    <FormControl style={{ width: '200px', marginLeft: '20px' }}>
      <InputLabel id="instrument-select-label">Instrument</InputLabel>
      <Select
        labelId="instrument-select-label"
        value={selectedInstrument}
        label="Instrument"
        onChange={handleInstrumentChange}
      >
        {[{ name: 'ALL' }, ...instruments].map((instrument) => (
          <MenuItem key={instrument.name} value={instrument.name}>
            {instrument.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default InstrumentSelector;
