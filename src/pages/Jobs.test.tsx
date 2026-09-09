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
  return (
    <>
      <span data-testid="location-search">{location.search}</span>
      <span data-testid="location-path">{location.pathname}</span>
    </>
  );
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

  test('separates the current instrument breadcrumb from the page controls', () => {
    renderJobs('/reduction-history/LOQ');

    const breadcrumb = screen.getByLabelText('breadcrumb');
    const controls = screen.getByRole('group', { name: 'Page controls' });

    expect(within(breadcrumb).getByText('LOQ')).toHaveAttribute('aria-current', 'page');
    expect(within(controls).getByRole('button', { name: /Instrument:\s+Browse instruments/ })).toHaveTextContent(
      'Browse instruments'
    );
    expect(breadcrumb).not.toContainElement(controls);
    expect(screen.queryByRole('combobox', { name: 'IMAT view' })).not.toBeInTheDocument();
    expect(screen.getByTestId('reduction-history-page')).toContainElement(screen.getByTestId('job-table'));

    const pageHeader = screen.getByTestId('reduction-history-page-header');
    expect(pageHeader).toContainElement(breadcrumb);
    expect(pageHeader).toContainElement(controls);
    expect(within(pageHeader).queryByRole('heading', { name: 'LOQ reduction history' })).not.toBeInTheDocument();
    expect(screen.getByTestId('job-table')).toContainElement(screen.getByRole('button', { name: 'Edit config' }));
    expect(screen.getByRole('button', { name: 'Edit config' })).toHaveAttribute('data-placement', 'toolbar');
  });

  test('shows support filtering without a clear filters button in the instrument selector', async () => {
    const user = userEvent.setup();

    renderJobs('/reduction-history/LOQ');

    await user.click(screen.getByRole('button', { name: /Instrument:\s+Browse instruments/ }));

    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Hide unsupported instruments' })).toBeInTheDocument();
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
    await user.click(within(screen.getByLabelText('breadcrumb')).getByRole('combobox', { name: 'IMAT view' }));
    await user.click(screen.getByRole('option', { name: 'Latest image' }));

    await waitFor(() => expect(screen.getByTestId('location-search')).not.toHaveTextContent('reductionId'));
    expect(screen.getByTestId('imat-viewer')).toBeInTheDocument();
  });

  test('places the selected IMAT view in the breadcrumbs and preserves the parent link', () => {
    renderJobs('/reduction-history/IMAT/latest-image');

    const breadcrumb = screen.getByLabelText('breadcrumb');
    const controls = screen.getByRole('group', { name: 'Page controls' });
    const imatViewSelect = within(breadcrumb).getByRole('combobox', { name: 'IMAT view' });
    const browseInstrumentsButton = within(controls).getByRole('button', {
      name: /Instrument:\s+Browse instruments/,
    });

    expect(within(breadcrumb).getByRole('link', { name: 'IMAT' })).toHaveAttribute('href', '/reduction-history/IMAT');
    expect(browseInstrumentsButton).toHaveTextContent('Browse instruments');
    expect(breadcrumb).not.toContainElement(browseInstrumentsButton);
    expect(controls).not.toContainElement(imatViewSelect);
    expect(imatViewSelect).toHaveTextContent('Latest image');
    expect(imatViewSelect).toHaveAttribute('aria-current', 'page');
  });

  test('switches IMAT breadcrumb options exclusively and preserves query handling and parent navigation', async () => {
    const user = userEvent.setup();

    renderJobs('/reduction-history/IMAT/stack-viewer?jobId=42&imageIndex=3&keep=yes');
    const imatViewSelect = within(screen.getByLabelText('breadcrumb')).getByRole('combobox', { name: 'IMAT view' });
    await user.click(imatViewSelect);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Stack viewer' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: 'Stack viewer' }));
    expect(screen.getByTestId('location-search')).toHaveTextContent('imageIndex=3');
    await user.click(imatViewSelect);
    await user.click(screen.getByRole('option', { name: 'Latest image' }));
    expect(screen.getByTestId('location-path')).toHaveTextContent('/reduction-history/IMAT/latest-image');
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('imageIndex');
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('jobId');
    expect(screen.getByTestId('location-search')).toHaveTextContent('keep=yes');
    await user.click(imatViewSelect);
    await user.click(screen.getByRole('option', { name: 'Stack viewer' }));

    expect(await screen.findByTestId('imat-viewer')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'IMAT stack viewer' })).not.toBeInTheDocument();
    expect(imatViewSelect).toHaveTextContent('Stack viewer');
    expect(screen.getByTestId('location-path')).toHaveTextContent('/reduction-history/IMAT/stack-viewer');
    await user.click(imatViewSelect);
    await user.click(screen.getByRole('option', { name: 'Reduction history' }));
    expect(screen.getByTestId('job-table')).toBeInTheDocument();
    expect(imatViewSelect).toHaveTextContent('Reduction history');
    expect(screen.getByTestId('location-path').textContent).toBe('/reduction-history/IMAT');
    await user.click(imatViewSelect);
    await user.click(screen.getByRole('option', { name: 'Latest image' }));
    await user.click(within(screen.getByLabelText('breadcrumb')).getByRole('link', { name: 'IMAT' }));
    expect(imatViewSelect).toHaveTextContent('Reduction history');
    expect(screen.getByTestId('job-table')).toBeInTheDocument();
  });
});
