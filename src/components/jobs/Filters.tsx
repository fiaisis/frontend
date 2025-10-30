import React, { FC, ReactElement, useEffect, useState, Dispatch, SetStateAction } from 'react';
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
import { JobQueryFilters, reductionStates, Job } from '../../lib/types';
import { instruments } from '../../lib/instrumentData';
import dayjs from 'dayjs';

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

// Hook for page-resetting when a filter is changed
function useFilterWithReset<T>(
  initialValue: T,
  resetPageNumber: () => void
): [T, Dispatch<SetStateAction<T>>, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);

  const setValueAndReset: Dispatch<SetStateAction<T>> = React.useCallback(
    (newValue) => {
      setValue(newValue);
      resetPageNumber();
    },
    [resetPageNumber]
  );

  // Silent setter to not trigger a page reset: causes infinite re-renders
  // otherwise
  const setValueSilently: Dispatch<SetStateAction<T>> = React.useCallback((newValue) => {
    setValue(newValue);
  }, []);

  return [value, setValueAndReset, setValueSilently];
}

const DatePickerPair: FC<{
  label: string;
  handleAfterChange: (date: string | null) => void;
  handleBeforeChange: (date: string | null) => void;
  beforeValue: string | null;
  afterValue: string | null;
}> = ({ label, handleAfterChange, handleBeforeChange, beforeValue, afterValue }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
    <DatePicker
      slotProps={{ textField: { size: 'small', sx: { width: 175 }, error: false } }}
      label={`${label} after`}
      onChange={(date) => handleAfterChange(date?.toISOString() ?? null)}
      value={dayjs(afterValue)}
    />
    <DatePicker
      slotProps={{ textField: { size: 'small', sx: { width: 175 }, error: false } }}
      label={`${label} before`}
      onChange={(date) => handleBeforeChange(date?.toISOString() ?? null)}
      value={dayjs(beforeValue)}
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
    <FormControl sx={{ width: 175 }} size={'small'}>
      <InputLabel id="demo-multiple-checkbox-label">{name}</InputLabel>
      <Select
        labelId="demo-multiple-checkbox-label"
        id="demo-multiple-checkbox"
        multiple
        size={'small'}
        value={selectedItems}
        onChange={(event: SelectChangeEvent<string[]>) => {
          const {
            target: { value },
          } = event;
          handleChange(
            // On autofill, we get a stringified value
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
  jobs: Job[];
  handleBulkRerun: () => void;
  isBulkRerunning: boolean;
  resetPageNumber: () => void;
  appliedFilters: JobQueryFilters;
}> = ({ visible, showInstrumentFilter, handleFiltersChange, resetPageNumber, appliedFilters }): ReactElement => {
  const [selectedInstruments, setSelectedInstruments, setSelectedInstrumentsSilently] = useFilterWithReset<string[]>(
    [],
    resetPageNumber
  );
  const [selectedStates, setSelectedStates, setSelectedStatesSilently] = useFilterWithReset<string[]>(
    [],
    resetPageNumber
  );
  const [title, setTitle, setTitleSilently] = useFilterWithReset<string | null>(null, resetPageNumber);
  const [filename, setFilename, setFilenameSilently] = useFilterWithReset<string | null>(null, resetPageNumber);

  const [experimentNumberIn, setExperimentNumberIn, setExperimentNumberInSilently] = useFilterWithReset<string[]>(
    [],
    resetPageNumber
  );
  const [experimentNumberAfter, setExperimentNumberAfter, setExperimentNumberAfterSilently] = useFilterWithReset<
    number | null
  >(null, resetPageNumber);
  const [experimentNumberBefore, setExperimentNumberBefore, setExperimentNumberBeforeSilently] = useFilterWithReset<
    number | null
  >(null, resetPageNumber);

  const [jobStartBefore, setJobStartBefore, setJobStartBeforeSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );
  const [jobStartAfter, setJobStartAfter, setJobStartAfterSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );
  const [jobEndBefore, setJobEndBefore, setJobEndBeforeSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );
  const [jobEndAfter, setJobEndAfter, setJobEndAfterSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );

  const [debouncedTitle, setDebouncedTitle] = useState<string | null>(null);
  const [debouncedFilename, setDebouncedFilename] = React.useState<string | null>(null);

  const [runStartBefore, setRunStartBefore, setRunStartBeforeSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );
  const [runStartAfter, setRunStartAfter, setRunStartAfterSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );
  const [runEndBefore, setRunEndBefore, setRunEndBeforeSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );
  const [runEndAfter, setRunEndAfter, setRunEndAfterSilently] = useFilterWithReset<string | null>(
    null,
    resetPageNumber
  );

  const [debouncedExperimentNumberIn, setDebouncedExperimentNumberIn] = useState<string[]>([]);
  const [debouncedExperimentNumberAfter, setDebouncedExperimentNumberAfter] = useState<number | null>(null);
  const [debouncedExperimentNumberBefore, setDebouncedExperimentNumberBefore] = useState<number | null>(null);

  const previousAppliedFiltersRef = React.useRef<string>('');

  // Debounce filters so API isn't spammed while typing
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

  // React to upstream filter changes such as URL navigation
  useEffect(() => {
    const serializedFilters = JSON.stringify(appliedFilters ?? {});

    if (previousAppliedFiltersRef.current === serializedFilters) {
      return;
    }

    previousAppliedFiltersRef.current = serializedFilters;

    const instruments = Array.isArray(appliedFilters.instrument_in) ? [...appliedFilters.instrument_in] : [];
    const states = Array.isArray(appliedFilters.job_state_in) ? [...appliedFilters.job_state_in] : [];
    const experimentNumbers = Array.isArray(appliedFilters.experiment_number_in)
      ? appliedFilters.experiment_number_in.map((num) => num.toString())
      : [];

    setSelectedInstrumentsSilently(instruments);
    setSelectedStatesSilently(states);
    setExperimentNumberInSilently(experimentNumbers);
    setExperimentNumberAfterSilently(appliedFilters.experiment_number_after ?? null);
    setExperimentNumberBeforeSilently(appliedFilters.experiment_number_before ?? null);
    setTitleSilently(appliedFilters.title ?? null);
    setFilenameSilently(appliedFilters.filename ?? null);
    setJobStartBeforeSilently(appliedFilters.job_start_before ?? null);
    setJobStartAfterSilently(appliedFilters.job_start_after ?? null);
    setJobEndBeforeSilently(appliedFilters.job_end_before ?? null);
    setJobEndAfterSilently(appliedFilters.job_end_after ?? null);
    setRunStartBeforeSilently(appliedFilters.run_start_before ?? null);
    setRunStartAfterSilently(appliedFilters.run_start_after ?? null);
    setRunEndBeforeSilently(appliedFilters.run_end_before ?? null);
    setRunEndAfterSilently(appliedFilters.run_end_after ?? null);

    setDebouncedTitle(appliedFilters.title ?? null);
    setDebouncedFilename(appliedFilters.filename ?? null);
    setDebouncedExperimentNumberIn(experimentNumbers);
    setDebouncedExperimentNumberAfter(appliedFilters.experiment_number_after ?? null);
    setDebouncedExperimentNumberBefore(appliedFilters.experiment_number_before ?? null);
  }, [
    appliedFilters,
    setSelectedInstrumentsSilently,
    setSelectedStatesSilently,
    setTitleSilently,
    setFilenameSilently,
    setExperimentNumberInSilently,
    setExperimentNumberAfterSilently,
    setExperimentNumberBeforeSilently,
    setJobStartBeforeSilently,
    setJobStartAfterSilently,
    setJobEndBeforeSilently,
    setJobEndAfterSilently,
    setRunStartBeforeSilently,
    setRunStartAfterSilently,
    setRunEndBeforeSilently,
    setRunEndAfterSilently,
    setDebouncedTitle,
    setDebouncedFilename,
    setDebouncedExperimentNumberIn,
    setDebouncedExperimentNumberAfter,
    setDebouncedExperimentNumberBefore,
  ]);

  // Build the payload for the API whenever any debounced field changes
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
    setSelectedInstruments([]);
    setSelectedStates([]);
    setExperimentNumberIn([]);
    setExperimentNumberAfter(null);
    setExperimentNumberBefore(null);
    setTitle(null);
    setFilename(null);
    setJobStartBefore(null);
    setJobStartAfter(null);
    setRunStartBefore(null);
    setRunStartAfter(null);
    setJobEndBefore(null);
    setJobEndAfter(null);
    setRunEndBefore(null);
    setRunEndAfter(null);
    setDebouncedExperimentNumberIn([]);
    setDebouncedTitle(null);
    setDebouncedFilename(null);
    setDebouncedExperimentNumberAfter(null);
    setDebouncedExperimentNumberBefore(null);
    setRunEndBefore(null);
    setRunEndAfter(null);
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
                  name={'Reduction state'}
                  items={(reductionStates as unknown as string[]) ?? []}
                  selectedItems={selectedStates}
                  handleChange={setSelectedStates}
                />

                <TextField
                  size={'small'}
                  sx={{ width: 175 }}
                  label={'Filename'}
                  value={filename ?? ''}
                  placeholder={'loq123.nxs'}
                  onChange={(event) => setFilename(event.target.value)}
                />
                <TextField
                  size={'small'}
                  sx={{ width: 175 }}
                  label={'Title'}
                  placeholder={'Title'}
                  value={title ?? ''}
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
              <span>Experiment numbers</span>
              <Box display={'flex'} gap={1}>
                <TextField
                  size={'small'}
                  sx={{ width: 175 }}
                  label={'Search'}
                  value={experimentNumberIn ?? ''}
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
                  value={experimentNumberAfter ?? ''}
                  onChange={(event) => setExperimentNumberAfter(parseInt(event.target.value, 10))}
                />
                <TextField
                  size={'small'}
                  inputMode={'numeric'}
                  sx={{ width: 175 }}
                  label={'Before'}
                  placeholder={'54321'}
                  value={experimentNumberBefore ?? ''}
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
                label={'Run start'}
                beforeValue={runStartBefore}
                afterValue={runStartAfter}
              />
              <DatePickerPair
                handleBeforeChange={setRunEndBefore}
                handleAfterChange={setRunEndAfter}
                label={'Run end'}
                beforeValue={runEndBefore}
                afterValue={runEndAfter}
              />
              <DatePickerPair
                handleBeforeChange={setJobStartBefore}
                handleAfterChange={setJobStartAfter}
                label={'Job start'}
                beforeValue={jobStartBefore}
                afterValue={jobStartAfter}
              />
              <DatePickerPair
                handleBeforeChange={setJobEndBefore}
                handleAfterChange={setJobEndAfter}
                label={'Job end'}
                beforeValue={jobEndBefore}
                afterValue={jobEndAfter}
              />
            </Box>
          </Box>
          <Box sx={{ alignSelf: 'end' }}>
            <Button variant="contained" color="warning" sx={{ width: 150 }} onClick={clearAndCloseFilters}>
              Clear
            </Button>
          </Box>
        </Paper>
      </Box>
    </Grow>
  );
};

export default FilterContainer;
