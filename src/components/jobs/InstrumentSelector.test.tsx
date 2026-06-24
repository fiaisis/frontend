import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import InstrumentSelector from './InstrumentSelector';
import { instruments } from '../../lib/instrumentData';
import { FAVORITE_INSTRUMENTS_STORAGE_KEY } from '../../lib/instrumentFavorites';

describe('InstrumentSelector', () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem(FAVORITE_INSTRUMENTS_STORAGE_KEY);
  });

  test('renders view all reductions plus clickable technique filters', async () => {
    const user = userEvent.setup();
    const instrumentTypes = Array.from(new Set(instruments.map((instrument) => instrument.type)));

    render(<InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Instrument\s+View all reductions/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Instrument\s+View all reductions/ }));

    expect(screen.getByRole('menuitem', { name: 'View all reductions' })).toBeInTheDocument();
    instrumentTypes.forEach((instrumentType) => {
      expect(screen.getByRole('button', { name: new RegExp(instrumentType) })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Small-angle neutron scattering\s+\(4\)/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /ALF\s+Neutron diffraction/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Small-angle neutron scattering\s+\(4\)/ }));

    expect(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'ALF' })).not.toBeInTheDocument();
  });

  test('passes the selected instrument value to the change handler', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(<InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={handleInstrumentChange} />);

    await user.click(screen.getByRole('button', { name: /Instrument\s+View all reductions/ }));
    await user.click(screen.getByRole('button', { name: /Small-angle neutron scattering\s+\(4\)/ }));
    await user.click(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('LOQ');
  });

  test('breadcrumb variant shows the selected value without the field label and keeps menu behavior', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentSelector
        selectedInstrument="ALL"
        handleInstrumentChange={handleInstrumentChange}
        variant="breadcrumb"
      />
    );

    const selectorButton = screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ });
    expect(selectorButton).toHaveTextContent('Select an instrument');
    expect(selectorButton).not.toHaveTextContent('Instrument');

    await user.click(selectorButton);
    expect(screen.queryByRole('menuitem', { name: 'View all reductions' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Small-angle neutron scattering\s+\(4\)/ }));
    await user.click(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('LOQ');
  });

  test('scoped breadcrumb variant shows view all reductions as a header button', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentSelector
        selectedInstrument="LOQ"
        handleInstrumentChange={handleInstrumentChange}
        variant="breadcrumb"
      />
    );

    await user.click(screen.getByRole('button', { name: /Instrument:\s+LOQ/ }));

    expect(screen.getByPlaceholderText('Search instruments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all reductions' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'View all reductions' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View all reductions' }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('ALL');
  });

  test('breadcrumb variant shows favourited instruments above the technique list', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    localStorage.setItem(FAVORITE_INSTRUMENTS_STORAGE_KEY, JSON.stringify([17, 29]));

    render(
      <InstrumentSelector
        selectedInstrument="ALL"
        handleInstrumentChange={handleInstrumentChange}
        variant="breadcrumb"
      />
    );

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));

    const favouriteFilter = screen.getByRole('button', { name: /Favourites\s+\(2\)/ });
    expect(favouriteFilter).toBeInTheDocument();

    await user.click(favouriteFilter);

    expect(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /SANS2D\s+Small-angle neutron scattering/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove LOQ from favourites' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove SANS2D from favourites' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /ALF\s+Neutron diffraction/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('LOQ');
  });

  test('lets users favourite instruments from the selector without selecting the row', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();
    const loqInstrument = instruments.find((instrument) => instrument.name === 'LOQ');

    render(
      <InstrumentSelector
        selectedInstrument="ALL"
        handleInstrumentChange={handleInstrumentChange}
        variant="breadcrumb"
      />
    );

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Select an instrument/ }));
    await user.click(screen.getByRole('button', { name: 'Add LOQ to favourites' }));

    expect(handleInstrumentChange).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(FAVORITE_INSTRUMENTS_STORAGE_KEY) ?? '[]')).toEqual([loqInstrument?.id]);
    expect(screen.getByRole('button', { name: 'Remove LOQ from favourites' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Favourites\s+\(1\)/ }));

    expect(screen.getByRole('menuitem', { name: /LOQ\s+Small-angle neutron scattering/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /ALF\s+Neutron diffraction/ })).not.toBeInTheDocument();
  });
});
