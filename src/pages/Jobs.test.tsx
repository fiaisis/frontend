import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import Jobs from './Jobs';

vi.mock('../components/jobs/JobTable', () => ({
  default: () => <div data-testid="job-table" />,
}));

vi.mock('../components/jobs/Filters', () => ({
  default: () => null,
}));

vi.mock('../components/configsettings/InstrumentConfigDrawer', () => ({
  default: () => null,
}));

vi.mock('./IMATViewer', () => ({
  default: () => <div data-testid="imat-viewer" />,
}));

const renderJobs = (initialPath: string): void => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Route
        path={[
          '/reduction-history/:instrumentName/latest-image',
          '/reduction-history/:instrumentName/stack-viewer',
          '/reduction-history/:instrumentName',
          '/reduction-history',
        ]}
      >
        <Jobs />
      </Route>
    </MemoryRouter>
  );
};

describe('Jobs', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows the selected instrument before the browse instruments breadcrumb', () => {
    renderJobs('/reduction-history/LOQ');

    const breadcrumb = screen.getByLabelText('breadcrumb');
    const breadcrumbText = breadcrumb.textContent ?? '';

    expect(within(breadcrumb).getByRole('link', { name: 'LOQ' })).toBeInTheDocument();
    expect(within(breadcrumb).getByRole('button', { name: /Instrument:\s+Browse instruments/ })).toHaveTextContent(
      'Browse instruments'
    );
    expect(breadcrumbText.indexOf('LOQ')).toBeLessThan(breadcrumbText.indexOf('Browse instruments'));
  });

  test('shows clear filters in the breadcrumb instrument selector', async () => {
    const user = userEvent.setup();

    renderJobs('/reduction-history/LOQ');

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Browse instruments/ }));

    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View all reductions' })).not.toBeInTheDocument();
  });

  test('keeps the selected IMAT instrument before browse instruments on image views', () => {
    renderJobs('/reduction-history/IMAT/latest-image');

    const breadcrumb = screen.getByLabelText('breadcrumb');
    const breadcrumbText = breadcrumb.textContent ?? '';
    const imatViewGroup = within(breadcrumb).getByRole('group', { name: 'IMAT view' });
    const browseInstrumentsButton = within(breadcrumb).getByRole('button', {
      name: /Instrument:\s+Browse instruments/,
    });

    expect(within(breadcrumb).getByRole('link', { name: 'IMAT' })).toBeInTheDocument();
    expect(browseInstrumentsButton).toHaveTextContent('Browse instruments');
    expect(browseInstrumentsButton.closest('li')).not.toBe(imatViewGroup.closest('li'));
    expect(within(imatViewGroup).getByRole('button', { name: 'Reduction history' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(within(imatViewGroup).getByRole('button', { name: 'Latest image' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(imatViewGroup).getByRole('button', { name: 'Stack viewer' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(breadcrumbText.indexOf('IMAT')).toBeLessThan(breadcrumbText.indexOf('Browse instruments'));
    expect(breadcrumbText.indexOf('Browse instruments')).toBeLessThan(breadcrumbText.indexOf('Latest image'));
  });

  test('switches IMAT breadcrumb buttons exclusively', async () => {
    const user = userEvent.setup();

    renderJobs('/reduction-history/IMAT/latest-image');

    const imatViewGroup = within(screen.getByLabelText('breadcrumb')).getByRole('group', { name: 'IMAT view' });

    await user.click(within(imatViewGroup).getByRole('button', { name: 'Stack viewer' }));

    expect(await screen.findByRole('heading', { name: 'IMAT stack viewer' })).toBeInTheDocument();
    expect(within(imatViewGroup).getByRole('button', { name: 'Reduction history' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(within(imatViewGroup).getByRole('button', { name: 'Latest image' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(within(imatViewGroup).getByRole('button', { name: 'Stack viewer' })).toHaveAttribute('aria-pressed', 'true');
  });
});
