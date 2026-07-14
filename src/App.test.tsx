import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import App from './App';
import { clearFailedAuthRequestsQueue, retryFailedAuthRequests } from './lib/api';

vi.mock('react-ga4', () => ({
  default: {
    event: vi.fn(),
    initialize: vi.fn(),
    send: vi.fn(),
  },
}));

vi.mock('./lib/api', () => ({
  clearFailedAuthRequestsQueue: vi.fn(),
  retryFailedAuthRequests: vi.fn(),
}));

vi.mock('./GlobalStyles', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./pages/Homepage', () => ({
  default: () => <h1>Homepage</h1>,
}));

vi.mock('./pages/Instruments', () => ({
  default: () => <h1>ISIS instruments</h1>,
}));

vi.mock('./pages/Jobs', () => ({
  default: () => <h1>Jobs</h1>,
}));

vi.mock('./pages/ValueEditor', () => ({
  default: () => <h1>Value editor</h1>,
}));

vi.mock('./pages/ExperimentViewer', () => ({
  default: () => <h1>Experiment viewer</h1>,
}));

vi.mock('./pages/LiveData', () => ({
  default: () => <h1>Live data</h1>,
}));

vi.mock('./pages/LiveValueEditor', () => ({
  default: () => <h1>Live value editor</h1>,
}));

vi.mock('./pages/DataViewer', () => ({
  default: () => <h1>Data viewer</h1>,
}));

function renderAt(path: string): void {
  window.history.pushState({}, '', path);
  render(<App />);
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    window.history.pushState({}, '', '/fia');
  });

  afterEach(() => {
    cleanup();
    document.getElementById('app-scroll-test-host')?.remove();
    vi.restoreAllMocks();
  });

  test('renders the homepage at the FIA root route', () => {
    renderAt('/fia');

    expect(screen.getByRole('heading', { name: 'Homepage' })).toBeInTheDocument();
  });

  test('routes to the instruments page under the FIA basename', () => {
    renderAt('/fia/isis-instruments');

    expect(screen.getByRole('heading', { name: 'ISIS instruments' })).toBeInTheDocument();
  });

  test('scrolls to the top when the pathname changes', async () => {
    renderAt('/fia');
    vi.mocked(window.scrollTo).mockClear();

    act(() => {
      window.history.pushState({}, '', '/fia/isis-instruments');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    expect(await screen.findByRole('heading', { name: 'ISIS instruments' })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  test('scrolls the nearest scrollable container when hosted in SciGateway', async () => {
    const scrollContainer = document.createElement('div');
    const pluginWrapper = document.createElement('div');
    const pluginRoot = document.createElement('div');
    const scrollContainerScrollTo = vi.fn();

    scrollContainer.id = 'app-scroll-test-host';
    scrollContainer.style.overflowY = 'auto';
    Object.defineProperty(scrollContainer, 'scrollTo', { configurable: true, value: scrollContainerScrollTo });
    pluginRoot.id = 'fia';
    pluginWrapper.appendChild(pluginRoot);
    scrollContainer.appendChild(pluginWrapper);
    document.body.appendChild(scrollContainer);

    render(<App />, { container: pluginRoot });
    scrollContainerScrollTo.mockClear();
    vi.mocked(window.scrollTo).mockClear();

    act(() => {
      window.history.pushState({}, '', '/fia/isis-instruments');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    expect(await screen.findByRole('heading', { name: 'ISIS instruments' })).toBeInTheDocument();
    expect(scrollContainerScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('routes to IMAT image views under reduction history', () => {
    renderAt('/fia/reduction-history/IMAT/latest-image');
    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();

    cleanup();

    renderAt('/fia/reduction-history/IMAT/stack-viewer');
    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument();
  });

  test('redirects the old instruments route to the renamed route', async () => {
    renderAt('/fia/instruments');

    expect(await screen.findByRole('heading', { name: 'ISIS instruments' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/fia/isis-instruments');
  });

  test('redirects unmatched FIA routes back to the homepage', async () => {
    renderAt('/fia/not-a-real-route');

    expect(await screen.findByRole('heading', { name: 'Homepage' })).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/fia\/?$/);
  });

  test('handles SciGateway token refresh and signout events', () => {
    renderAt('/fia');

    act(() => {
      document.dispatchEvent(new CustomEvent('scigateway', { detail: { type: 'scigateway:api:invalidate_token' } }));
      document.dispatchEvent(new CustomEvent('scigateway', { detail: { type: 'scigateway:api:signout' } }));
      document.dispatchEvent(new CustomEvent('scigateway', { detail: { type: 'scigateway:api:plugin_rerender' } }));
    });

    expect(retryFailedAuthRequests).toHaveBeenCalledTimes(1);
    expect(clearFailedAuthRequestsQueue).toHaveBeenCalledTimes(1);
  });
});
