import 'dayjs/locale/en-gb';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import FilterContainer from './Filters';
import { FAVORITE_INSTRUMENTS_STORAGE_KEY } from '../../lib/instrumentFavorites';
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

describe('FilterContainer', { timeout: 15000 }, () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test('selects multiple instruments without closing the menu and supports keyboard dismissal', async () => {
    const user = userEvent.setup();
    const handleFiltersChange = vi.fn();
    const handleFiltersClose = vi.fn();
    const resetPageNumber = vi.fn();
    renderFilters(
      { instrument_in: ['LOQ'] },
      { showInstrumentFilter: true, handleFiltersChange, handleFiltersClose, resetPageNumber }
    );

    const trigger = screen.getByRole('button', { name: /^Instruments/ });
    await user.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Instruments' });
    const loqOption = within(menu).getByRole('menuitemcheckbox', { name: /^LOQ\s/ });
    expect(loqOption).toBeChecked();
    await user.click(within(menu).getByRole('menuitemcheckbox', { name: /^GEM\s/ }));
    expect(menu).toBeInTheDocument();
    expect(handleFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ instrument_in: ['LOQ', 'GEM'] }));

    loqOption.focus();
    await user.keyboard('{Enter}');
    expect(loqOption).not.toBeChecked();
    expect(handleFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ instrument_in: ['GEM'] }));
    expect(resetPageNumber).toHaveBeenCalledTimes(2);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveTextContent('GEM');
    expect(handleFiltersClose).not.toHaveBeenCalled();

    await user.keyboard(' ');
    expect(screen.getByRole('menuitemcheckbox', { name: /^GEM\s/ })).toBeChecked();
  });

  test('shares instrument search, support filtering and favourites without changing selected filters', async () => {
    const user = userEvent.setup();
    const handleFiltersChange = vi.fn();
    renderFilters({ instrument_in: ['ALF'] }, { showInstrumentFilter: true, handleFiltersChange });
    handleFiltersChange.mockClear();

    await user.click(screen.getByRole('button', { name: /^Instruments/ }));
    const search = screen.getByRole('textbox', { name: 'Search for instrument' });
    await user.type(search, 'ALF');
    expect(screen.getByText('No instruments found')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' }));
    expect(screen.getByRole('menuitemcheckbox', { name: /^ALF\s+Neutron diffraction/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Add ALF to favourites' }));
    expect(screen.getByRole('button', { name: 'Remove ALF from favourites' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(FAVORITE_INSTRUMENTS_STORAGE_KEY) ?? '[]')).toHaveLength(1);
    await user.clear(search);
    expect(screen.getAllByRole('menuitemcheckbox')[0]).toHaveTextContent('ALF');
    await user.type(search, 'small-angle');
    expect(screen.getByRole('menuitemcheckbox', { name: /^LOQ\s/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitemcheckbox', { name: /^ALF\s/ })).not.toBeInTheDocument();
    expect(handleFiltersChange).not.toHaveBeenCalled();
  });

  test('clears instrument selections using the existing filter clear action', async () => {
    const user = userEvent.setup();
    const handleFiltersChange = vi.fn();
    renderFilters({ instrument_in: ['GEM', 'LOQ'] }, { showInstrumentFilter: true, handleFiltersChange });

    await user.click(screen.getByRole('button', { name: 'Clear', exact: true }));
    await waitFor(() =>
      expect(handleFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ instrument_in: undefined }))
    );
    const trigger = screen.getByRole('button', { name: /^Instruments/ });
    expect(trigger).not.toHaveTextContent('GEM');
    expect(trigger).not.toHaveTextContent('LOQ');
    await user.click(trigger);
    expect(screen.getByRole('menuitemcheckbox', { name: /^GEM\s/ })).not.toBeChecked();
    expect(screen.getByRole('menuitemcheckbox', { name: /^LOQ\s/ })).not.toBeChecked();
  });

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
