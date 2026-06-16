import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import InstrumentSelector from './InstrumentSelector';
import { instruments } from '../../lib/instrumentData';

describe('InstrumentSelector', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders view all reductions plus clickable instrument type headings', async () => {
    const user = userEvent.setup();
    const instrumentTypes = Array.from(new Set(instruments.map((instrument) => instrument.type)));

    render(<InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Instrument\s+View all reductions/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Instrument\s+View all reductions/ }));

    expect(screen.getByRole('menuitem', { name: 'View all reductions' })).toBeInTheDocument();
    instrumentTypes.forEach((instrumentType) => {
      expect(screen.getByRole('menuitem', { name: instrumentType })).toBeInTheDocument();
    });
    expect(screen.queryByRole('menuitem', { name: 'ALF' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Neutron diffraction' }));

    expect(screen.getByRole('menuitem', { name: 'ALF' })).toBeInTheDocument();
  });

  test('passes the selected instrument value to the change handler', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(<InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={handleInstrumentChange} />);

    await user.click(screen.getByRole('button', { name: /Instrument\s+View all reductions/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Small-angle neutron scattering' }));
    await user.click(screen.getByRole('menuitem', { name: 'LOQ' }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith('LOQ');
  });
});
