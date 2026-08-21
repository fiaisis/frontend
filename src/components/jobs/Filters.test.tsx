import 'dayjs/locale/en-gb';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import FilterContainer from './Filters';
import { JobQueryFilters } from '../../lib/types';

const renderFilters = (
  appliedFilters: JobQueryFilters,
  overrides: Partial<React.ComponentProps<typeof FilterContainer>> = {}
): ReturnType<typeof render> => {
  const props: React.ComponentProps<typeof FilterContainer> = {
    visible: true,
    handleFiltersClose: vi.fn(),
    showInstrumentFilter: false,
    handleFiltersChange: vi.fn(),
    resetPageNumber: vi.fn(),
    appliedFilters,
    showAsUserControl: true,
    asUser: false,
    setAsUser: vi.fn(),
    ...overrides,
  };

  return render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      <FilterContainer {...props} />
    </LocalizationProvider>
  );
};

describe('FilterContainer', () => {
  afterEach(cleanup);

  test('offers view as user as a filter and resets pagination when it changes', async () => {
    const user = userEvent.setup();
    const setAsUser = vi.fn();
    const resetPageNumber = vi.fn();

    renderFilters({}, { setAsUser, resetPageNumber });

    await user.click(screen.getByRole('checkbox', { name: 'View as user' }));

    expect(setAsUser).toHaveBeenCalledWith(true);
    expect(resetPageNumber).toHaveBeenCalledTimes(1);
  });

  test('does not republish stale local values after an applied filter is removed', async () => {
    const handleFiltersChange = vi.fn();
    const stableProps = {
      handleFiltersClose: vi.fn(),
      handleFiltersChange,
      resetPageNumber: vi.fn(),
      setAsUser: vi.fn(),
    };
    const { rerender } = renderFilters({ title: 'Polymer' }, stableProps);

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Polymer'));
    handleFiltersChange.mockClear();

    rerender(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <FilterContainer
          visible
          showInstrumentFilter={false}
          appliedFilters={{}}
          showAsUserControl
          asUser={false}
          {...stableProps}
        />
      </LocalizationProvider>
    );

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(''));
    await new Promise((resolve) => setTimeout(resolve, 550));

    expect(handleFiltersChange).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Polymer' }));
  });
});
