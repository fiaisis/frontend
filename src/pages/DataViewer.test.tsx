import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

import DataViewer from './DataViewer';

vi.mock('../components/data-viewer/NexusViewer', () => ({
  default: () => <div data-testid="nexus-viewer" />,
}));

vi.mock('../components/data-viewer/TextViewer', () => ({
  default: () => <div data-testid="text-viewer" />,
}));

const renderDataViewer = (filename: string): void => {
  render(
    <MemoryRouter initialEntries={[`/data-viewer/view/LOQ/12345/${filename}`]}>
      <Route path="/data-viewer/view/:instrument/:experimentNumber/:filename">
        <DataViewer />
      </Route>
    </MemoryRouter>
  );
};

describe('DataViewer', () => {
  afterEach(() => {
    cleanup();
  });

  test('fits the plugin content area without escaping over the SciGateway shell', () => {
    renderDataViewer('reduced.nxs');

    const page = screen.getByTestId('nexus-viewer').closest('main');

    expect(page).not.toBeNull();
    expect(page?.style.height).toMatch(/^\d+px$/);
    expect(page).toHaveStyle({ width: '100%' });
    expect(page?.style.position).toBe('');
    expect(page?.style.zIndex).toBe('');
  });

  test('keeps text files inside the same constrained page', () => {
    renderDataViewer('reduced.txt');

    expect(screen.getByTestId('text-viewer')).toBeInTheDocument();
  });
});
