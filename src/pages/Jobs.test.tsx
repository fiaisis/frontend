import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import Jobs from './Jobs';

vi.mock('../components/jobs/JobTable', () => ({
  default: ({
    configControl,
    selectedReductionId,
    openReductionDetails,
    closeReductionDetails,
  }: {
    configControl?: React.ReactNode;
    selectedReductionId: number | null;
    openReductionDetails: (jobId: number) => void;
    closeReductionDetails: () => void;
  }) => (
    <div data-testid="job-table">
      {configControl}
      <span data-testid="selected-reduction">{selectedReductionId ?? 'none'}</span>
      <button type="button" onClick={() => openReductionDetails(42)}>
        Open reduction 42
      </button>
      <button type="button" onClick={closeReductionDetails}>
        Close reduction details
      </button>
    </div>
  ),
}));

vi.mock('../components/jobs/Filters', () => ({
  default: () => null,
}));

vi.mock('../components/configsettings/InstrumentConfigDrawer', () => ({
  default: ({ buttonPlacement }: { buttonPlacement?: string }) => (
    <button type="button" data-placement={buttonPlacement}>
      Edit config
    </button>
  ),
}));

vi.mock('./IMATViewer', () => ({
  default: () => <div data-testid="imat-viewer" />,
}));

const LocationSearch = (): React.ReactElement => {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
};

const renderJobs = (initialPath: string): void => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationSearch />
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
    expect(screen.getByTestId('reduction-history-page')).toContainElement(screen.getByTestId('job-table'));

    const pageHeader = screen.getByTestId('reduction-history-page-header');
    expect(pageHeader).toContainElement(breadcrumb);
    expect(within(pageHeader).queryByRole('heading', { name: 'LOQ reduction history' })).not.toBeInTheDocument();
    expect(screen.getByTestId('job-table')).toContainElement(screen.getByRole('button', { name: 'Edit config' }));
    expect(screen.getByRole('button', { name: 'Edit config' })).toHaveAttribute('data-placement', 'toolbar');
  });

  test('shows clear filters in the breadcrumb instrument selector', async () => {
    const user = userEvent.setup();

    renderJobs('/reduction-history/LOQ');

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Browse instruments/ }));

    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View all reductions' })).not.toBeInTheDocument();
  });

  test('opens linkable reduction details and closes them through browser history', async () => {
    const user = userEvent.setup();

    renderJobs('/reduction-history/LOQ?page=2');
    await user.click(screen.getByRole('button', { name: 'Open reduction 42' }));

    expect(screen.getByTestId('selected-reduction')).toHaveTextContent('42');
    expect(screen.getByTestId('location-search')).toHaveTextContent('reductionId=42');
    expect(screen.getByTestId('location-search')).toHaveTextContent('page=2');

    await user.click(screen.getByRole('button', { name: 'Close reduction details' }));

    await waitFor(() => expect(screen.getByTestId('selected-reduction')).toHaveTextContent('none'));
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('reductionId');
    expect(screen.getByTestId('location-search')).toHaveTextContent('page=2');
  });

  test('sanitizes invalid direct reduction detail links', async () => {
    renderJobs('/reduction-history/LOQ?reductionId=invalid');

    expect(screen.getByTestId('selected-reduction')).toHaveTextContent('none');
    await waitFor(() => expect(screen.getByTestId('location-search')).not.toHaveTextContent('reductionId'));
  });

  test('closes a directly loaded detail link by replacing only the reduction parameter', async () => {
    const user = userEvent.setup();
    renderJobs('/reduction-history/LOQ?page=2&reductionId=42');

    expect(screen.getByTestId('selected-reduction')).toHaveTextContent('42');
    await user.click(screen.getByRole('button', { name: 'Close reduction details' }));

    await waitFor(() => expect(screen.getByTestId('selected-reduction')).toHaveTextContent('none'));
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('reductionId');
    expect(screen.getByTestId('location-search')).toHaveTextContent('page=2');
  });

  test('clears open reduction details when changing IMAT views', async () => {
    const user = userEvent.setup();
    renderJobs('/reduction-history/IMAT?reductionId=42');

    expect(screen.getByTestId('selected-reduction')).toHaveTextContent('42');
    const imatViewGroup = within(screen.getByLabelText('breadcrumb')).getByRole('group', { name: 'IMAT view' });
    await user.click(within(imatViewGroup).getByRole('button', { name: 'Latest image' }));

    await waitFor(() => expect(screen.getByTestId('location-search')).not.toHaveTextContent('reductionId'));
    expect(screen.getByTestId('imat-viewer')).toBeInTheDocument();
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

    expect(await screen.findByTestId('imat-viewer')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'IMAT stack viewer' })).not.toBeInTheDocument();
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
