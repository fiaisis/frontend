import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha, Theme } from '@mui/material/styles';
import { SystemStyleObject } from '@mui/system';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import React, { FC, ReactElement, useEffect, useState, Dispatch, SetStateAction } from 'react';

import { getJobTableChromeColors, JOB_TABLE_TOOLBAR_CONTROL_HEIGHT } from './constants';
import InstrumentFilter from './InstrumentFilter';
import { JobQueryFilters, reductionStates } from '../../lib/types';

const itemHeight = 48;
const itemPaddingTop = 8;
const getFilterPaperSx = (theme: Theme): SystemStyleObject<Theme> => {
  const filterChrome = getJobTableChromeColors(theme.palette.mode);

  return {
    borderRadius: 0,
    border: `1px solid ${filterChrome.border}`,
    backgroundColor: filterChrome.surface,
    backgroundImage: 'none',
    color: filterChrome.text,
  };
};

const menuProps = {
  slotProps: {
    paper: {
      style: {
        maxHeight: itemHeight * 4.5 + itemPaddingTop,
        width: 250,
      },
      sx: (theme: Theme) => {
        const filterChrome = getJobTableChromeColors(theme.palette.mode);

        return {
          ...getFilterPaperSx(theme),
          '& .MuiMenuItem-root': {
            minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
            py: 0.25,
            '&:hover, &.Mui-focusVisible': { backgroundColor: filterChrome.hover },
            '&.Mui-selected': { backgroundColor: alpha(filterChrome.accent, 0.12) },
            '&.Mui-selected:hover': { backgroundColor: alpha(filterChrome.accent, 0.18) },
          },
          '& .MuiCheckbox-root': {
            color: alpha(filterChrome.text, 0.7),
            '&.Mui-checked': { color: filterChrome.accent },
          },
          '& .MuiListItemText-primary': { fontSize: '0.875rem' },
        };
      },
    },
  },
};

