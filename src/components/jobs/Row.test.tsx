import { createTheme, Table, TableBody, ThemeProvider } from '@mui/material';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { JOB_TABLE_ROW_HEIGHT } from './constants';
import Row, { ReductionDetailsModal } from './Row';
import { fiaApi } from '../../lib/api';
import { Job } from '../../lib/types';

const analyticsEvent = vi.hoisted(() => vi.fn());

vi.mock('react-ga4', () => ({ default: { event: analyticsEvent } }));

vi.mock('../../lib/api', () => ({
  fiaApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 42,
  start: '2026-01-01T10:00:00Z',
  end: '2026-01-01T10:05:00Z',
  state: 'SUCCESSFUL',
  status_message: '',
  runner_image: 'registry@mantid:6.9',
  type: 'JobType.REDUCTION',
  inputs: { wavelength: 4.5, normalise: true, optionalValue: null },
  outputs: "['result.nxs', 'report.txt']",
  stacktrace: '',
  script: { value: 'reduce()' },
  run: {
    experiment_number: 12345,
    filename: '/data/LOQ00012345.raw',
    run_start: '2026-01-01T09:00:00Z',
    run_end: '2026-01-01T09:30:00Z',
    title: 'Polymer sample',
    users: 'Ada, Grace',
    good_frames: 1000,
    raw_frames: 1100,
    instrument_name: 'LOQ',
  },
  ...overrides,
});

const defaultRowProps = {
  index: 0,
  isSelected: false,
  toggleSelection: vi.fn(),
  onOpenDetails: vi.fn(),
};

const renderRow = (job: Job = makeJob(), overrides: Partial<typeof defaultRowProps> = {}): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <Table>
        <TableBody>
          <Row job={job} {...defaultRowProps} {...overrides} />
        </TableBody>
      </Table>
    </MemoryRouter>
  );

const defaultModalProps: React.ComponentProps<typeof ReductionDetailsModal> = {
  open: true,
  jobId: 42,
  job: makeJob(),
  loading: false,
  error: null,
  onRetry: vi.fn(),
  onClose: vi.fn(),
  resubmitJob: vi.fn(async () => undefined),
  refreshJobs: vi.fn(),
  mantidVersions: { 'mantid:6.9': 'Mantid 6.9' },
};

const lightTestTheme = createTheme();
const darkTestTheme = createTheme({ palette: { mode: 'dark' } });

const CurrentLocation = (): React.ReactElement => {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname + location.search}</output>;
};

const setMediaQueryMatches = (matches: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(
      (query: string): MediaQueryList =>
        ({
          matches,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(() => false),
        }) as MediaQueryList
    )
  );
};

const ModalHarness: React.FC<{
  overrides: Partial<React.ComponentProps<typeof ReductionDetailsModal>>;
  mode: 'light' | 'dark';
}> = ({ overrides, mode }) => {
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTestTheme : lightTestTheme}>
      <CurrentLocation />
      <header data-testid="scigateway-topbar-underlay">SciGateway top bar</header>
      <aside data-testid="scigateway-sidemenu-underlay">SciGateway side menu</aside>
      <main data-testid="reduction-details-page-container">
        <div data-testid="reduction-details-breadcrumb-underlay">Reduction history breadcrumbs</div>
        <ReductionDetailsModal {...defaultModalProps} {...overrides} />
      </main>
      <footer data-testid="scigateway-footer-underlay">SciGateway footer</footer>
    </ThemeProvider>
  );
};

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof ReductionDetailsModal>> = {},
  mode: 'light' | 'dark' = 'light'
): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <ModalHarness overrides={overrides} mode={mode} />
    </MemoryRouter>
  );

