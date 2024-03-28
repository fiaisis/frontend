import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '@mui/material/styles';
import { useParams, useHistory } from 'react-router-dom';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box, Typography } from '@mui/material';
import { instruments } from './InstrumentData';

const DataViewer: React.FC = () => {
  const theme = useTheme();
  const history = useHistory();
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const [selectedInstrument, setSelectedInstrument] = useState<string>(instrumentName || instruments[0].name);

  // Example data
  const x = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
  const y = [4.76, 5.4, 7.97, 11.24, 12.86, 12.02, 15.95, 16.84, 18.89, 21.41];
  const yerr = [0.52, 0.79, 0.65, 0.52, 0.58, 0.56, 0.79, 0.45, 0.56, 0.32];
  const line_y = [4.5, 6.33, 8.16, 9.99, 11.82, 13.65, 15.48, 17.31, 19.14, 20.97];

  const backgroundColor = theme.palette.mode === 'dark' ? '#282828' : 'white';
  const textColor = theme.palette.text.primary;

  useEffect(() => {
    if (instrumentName && instruments.some((i) => i.name === instrumentName)) {
      setSelectedInstrument(instrumentName);
    } else {
      // Fallback to the first instrument if the parameter is not valid
      setSelectedInstrument(instruments[0].name);
      history.replace(`/data-viewer/${instruments[0].name}`);
    }
  }, [instrumentName, history]);

  const handleInstrumentChange = (event: SelectChangeEvent): void => {
    const newInstrument = event.target.value as string;
    setSelectedInstrument(newInstrument);
    history.push(`/data-viewer/${newInstrument}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom="20px">
        <Typography variant="h3" component="h1" style={{ color: textColor }}>
          {selectedInstrument.toUpperCase()} data viewer
        </Typography>

        <FormControl style={{ minWidth: '200px' }}>
          <InputLabel id="instrument-select-label">Instrument</InputLabel>
          <Select
            labelId="instrument-select-label"
            value={selectedInstrument}
            label="Instrument"
            onChange={handleInstrumentChange}
          >
            {instruments.map((instrument) => (
              <MenuItem key={instrument.id} value={instrument.name}>
                {instrument.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Plot
        data={[
          {
            x,
            y,
            error_y: {
              type: 'data',
              array: yerr,
              visible: true,
            },
            type: 'scatter',
            mode: 'markers',
            marker: { color: 'blue' },
            name: 'Data with error bars',
          },
          {
            x,
            y: line_y,
            type: 'scatter',
            mode: 'lines',
            line: { color: 'red' },
            name: 'Line of Best Fit',
          },
        ]}
        layout={{
          width: 720,
          height: 440,
          title: 'A Test Plot',
          paper_bgcolor: backgroundColor,
          plot_bgcolor: backgroundColor,
          font: {
            color: textColor,
          },
        }}
      />
    </div>
  );
};

export default DataViewer;