const datePickerSlotProps = {
  textField: { size: 'small' as const, fullWidth: true, error: false },
  desktopPaper: { sx: getFilterPaperSx },
  mobilePaper: { sx: getFilterPaperSx },
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
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
    <DatePicker
      slotProps={datePickerSlotProps}
      label={`${label} after`}
      onChange={(date) => handleAfterChange(date?.toISOString() ?? null)}
      value={dayjs(afterValue)}
    />
    <DatePicker
      slotProps={datePickerSlotProps}
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
    <FormControl fullWidth size={'small'}>
      <InputLabel id="demo-multiple-checkbox-label">{name}</InputLabel>
      <Select<string[]>
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
  resetPageNumber: () => void;
  appliedFilters: JobQueryFilters;
  showAsUserControl: boolean;
  asUser: boolean;
  setAsUser: (asUser: boolean) => void;
}> = ({
  visible,
  handleFiltersClose,
  showInstrumentFilter,
  handleFiltersChange,
  resetPageNumber,
  appliedFilters,
  showAsUserControl,
  asUser,
  setAsUser,
}): ReactElement => {
  const theme = useTheme();
  const filterChrome = getJobTableChromeColors(theme.palette.mode);
  const sectionSx = { minWidth: 0, border: `1px solid ${filterChrome.border}` };
  const sectionHeadingSx = {
    px: 1.5,
    py: 1,
    borderBottom: `1px solid ${filterChrome.border}`,
    backgroundColor: filterChrome.header,
    fontWeight: 700,
  };
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
  const syncingFromAppliedFiltersRef = React.useRef(false);

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

    syncingFromAppliedFiltersRef.current = true;
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
    if (syncingFromAppliedFiltersRef.current) {
      syncingFromAppliedFiltersRef.current = false;
      return;
    }

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
    setAsUser(false);
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
    <Dialog
      open={visible}
      onClose={handleFiltersClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: { sx: getFilterPaperSx },
      }}
    >
      <DialogTitle
        sx={{
          px: 2,
          py: 1.25,
          backgroundColor: filterChrome.header,
          fontSize: '1rem',
          fontWeight: 700,
        }}
      >
        Filters
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderColor: filterChrome.border,
          '& .MuiFormControl-root': { minWidth: 0 },
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
            backgroundColor: filterChrome.surface,
            color: filterChrome.text,
            fontSize: '0.875rem',
            '& fieldset': { borderColor: filterChrome.border },
            '&:hover fieldset, &.Mui-focused fieldset': { borderColor: filterChrome.accent },
          },
          '& .MuiInputLabel-root': {
            color: alpha(filterChrome.text, 0.75),
            '&.Mui-focused': { color: filterChrome.accent },
          },
          '& .MuiSelect-icon, & .MuiIconButton-root': { color: filterChrome.accent },
          '& .MuiIconButton-root': {
            borderRadius: 0,
            '&:hover': { backgroundColor: filterChrome.hover },
          },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 1fr)' },
            gap: 1.5,
          }}
        >
          <Box sx={sectionSx}>
            <Typography component="h3" variant="body2" sx={sectionHeadingSx}>
              General
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5,
                p: 1.5,
              }}
            >
              {showAsUserControl && (
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={asUser}
                      onChange={(_event, checked) => {
                        setAsUser(checked);
                        resetPageNumber();
                      }}
                      slotProps={{
                        input: { 'aria-label': 'View as user' },
                      }}
                    />
                  }
                  label="View as user"
                  sx={{
                    gridColumn: '1 / -1',
                    m: 0,
                    minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
                    gap: 0.75,
                    '& .MuiFormControlLabel-label': { fontSize: '0.875rem' },
                    '& .MuiSwitch-switchBase.Mui-checked': { color: filterChrome.accent },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: filterChrome.accent },
                  }}
                />
              )}
              <MultipleSelectCheckmarks
                name={'Reduction state'}
                items={(reductionStates as unknown as string[]) ?? []}
                selectedItems={selectedStates}
                handleChange={setSelectedStates}
              />

              <TextField
                size={'small'}
                fullWidth
                label={'Filename'}
                value={filename ?? ''}
                placeholder={'loq123.nxs'}
                onChange={(event) => setFilename(event.target.value)}
              />
              <TextField
                size={'small'}
                fullWidth
                label={'Title'}
                placeholder={'Title'}
                value={title ?? ''}
                onChange={(event) => setTitle(event.target.value)}
              />

              {showInstrumentFilter && (
                <InstrumentFilter selectedInstruments={selectedInstruments} onChange={setSelectedInstruments} />
              )}
            </Box>
          </Box>
          <Box sx={sectionSx}>
            <Typography component="h3" variant="body2" sx={sectionHeadingSx}>
              Experiment numbers
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.5, p: 1.5 }}>
              <TextField
                size={'small'}
                fullWidth
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
                fullWidth
                label={'After'}
                placeholder={'12345'}
                value={experimentNumberAfter ?? ''}
                onChange={(event) => setExperimentNumberAfter(parseInt(event.target.value, 10))}
              />
              <TextField
                size={'small'}
                inputMode={'numeric'}
                fullWidth
                label={'Before'}
                placeholder={'54321'}
                value={experimentNumberBefore ?? ''}
                onChange={(event) => setExperimentNumberBefore(parseInt(event.target.value, 10))}
              />
            </Box>
          </Box>
          <Box sx={{ ...sectionSx, gridColumn: '1 / -1' }}>
            <Typography component="h3" variant="body2" sx={sectionHeadingSx}>
              Dates
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.5,
                p: 1.5,
              }}
            >
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
        </Box>
      </DialogContent>
      <DialogActions
        disableSpacing
        sx={{
          p: 0,
          '& .MuiButton-root': {
            minWidth: 96,
            minHeight: JOB_TABLE_TOOLBAR_CONTROL_HEIGHT,
            px: 2,
            borderRadius: 0,
            borderLeft: `1px solid ${filterChrome.border}`,
            color: filterChrome.accent,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { backgroundColor: filterChrome.hover },
            '&:focus-visible': { outline: `2px solid ${filterChrome.accent}`, outlineOffset: -2 },
          },
        }}
      >
        <Button variant="text" onClick={handleFiltersClose}>
          Close
        </Button>
        <Button variant="text" onClick={clearAndCloseFilters}>
          Clear
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilterContainer;
