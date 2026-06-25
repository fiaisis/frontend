import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import Homepage from './Homepage';

vi.mock('@mui/icons-material/OpenInNew', () => ({
  default: () => null,
}));

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTranslation: () => [(key: string) => key],
}));

function renderHomepage(): void {
  render(
    <ThemeProvider theme={createTheme()}>
      <MemoryRouter>
        <Homepage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Homepage', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the primary homepage content and navigation actions', () => {
    renderHomepage();

    expect(screen.getByText(/Data reduction/)).toBeInTheDocument();
    expect(screen.getByText(/large-scale/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Reduce and perform basic analysis remotely from a clean web interface',
      })
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: "View FIA's data reductions" })).toHaveAttribute(
      'href',
      '/reduction-history'
    );
    expect(screen.getByRole('link', { name: 'Browse instruments' })).toHaveAttribute('href', '/instruments');
    expect(screen.getByRole('link', { name: 'Read more' })).toHaveAttribute(
      'href',
      'https://www.isis.stfc.ac.uk/Pages/About.aspx'
    );
    expect(screen.getByRole('link', { name: 'Instrument info' })).toHaveAttribute(
      'href',
      'https://www.isis.stfc.ac.uk/Pages/Instruments.aspx'
    );
  });
});
