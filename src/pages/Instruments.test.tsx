import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';

import Instruments from './Instruments';
import { instruments } from '../lib/instrumentData';
import { FAVORITE_INSTRUMENTS_STORAGE_KEY } from '../lib/instrumentFavorites';

const renderInstrumentsPage = (): void => {
  render(
    <MemoryRouter initialEntries={['/isis-instruments']}>
      <Instruments />
    </MemoryRouter>
  );
};

describe('Instruments', () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem(FAVORITE_INSTRUMENTS_STORAGE_KEY);
  });

  test('opens instrument search from the breadcrumb and filters instrument cards', async () => {
    const user = userEvent.setup();

    renderInstrumentsPage();

    const searchButton = screen.getByRole('button', { name: /Instrument search:\s+Search for instrument/ });
    expect(searchButton).toHaveTextContent('Search for instrument');
    expect(screen.queryByPlaceholderText('Instrument, technique or scientist')).not.toBeInTheDocument();

    await user.click(searchButton);
    await user.type(screen.getByPlaceholderText('Instrument, technique or scientist'), 'ARGUS');

    await user.click(screen.getByRole('menuitem', { name: /ARGUS\s+Muon spectroscopy/ }));

    await waitFor(() => expect(screen.getAllByTestId('instrument-card')).toHaveLength(1));
    expect(screen.getByRole('heading', { name: 'ARGUS' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ALF' })).not.toBeInTheDocument();
  });

  test('keeps breadcrumb section filters mutually exclusive', async () => {
    const user = userEvent.setup();
    const loqInstrument = instruments.find((instrument) => instrument.name === 'LOQ');

    if (!loqInstrument) {
      throw new Error('LOQ instrument fixture is missing');
    }

    localStorage.setItem(FAVORITE_INSTRUMENTS_STORAGE_KEY, JSON.stringify([loqInstrument.id]));
    renderInstrumentsPage();

    await user.click(screen.getByRole('button', { name: /Instrument search:\s+Search for instrument/ }));
    await user.click(screen.getByRole('button', { name: /Muon spectroscopy/ }));

    await waitFor(() => expect(screen.getByRole('heading', { hidden: true, name: 'ARGUS' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { hidden: true, name: 'LOQ' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Favourites\s+\(1\)/ }));

    await waitFor(() => expect(screen.getByRole('heading', { hidden: true, name: 'LOQ' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { hidden: true, name: 'ARGUS' })).not.toBeInTheDocument();
  });
});
