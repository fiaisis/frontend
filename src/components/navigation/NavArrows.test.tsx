import { cleanup, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';

import NavArrows from './NavArrows';

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavArrows />
    </MemoryRouter>
  );
}

describe('NavArrows', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders nothing at the root route', () => {
    const { container } = renderAt('/');

    expect(container).toBeEmptyDOMElement();
  });

  test('renders normalized breadcrumb labels and intermediate links', () => {
    renderAt('/instruments/LOQ/experiment-viewer-123/value-editor-456');

    const breadcrumbs = within(screen.getByRole('navigation', { name: 'breadcrumb' }));

    expect(breadcrumbs.getByRole('link', { name: 'FIA' })).toHaveAttribute('href', '/');
    expect(breadcrumbs.getByRole('link', { name: 'Instruments' })).toHaveAttribute('href', '/instruments');
    expect(breadcrumbs.getByRole('link', { name: 'LOQ' })).toHaveAttribute('href', '/instruments/LOQ');
    expect(breadcrumbs.getByRole('link', { name: 'Experiment viewer' })).toHaveAttribute(
      'href',
      '/instruments/LOQ/experiment-viewer-123'
    );
    expect(breadcrumbs.getByText('Value editor')).toBeInTheDocument();
    expect(breadcrumbs.queryByRole('link', { name: 'Value editor' })).not.toBeInTheDocument();
  });

  test('decodes path segments before rendering breadcrumb text', () => {
    renderAt('/live-data/sample%20run');

    const breadcrumbs = within(screen.getByRole('navigation', { name: 'breadcrumb' }));

    expect(breadcrumbs.getByRole('link', { name: 'Live data' })).toHaveAttribute('href', '/live-data');
    expect(breadcrumbs.getByText('sample run')).toBeInTheDocument();
  });
});
