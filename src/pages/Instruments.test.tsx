import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';

import Instruments from './Instruments';
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
});
