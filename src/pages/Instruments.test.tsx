import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import Instruments from './Instruments';

vi.mock('@mui/icons-material/ExpandMore', () => ({
  default: () => null,
}));

vi.mock('@mui/icons-material/Star', () => ({
  default: () => null,
}));

vi.mock('@mui/icons-material/StarBorder', () => ({
  default: () => null,
}));

function renderInstruments(): void {
  render(
    <ThemeProvider theme={createTheme()}>
      <MemoryRouter initialEntries={['/instruments']}>
        <Instruments />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Instruments', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('renders configured instruments and expands instrument details', async () => {
    const user = userEvent.setup();

    renderInstruments();

    expect(screen.getByRole('heading', { name: 'ISIS instruments' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'LOQ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'IMAT' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'show more' })[0]);

    expect(screen.getByText('Scientists:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://www.isis.stfc.ac.uk/Pages/ALF.aspx' })).toHaveAttribute(
      'href',
      'https://www.isis.stfc.ac.uk/Pages/ALF.aspx'
    );
    expect(screen.getByRole('link', { name: 'Reduction history' })).toHaveAttribute('href', '/reduction-history/ALF');
  });

  test('loads favorite instruments from storage and persists favorite changes', async () => {
    const user = userEvent.setup();

    localStorage.setItem('favoriteInstruments', JSON.stringify([17]));

    renderInstruments();

    const headings = screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent);
    expect(headings.slice(0, 2)).toEqual(['ISIS instruments', 'LOQ']);

    await user.click(screen.getAllByRole('button', { name: 'add to favorites' })[0]);

    expect(localStorage.getItem('favoriteInstruments')).toBe('[]');
  });
});
