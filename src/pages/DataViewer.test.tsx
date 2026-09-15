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

  test('fills the viewport above the SciGateway shell for external data viewing', () => {
    renderDataViewer('reduced.nxs');

    const page = screen.getByTestId('nexus-viewer').closest('main');

    expect(page).not.toBeNull();
    expect(page).toHaveStyle({
      position: 'fixed',
      top: '0px',
      left: '0px',
      'z-index': '9999',
      overflow: 'auto',
    });
    expect(page?.style.height).toBe('100vh');
    expect(page?.style.width).toBe('100vw');
  });

  test('shows text files inside the same full-screen page', () => {
    renderDataViewer('reduced.txt');

    expect(screen.getByTestId('text-viewer')).toBeInTheDocument();
  });
});