describe('Row and reduction details modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMediaQueryMatches(false);
    vi.mocked(fiaApi.get).mockResolvedValue({ status: 200, data: 'file-content' });
    vi.mocked(fiaApi.post).mockResolvedValue({ status: 200, data: 'zip-content' });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('opens details from the summary row without expanding it or intercepting selection', async () => {
    const user = userEvent.setup();
    const toggleSelection = vi.fn();
    const onOpenDetails = vi.fn();
    const job = makeJob();

    renderRow(job, { toggleSelection, onOpenDetails });

    const row = screen.getByRole('row', { name: 'View reduction 42 details' });
    expect(row).toHaveStyle({ height: `${JOB_TABLE_ROW_HEIGHT}px` });
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();

    await user.click(row);
    expect(onOpenDetails).toHaveBeenCalledWith(job);

    onOpenDetails.mockClear();
    const statusIcon = screen.getByLabelText('Reduction state: SUCCESSFUL');
    fireEvent.mouseEnter(statusIcon.parentElement as HTMLElement);
    await user.click(screen.getByRole('checkbox', { name: 'Select reduction 42' }));

    expect(toggleSelection).toHaveBeenCalledWith(42);
    expect(onOpenDetails).not.toHaveBeenCalled();

    expect(screen.queryByRole('button', { name: 'View reduction 42 details' })).not.toBeInTheDocument();

    row.focus();
    await user.keyboard('{Enter}');
    expect(onOpenDetails).toHaveBeenCalledWith(job);

    onOpenDetails.mockClear();
    await user.keyboard(' ');
    expect(onOpenDetails).toHaveBeenCalledWith(job);
  });

  test('shows successful reduction details across three tabs and preserves viewer and download actions', async () => {
    const user = userEvent.setup();

    renderModal();

    const modal = screen.getByTestId('reduction-details-modal');
    expect(modal).toHaveStyle({ maxWidth: '1600px', maxHeight: '720px' });
    expect(modal.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByTestId('reduction-details-backdrop')).toHaveStyle({ position: 'fixed' });
    expect(modal.parentElement).toHaveStyle({ position: 'fixed', inset: '0', zIndex: '1300' });
    expect(screen.getByTestId('scigateway-topbar-underlay')).toBeInTheDocument();
    expect(screen.getByTestId('scigateway-sidemenu-underlay')).toBeInTheDocument();
    expect(screen.getByTestId('scigateway-footer-underlay')).toBeInTheDocument();
    expect(screen.getByTestId('reduction-details-breadcrumb-underlay')).toBeInTheDocument();
    expect(screen.getByText('[SUCCESS] Reduction performed successfully')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Reduction inputs' })).toHaveAttribute('aria-selected', 'true');
    screen.getAllByRole('tab').forEach((tab) => expect(tab).toHaveClass('MuiTab-fullWidth'));
    expect(screen.getByRole('table', { name: 'Reduction inputs' })).toBeInTheDocument();
    const inputActions = screen.getByTestId('reduction-input-actions');
    const valueEditor = screen.getByRole('link', { name: /Value editor/ });
    expect(inputActions).toContainElement(valueEditor);
    expect(inputActions).toContainElement(screen.getByRole('button', { name: 'Resubmit' }));
    expect(valueEditor).toHaveAttribute('href', '/reduction-history/LOQ/value-editor-42');

    await user.click(screen.getByRole('tab', { name: 'Run details' }));
    const runDetails = screen.getByRole('table', { name: 'Run details' });
    expect(within(runDetails).getByText('Mantid 6.9')).toBeInTheDocument();
    expect(within(runDetails).getByText('LOQ')).toBeInTheDocument();
    expect(screen.getByTestId('reduction-run-actions')).toHaveStyle({ minHeight: '60px' });

    await user.click(screen.getByRole('tab', { name: 'Reduction outputs' }));
    expect(screen.getByRole('link', { name: /Experiment viewer/ })).toHaveAttribute(
      'href',
      '/experiment-viewer?instrument=LOQ&experiment=12345'
    );
    expect(screen.getByText('result.nxs')).toBeInTheDocument();
    expect(screen.getByText('report.txt')).toBeInTheDocument();
    const outputActions = screen.getByTestId('reduction-output-actions');
    expect(outputActions).toHaveTextContent('2 output files');
    expect(outputActions).toContainElement(screen.getByRole('link', { name: /Experiment viewer/ }));
    expect(outputActions).toContainElement(screen.getByRole('button', { name: 'Download all' }));

    expect(screen.queryByRole('button', { name: 'External viewer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    const outputRow = screen.getByRole('button', { name: 'Actions for result.nxs' });
    expect(outputRow).toContainElement(screen.getByText('result.nxs'));
    await user.click(screen.getByText('result.nxs'));
    expect(screen.getByRole('menu', { name: 'Actions for result.nxs' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'External viewer',
      'Experiment viewer',
      'Download',
    ]);
    await user.click(screen.getByRole('menuitem', { name: 'External viewer' }));
    expect(window.open).toHaveBeenCalledWith('/fia/data-viewer/view/LOQ/12345/result.nxs', '_blank');
    expect(analyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ label: 'View button', value: 42 }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    const reportActions = screen.getByRole('button', { name: 'Actions for report.txt' });
    reportActions.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu', { name: 'Actions for report.txt' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Experiment viewer' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(reportActions).toHaveFocus();
    expect(defaultModalProps.onClose).not.toHaveBeenCalled();

    await user.keyboard(' {End}{Enter}');
    await waitFor(() =>
      expect(fiaApi.get).toHaveBeenCalledWith(
        '/job/42/filename/report.txt',
        expect.objectContaining({ responseType: 'blob' })
      )
    );
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Download all' }));
    await waitFor(() =>
      expect(fiaApi.post).toHaveBeenCalledWith(
        '/job/download-zip',
        { 42: ['result.nxs', 'report.txt'] },
        expect.objectContaining({ responseType: 'blob' })
      )
    );
  });

  test('opens the selected output in Experiment viewer and keeps the whole-experiment footer link', async () => {
    const user = userEvent.setup();
    const filename = 'result & scan #1.nxs';
    renderModal({ job: makeJob({ outputs: `['${filename}']` }) });
    await user.click(screen.getByRole('tab', { name: 'Reduction outputs' }));
    expect(screen.getByRole('link', { name: 'Experiment viewer' })).toHaveAttribute(
      'href',
      '/experiment-viewer?instrument=LOQ&experiment=12345'
    );

    await user.click(screen.getByRole('button', { name: `Actions for ${filename}` }));
    const link = screen.getByRole('menuitem', { name: 'Experiment viewer' });
    const destination = `/experiment-viewer?${new URLSearchParams({ instrument: 'LOQ', experiment: '12345', jobId: '42', file: filename })}`;
    expect(link).toHaveAttribute('href', destination);
    expect(link).not.toHaveAttribute('target');
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.getByTestId('current-location')).toHaveTextContent(destination);
    expect(window.open).not.toHaveBeenCalled();
    expect(analyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Experiment viewer button', value: 42 })
    );
  });

  test('shows all three detail sections together instead of tabs on large screens', () => {
    setMediaQueryMatches(true);
    renderModal();

    expect(screen.queryByTestId('reduction-details-tabs')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    const inputs = screen.getByRole('region', { name: 'Reduction inputs' });
    const runDetails = screen.getByRole('region', { name: 'Run details' });
    const outputs = screen.getByRole('region', { name: 'Reduction outputs' });

    expect(inputs).toBeVisible();
    expect(runDetails).toBeVisible();
    expect(outputs).toBeVisible();
    expect(within(inputs).getByRole('table', { name: 'Reduction inputs' })).toBeInTheDocument();
    expect(within(runDetails).getByRole('table', { name: 'Run details' })).toBeInTheDocument();
    expect(within(outputs).getByText('result.nxs')).toBeInTheDocument();
  });

  test('uses high-contrast dark surfaces, tabs, and action buttons', async () => {
    const user = userEvent.setup();
    renderModal({}, 'dark');

    expect(screen.getByTestId('reduction-details-modal')).toHaveStyle({ backgroundColor: '#10171f' });
    expect(screen.getByTestId('reduction-details-tabs')).toHaveStyle({ backgroundColor: '#151e27' });
    expect(screen.getByRole('tab', { name: 'Reduction inputs' })).toHaveStyle({ color: '#90caf9' });
    expect(screen.getByRole('button', { name: 'Close reduction details' })).toHaveStyle({
      color: '#f5f7fa',
      borderColor: '#71869a',
      backgroundColor: '#1b2834',
    });

    await user.click(screen.getByRole('tab', { name: 'Reduction outputs' }));
    const outputRow = screen.getByRole('button', { name: 'Actions for result.nxs' });
    const experimentViewerButton = screen.getByRole('link', { name: /Experiment viewer/ });
    const downloadAllButton = screen.getByRole('button', { name: 'Download all' });

    expect(outputRow).toHaveStyle({
      color: '#f5f7fa',
      borderColor: '#33414e',
      backgroundColor: '#151e27',
    });
    expect(experimentViewerButton).toHaveStyle({
      color: '#f5f7fa',
      borderColor: '#71869a',
      backgroundColor: '#1b2834',
    });
    expect(downloadAllButton).toHaveStyle({
      color: '#0b1b29',
      backgroundColor: '#90caf9',
    });

    await user.click(outputRow);
    expect(screen.getByRole('menu').closest('.MuiPaper-root')).toHaveStyle({
      color: '#f5f7fa',
      backgroundColor: '#151e27',
    });
    expect(screen.getByRole('menuitem', { name: 'External viewer' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Experiment viewer' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Download' })).toBeVisible();
  });

  test('uses the modal action palette for the retry button', () => {
    renderModal({ job: null, error: 'The reduction details could not be loaded.' }, 'dark');

    expect(screen.getByRole('button', { name: 'Retry' })).toHaveStyle({
      color: '#f5f7fa',
      borderColor: '#71869a',
      backgroundColor: '#1b2834',
    });
  });

  test('resubmits from the inputs tab and refreshes after the completion delay', async () => {
    vi.useFakeTimers();
    const resubmitJob = vi.fn(async () => undefined);
    const refreshJobs = vi.fn();

    renderModal({ resubmitJob, refreshJobs });

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Resubmit' })));
    expect(resubmitJob).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));

    act(() => vi.advanceTimersByTime(2000));

    expect(refreshJobs).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Resubmit started successfully for reduction 42')).toBeInTheDocument();
  });

  test('shows failed stacktraces inside the reduction outputs tab', async () => {
    const user = userEvent.setup();
    const failedJob = makeJob({
      state: 'ERROR',
      status_message: 'Algorithm failed',
      stacktrace: 'Traceback: invalid workspace',
      outputs: '',
    });

    renderModal({ job: failedJob });
    await user.click(screen.getByRole('tab', { name: 'Reduction outputs' }));

    expect(screen.getByText('[ERROR] Algorithm failed')).toBeInTheDocument();
    expect(screen.getByText('Stacktrace')).toBeInTheDocument();
    expect(screen.getByText('Traceback: invalid workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download all' })).toBeDisabled();
  });

  test('offers the stack viewer instead of the experiment viewer for successful IMAT jobs', async () => {
    const user = userEvent.setup();
    const imatJob = makeJob({ run: { ...makeJob().run, instrument_name: 'IMAT' } });

    renderModal({ job: imatJob });
    await user.click(screen.getByRole('tab', { name: 'Reduction outputs' }));

    expect(screen.getByRole('link', { name: /Stack viewer/ })).toHaveAttribute(
      'href',
      '/reduction-history/IMAT/stack-viewer?jobId=42&experiment=12345'
    );
    expect(screen.queryByRole('link', { name: /Experiment viewer/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actions for result.nxs' }));
    expect(screen.queryByRole('menuitem', { name: 'Experiment viewer' })).not.toBeInTheDocument();
  });

  test('closes from the close button, Escape, and the viewport backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderModal({ onClose });

    await user.click(screen.getByRole('button', { name: 'Close reduction details' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);

    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
