import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import InstrumentSelector from './InstrumentSelector';
import { getInstrumentTechniques, instruments } from '../../lib/instrumentData';
import { FAVORITE_INSTRUMENTS_STORAGE_KEY } from '../../lib/instrumentFavorites';
import { REDUCTION_SUPPORTED_INSTRUMENTS, LIVE_SUPPORTED_INSTRUMENTS_FALLBACK } from '../../lib/instrumentSupport';

const getMenuItemIndex = (name: string): number =>
  screen.getAllByRole('menuitem').findIndex((menuItem) => menuItem.textContent?.includes(name));

const focusedInstrumentOptions = instruments.filter((instrument) =>
  ['ALF', 'GEM', 'LARMOR', 'LOQ', 'SANS2D', 'ZOOM'].includes(instrument.name)
);

describe('InstrumentSelector', { timeout: 15000 }, () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test('lists instruments alphabetically without category buttons and filters through search', async () => {
    const user = userEvent.setup();
    const instrumentTypes = Array.from(new Set(focusedInstrumentOptions.flatMap(getInstrumentTechniques)));

    render(
      <InstrumentSelector
        selectedInstrument="ALL"
        handleInstrumentChange={vi.fn()}
        instrumentOptions={focusedInstrumentOptions}
      />
    );

    expect(screen.getByRole('button', { name: /Instrument\s+View all reductions/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Instrument\s+View all reductions/ }));

    expect(screen.getByRole('menuitem', { name: 'View all reductions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^All/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Favourites/ })).not.toBeInTheDocument();
    instrumentTypes.forEach((instrumentType) => {
      expect(screen.queryByRole('button', { name: new RegExp(instrumentType) })).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('menuitem')).toHaveLength(focusedInstrumentOptions.length + 1);
    expect(screen.getByRole('menuitem', { name: /ALF\s+Neutron diffraction/ })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /GEM\s+Crystallography, Neutron diffraction, Total scattering/ })
    ).toBeInTheDocument();

    const search = screen.getByRole('textbox', { name: 'Search for instrument' });
    expect(search).toHaveAttribute('placeholder', 'Search for instrument');
    await user.type(search, ' gem ');

    expect(
      screen.getByRole('menuitem', { name: /GEM\s+Crystallography, Neutron diffraction, Total scattering/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /ALF\s+Neutron diffraction/ })).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'loq');

    expect(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /ALF\s+Neutron diffraction/ })).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'not-an-instrument');

    expect(screen.getByText('No instruments found')).toBeInTheDocument();
  });

  test('passes the selected instrument value to the change handler', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(<InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={handleInstrumentChange} />);

    await user.click(screen.getByRole('button', { name: /Instrument\s+View all reductions/ }));
    await user.click(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('LOQ');
  });

  test('hides unsupported instruments by default and combines support with search', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InstrumentSelector
        selectedInstrument="ALL"
        handleInstrumentChange={onChange}
        variant="compact"
        support={{ page: 'reduction-history', instruments: REDUCTION_SUPPORTED_INSTRUMENTS }}
      />
    );
    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));
    const checkbox = screen.getByRole('checkbox', { name: 'Hide unsupported instruments' });
    expect(checkbox).toBeChecked();
    expect(screen.getAllByRole('menuitem')).toHaveLength(11);
    expect(screen.queryByRole('menuitem', { name: /ALF\s/ })).not.toBeInTheDocument();
    await user.click(checkbox);
    expect(screen.getAllByRole('menuitem')).toHaveLength(instruments.length);
    await user.type(screen.getByRole('textbox', { name: 'Search for instrument' }), 'LOQ');
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    await user.click(checkbox);
    expect(screen.getByRole('menuitem', { name: /LOQ\s/ })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('remembers the checkbox across mounts separately for each page', async () => {
    const user = userEvent.setup();
    const props = { selectedInstrument: 'ALL', handleInstrumentChange: vi.fn(), variant: 'compact' as const };
    const support = { page: 'reduction-history' as const, instruments: REDUCTION_SUPPORTED_INSTRUMENTS };
    const first = render(<InstrumentSelector {...props} support={support} />);
    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' }));
    first.unmount();
    const second = render(<InstrumentSelector {...props} support={support} />);
    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));
    expect(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' })).not.toBeChecked();
    expect(screen.getAllByRole('menuitem')).toHaveLength(instruments.length);
    second.rerender(
      <InstrumentSelector
        {...props}
        support={{ page: 'live-data', instruments: LIVE_SUPPORTED_INSTRUMENTS_FALLBACK }}
      />
    );
    expect(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' })).toBeChecked();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  test('keeps the selected instrument when toggling support and lists all available techniques together', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InstrumentSelector
        selectedInstrument="ALF"
        handleInstrumentChange={onChange}
        variant="compact"
        support={{ page: 'live-data', instruments: LIVE_SUPPORTED_INSTRUMENTS_FALLBACK }}
      />
    );
    const selectorButton = screen.getByRole('button', { name: 'Instrument: ALF' });
    await user.click(selectorButton);
    const supportToggle = screen.getByRole('checkbox', { name: 'Hide unsupported instruments' });
    await user.click(supportToggle);
    const menu = within(screen.getByRole('menu'));
    expect(menu.getByRole('menuitem', { name: /ALF\s/ })).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: /LOQ\s/ })).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: /MARI\s/ })).toBeInTheDocument();
    await user.click(supportToggle);
    expect(menu.getAllByRole('menuitem')).toHaveLength(2);
    expect(selectorButton).toHaveTextContent('ALF');
    expect(onChange).not.toHaveBeenCalled();
  });

  test('compact variant shows the selected value without the field label and keeps menu behavior', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={handleInstrumentChange} variant="compact" />
    );

    const selectorButton = screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ });
    expect(selectorButton).toHaveTextContent('Select an instrument');
    expect(selectorButton).not.toHaveTextContent('Instrument');

    await user.click(selectorButton);
    expect(screen.queryByRole('menuitem', { name: 'View all reductions' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('LOQ');
  });

  test('scoped compact variant shows the support toggle without a clear filters action', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentSelector
        selectedInstrument="LOQ"
        handleInstrumentChange={handleInstrumentChange}
        variant="compact"
        allInstrumentsLabel="Clear filters"
        support={{ page: 'reduction-history', instruments: REDUCTION_SUPPORTED_INSTRUMENTS }}
      />
    );

    await user.click(screen.getByRole('button', { name: /Instrument:\s+LOQ/ }));

    expect(screen.getByPlaceholderText('Search for instrument')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Clear filters' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' }));

    expect(handleInstrumentChange).not.toHaveBeenCalled();
  });

  test('compact variant retains favourite stars alongside the full instrument list', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    localStorage.setItem(FAVORITE_INSTRUMENTS_STORAGE_KEY, JSON.stringify([17, 29]));

    render(
      <InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={handleInstrumentChange} variant="compact" />
    );

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));

    const menu = within(screen.getByRole('menu'));
    const loqOption = menu.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ });
    const sansOption = menu.getByRole('menuitem', { name: /SANS2D\s+Small-angle neutron scattering/ });
    expect(within(loqOption).getByRole('button', { name: 'Remove LOQ from favourites' })).toBeInTheDocument();
    expect(within(sansOption).getByRole('button', { name: 'Remove SANS2D from favourites' })).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: /ALF\s+Neutron diffraction/ })).toBeInTheDocument();
    expect(menu.getAllByRole('menuitem')).toHaveLength(instruments.length);

    await user.click(loqOption);

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('LOQ');
  });

  test('compact variant lists favourites first with alphabetical ordering within each group', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    localStorage.setItem(FAVORITE_INSTRUMENTS_STORAGE_KEY, JSON.stringify([29, 17]));

    render(
      <InstrumentSelector
        selectedInstrument="ALL"
        handleInstrumentChange={handleInstrumentChange}
        variant="compact"
        instrumentOptions={focusedInstrumentOptions}
      />
    );

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));

    expect(getMenuItemIndex('LOQ')).toBe(0);
    expect(getMenuItemIndex('SANS2D')).toBe(1);

    expect(
      screen.getAllByRole('menuitem').map((item) => item.querySelector('.MuiListItemText-primary')?.textContent)
    ).toEqual(['LOQ', 'SANS2D', 'ALF', 'GEM', 'LARMOR', 'ZOOM']);
  });

  test('lets users favourite instruments from the selector without selecting the row', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();
    const loqInstrument = instruments.find((instrument) => instrument.name === 'LOQ');

    render(
      <InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={handleInstrumentChange} variant="compact" />
    );

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));
    await user.click(screen.getByRole('button', { name: 'Add LOQ to favourites' }));

    expect(handleInstrumentChange).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(FAVORITE_INSTRUMENTS_STORAGE_KEY) ?? '[]')).toEqual([loqInstrument?.id]);
    expect(screen.getByRole('button', { name: 'Remove LOQ from favourites' })).toBeInTheDocument();

    expect(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(instruments.length);
    expect(getMenuItemIndex('LOQ')).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Remove LOQ from favourites' }));
    expect(getMenuItemIndex('ALF')).toBe(0);
    expect(getMenuItemIndex('LOQ')).toBeGreaterThan(getMenuItemIndex('LARMOR'));
    expect(handleInstrumentChange).not.toHaveBeenCalled();
  });
});
