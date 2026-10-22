import { cleanup, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import FastStartJobs, { FAST_START_USER_VIEW_ENABLED } from './FastStartJobs';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn((token: string) => {
    if (token === 'staff-token') {
      return { role: 'staff' };
    }
    return { role: 'user' };
  }),
}));

vi.mock('../components/jobs/JobTable', () => ({
  default: ({
    selectedInstrument,
    fastStartOnly,
    userViewRestricted,
    asUser,
    configControl,
  }: {
    selectedInstrument: string;
    fastStartOnly?: boolean;
    userViewRestricted?: boolean;
    asUser: boolean;
    configControl?: React.ReactNode;
  }) => (
    <div data-testid="job-table">
      <span data-testid="selected-instrument">{selectedInstrument}</span>
      <span data-testid="fast-start-only">{String(Boolean(fastStartOnly))}</span>
      <span data-testid="user-view-restricted">{String(Boolean(userViewRestricted))}</span>
      <span data-testid="as-user">{String(asUser)}</span>
      {configControl}
    </div>
  ),
}));

vi.mock('../components/jobs/Filters', () => ({
  default: ({ showAsUserControl }: { showAsUserControl?: boolean }) => (
    <div data-testid="filters-container" data-show-as-user={String(Boolean(showAsUserControl))} />
  ),
}));

const renderFastStartJobs = (initialPath: string, userViewEnabled?: boolean): void => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Route path={['/fast-start-jobs/:instrumentName', '/fast-start-jobs']}>
        <FastStartJobs userViewEnabled={userViewEnabled} />
      </Route>
    </MemoryRouter>
  );
};

describe('FastStartJobs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test('defaults FAST_START_USER_VIEW_ENABLED to false', () => {
    expect(FAST_START_USER_VIEW_ENABLED).toBe(false);
  });

  test('renders fast start jobs in staff view without user-view restriction', () => {
    localStorage.setItem('scigateway:token', 'staff-token');
    localStorage.setItem('asUser', 'false');

    renderFastStartJobs('/fast-start-jobs/LOQ');

    const breadcrumb = screen.getByLabelText('breadcrumb');
    expect(within(breadcrumb).getByRole('link', { name: 'Fast start jobs' })).toHaveAttribute(
      'href',
      '/fast-start-jobs'
    );
    expect(within(breadcrumb).getByText('LOQ')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('fast-start-jobs-page')).toBeInTheDocument();
    expect(screen.getByTestId('selected-instrument')).toHaveTextContent('LOQ');
    expect(screen.getByTestId('fast-start-only')).toHaveTextContent('true');
    expect(screen.getByTestId('user-view-restricted')).toHaveTextContent('false');
    expect(screen.getByTestId('filters-container')).toHaveAttribute('data-show-as-user', 'true');
  });

  test('restricts fast start jobs when a non-staff user views the page or when staff enables "View as user"', () => {
    localStorage.setItem('scigateway:token', 'user-token');

    renderFastStartJobs('/fast-start-jobs');

    expect(screen.getByTestId('fast-start-only')).toHaveTextContent('true');
    expect(screen.getByTestId('user-view-restricted')).toHaveTextContent('true');
    expect(screen.getByTestId('filters-container')).toHaveAttribute('data-show-as-user', 'false');

    cleanup();
    localStorage.setItem('scigateway:token', 'staff-token');
    localStorage.setItem('asUser', 'true');

    renderFastStartJobs('/fast-start-jobs');

    expect(screen.getByTestId('as-user')).toHaveTextContent('true');
    expect(screen.getByTestId('user-view-restricted')).toHaveTextContent('true');
  });

  test('allows user view when userViewEnabled is true', () => {
    localStorage.setItem('scigateway:token', 'user-token');

    renderFastStartJobs('/fast-start-jobs', true);

    expect(screen.getByTestId('fast-start-only')).toHaveTextContent('true');
    expect(screen.getByTestId('user-view-restricted')).toHaveTextContent('false');
  });
});
