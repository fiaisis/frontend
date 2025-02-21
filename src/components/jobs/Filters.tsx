import React, { FC, ReactElement, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  Grow,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { JobQueryFilters, reductionStates } from '../../lib/types';
import { instruments } from '../../lib/InstrumentData';

const itemHeight = 48;
const itemPaddingTop = 8;
const menuProps = {
  PaperProps: {
    style: {
      maxHeight: itemHeight * 4.5 + itemPaddingTop,
      width: 250,
    },
  },
};

const DatePickerPair: FC<{
  label: string;
  handleAfterChange: (date: string | null) => void;
  handleBeforeChange: (date: string | null) => void;
}> = ({ label, handleAfterChange, handleBeforeChange }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
    <DatePicker
      slotProps={{ textField: { size: 'small', sx: { width: 175 } } }}
      label={`${label} After`}
      onChange={(date) => handleAfterChange(date?.toISOString() ?? null)}
    />
    <DatePicker
      slotProps={{ textField: { size: 'small', sx: { width: 175 } } }}
      label={`${label} Before`}
      onChange={(date) => handleBeforeChange(date?.toISOString() ?? null)}
    />
  </Box>
);

const MultipleSelectCheckmarks: FC<{
  name: string;
  items: string[];
  selectedItems: string[];
  handleChange: (items: string[]) => void;
}> = ({ name, items, selectedItems, handleChange }): ReactElement => {
  return (
    <FormControl sx={{ width: 175 }}>
      <InputLabel id="demo-multiple-checkbox-label">{name}</InputLabel>
      <Select
        labelId="demo-multiple-checkbox-label"
        id="demo-multiple-checkbox"
        multiple
        hiddenLabel
        size={'small'}
        value={selectedItems}
        onChange={(event: SelectChangeEvent<string[]>) => {
          const {
            target: { value },
          } = event;
          handleChange(
            // On autofill, we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
          );
        }}
        input={<OutlinedInput label={name} />}
        renderValue={(selected) => selected.join(', ')}
        MenuProps={menuProps}
      >
        {items.map((item) => (
          <MenuItem key={item} value={item}>
            <Checkbox checked={selectedItems.includes(item)} />
            <ListItemText primary={item} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const FilterContainer: React.FC<{
  visible: boolean;
  handleFiltersClose: () => void;
  showInstrumentFilter: boolean;
  handleFiltersChange: (filters: JobQueryFilters) => void;
}> = ({ visible, showInstrumentFilter, handleFiltersChange }): ReactElement => {
  const [selectedInstruments, setSelectedInstruments] = React.useState<string[]>([]);
  const [selectedStates, setSelectedStates] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState<string | null>(null);
  const [debouncedTitle, setDebouncedTitle] = React.useState<string | null>(null);
  const [experimentNumberIn, setExperimentNumberIn] = React.useState<string[]>([]);
  const [debouncedExperimentNumberIn, setDebouncedExperimentNumberIn] = React.useState<string[]>([]);
  const [filename, setFilename] = React.useState<string | null>(null);
  const [debouncedFilename, setDebouncedFilename] = React.useState<string | null>(null);
  const [experimentNumberAfter, setExperimentNumberAfter] = React.useState<number | null>(null);
  const [debouncedExperimentNumberAfter, setDebouncedExperimentNumberAfter] = React.useState<number | null>(null);
  const [experimentNumberBefore, setExperimentNumberBefore] = React.useState<number | null>(null);
  const [debouncedExperimentNumberBefore, setDebouncedExperimentNumberBefore] = React.useState<number | null>(null);
  const [jobStartBefore, setJobStartBefore] = React.useState<string | null>(null);
  const [jobStartAfter, setJobStartAfter] = React.useState<string | null>(null);
  const [jobEndBefore, setJobEndBefore] = React.useState<string | null>(null);
  const [jobEndAfter, setJobEndAfter] = React.useState<string | null>(null);
  const [runStartBefore, setRunStartBefore] = React.useState<string | null>(null);
  const [runStartAfter, setRunStartAfter] = React.useState<string | null>(null);
  const [runEndBefore, setRunEndBefore] = React.useState<string | null>(null);
  const [runEndAfter, setRunEndAfter] = React.useState<string | null>(null);

  useEffect(() => {
    const debounceTimeoutId = setTimeout(() => {
      setDebouncedExperimentNumberIn(experimentNumberIn);
      setDebouncedTitle(title);
      setDebouncedFilename(filename);
      setDebouncedExperimentNumberAfter(experimentNumberAfter);
      setDebouncedExperimentNumberBefore(experimentNumberBefore);
    }, 500);
    return () => clearTimeout(debounceTimeoutId);
  }, [
    experimentNumberIn,
    setDebouncedExperimentNumberIn,
    title,
    setDebouncedTitle,
    filename,
    setDebouncedFilename,
    experimentNumberAfter,
    experimentNumberBefore,
  ]);

  useEffect(() => {
    const filters: JobQueryFilters = Object();
    if (selectedInstruments) {
      filters.instrument_in = selectedInstruments.length !== 0 ? selectedInstruments : undefined;
    }
    if (selectedStates) {
      filters.job_state_in = selectedStates.length !== 0 ? selectedStates : undefined;
    }
    filters.experiment_number_in =
      debouncedExperimentNumberIn.length !== 0 && debouncedExperimentNumberIn[0] !== ''
        ? debouncedExperimentNumberIn.map((number) => parseInt(number, 10))
        : undefined;

    filters.title = debouncedTitle || undefined;
    filters.experiment_number_after = debouncedExperimentNumberAfter || undefined;
    filters.experiment_number_before = debouncedExperimentNumberBefore || undefined;
    filters.filename = debouncedFilename || undefined;
    filters.job_start_before = jobStartBefore || undefined;
    filters.job_start_after = jobStartAfter || undefined;
    filters.job_end_before = jobEndBefore || undefined;
    filters.job_end_after = jobEndAfter || undefined;
    filters.run_start_before = runStartBefore || undefined;
    filters.run_start_after = runStartAfter || undefined;
    filters.run_end_before = runEndBefore || undefined;
    filters.run_end_after = runEndAfter || undefined;

    handleFiltersChange(filters);
  }, [
    selectedInstruments,
    handleFiltersChange,
    debouncedExperimentNumberIn,
    selectedStates,
    debouncedTitle,
    debouncedFilename,
    debouncedExperimentNumberAfter,
    debouncedExperimentNumberBefore,
    jobStartBefore,
    jobStartAfter,
    jobEndBefore,
    jobEndAfter,
    runStartBefore,
    runStartAfter,
    runEndBefore,
    runEndAfter,
  ]);

  const clearAndCloseFilters = (): void => {
    handleFiltersChange(Object());
  };

  return (
    <Grow in={visible}>
      <Box sx={{ pr: '20px', display: visible ? 'flex' : 'none', flexWrap: 'wrap', width: '100%' }}>
        <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', mb: 1, width: '100%', p: 1, gap: 1 }}>
          <Box display={'flex'} width={'100%'} justifyContent={'space-between'} gap={2}>
            <Box display={'flex'} flexDirection={'column'} gap={1}>
              <span>General</span>
              <Box display={'flex'} gap={1}>
                <MultipleSelectCheckmarks
                  name={'Reduction State'}
                  items={(reductionStates as unknown as string[]) ?? []}
                  selectedItems={selectedStates}
                  handleChange={setSelectedStates}
                />

                <TextField
                  size={'small'}
                  sx={{ width: 175 }}
                  label={'Filename'}
                  placeholder={'loq123.nxs'}
                  onChange={(event) => setFilename(event.target.value)}
                />
                <TextField
                  size={'small'}
                  sx={{ width: 175 }}
                  label={'Title'}
                  placeholder={'Title'}
                  onChange={(event) => setTitle(event.target.value)}
                />

                {showInstrumentFilter && (
                  <MultipleSelectCheckmarks
                    selectedItems={selectedInstruments ?? []}
                    name={'Instruments'}
                    handleChange={setSelectedInstruments}
                    items={instruments.map((instrument) => instrument.name)}
                  />
                )}
              </Box>
            </Box>
            <Divider orientation={'vertical'} flexItem />
            <Box display={'flex'} flexDirection={'column'} gap={1}>
              <span>Experiment Numbers</span>
              <Box display={'flex'} gap={1}>
                <TextField
                  size={'small'}
                  sx={{ width: 175 }}
                  label={'Search'}
                  placeholder={'12345, 54321'}
                  onChange={(event) => {
                    try {
                      if (event.target.value === '') {
                        setExperimentNumberIn([]);
                      }
                      setExperimentNumberIn(event.target.value.replace(' ', '').split(','));
                    } catch {
                      setExperimentNumberIn([]);
                    }
                  }}
                />
                <TextField
                  size={'small'}
                  inputMode={'numeric'}
                  sx={{ width: 175 }}
                  label={'After'}
                  placeholder={'12345'}
                  onChange={(event) => setExperimentNumberAfter(parseInt(event.target.value, 10))}
                />
                <TextField
                  size={'small'}
                  sx={{ width: 175 }}
                  label={'Before'}
                  placeholder={'54321'}
                  onChange={(event) => setExperimentNumberBefore(parseInt(event.target.value, 10))}
                />
              </Box>
            </Box>
          </Box>
          <Divider orientation={'horizontal'} flexItem />
          <Box display={'flex'} gap={1} flexDirection={'column'}>
            <span>Dates</span>
            <Box display={'flex'} gap={1}>
              <DatePickerPair
                handleBeforeChange={setRunStartBefore}
                handleAfterChange={setRunStartAfter}
                label={'Run Start'}
              />
              <DatePickerPair
                handleBeforeChange={setRunEndBefore}
                handleAfterChange={setRunEndAfter}
                label={'Run End'}
              />
              <DatePickerPair
                handleBeforeChange={setJobStartBefore}
                handleAfterChange={setJobStartAfter}
                label={'Job Start'}
              />
              <DatePickerPair
                handleBeforeChange={setJobEndBefore}
                handleAfterChange={setJobEndAfter}
                label={'Job End'}
              />
            </Box>
          </Box>
          <Box sx={{ alignSelf: 'end' }}>
            <Button
              variant={'contained'}
              color={'warning'}
              sx={{ width: 150, alignSelf: 'end' }}
              onClick={clearAndCloseFilters}
            >
              Clear
            </Button>
          </Box>
        </Paper>
      </Box>
    </Grow>
  );
};

export default FilterContainer;
