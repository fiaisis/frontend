import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { instruments } from '../../lib/instrumentData';
import InstrumentSelector from './InstrumentSelector';

describe('InstrumentSelector', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders ALL plus every configured instrument as options', async () => {
    const user = userEvent.setup();

    render(<InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Instrument' })).toHaveTextContent('ALL');

    await user.click(screen.getByRole('combobox', { name: 'Instrument' }));

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(instruments.length + 1);
    expect(screen.getByRole('option', { name: 'ALL' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'LOQ' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'IMAT' })).toBeInTheDocument();
  });

  test('passes the selected instrument value to the change handler', async () => {
    const user = userEvent.setup();
    const handleInstrumentChange = vi.fn();

    render(<InstrumentSelector selectedInstrument="ALL" handleInstrumentChange={handleInstrumentChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Instrument' }));
    await user.click(screen.getByRole('option', { name: 'LOQ' }));

    expect(handleInstrumentChange).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange.mock.calls[0][0].target.value).toBe('LOQ');
  });
});
