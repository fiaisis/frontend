import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import PageTitle from './PageTitle';

describe('PageTitle', () => {
  beforeEach(() => {
    document.title = 'Original Title';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('sets document title for homepage', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <PageTitle>Homepage</PageTitle>
      </MemoryRouter>
    );

    expect(document.title).toBe('Homepage - FIA');
  });

  test('sets document title for instruments page', () => {
    render(
      <MemoryRouter initialEntries={['/isis-instruments']}>
        <PageTitle>Instruments</PageTitle>
      </MemoryRouter>
    );

    expect(document.title).toBe('Instruments - FIA');
  });

  test('sets document title for reduction history', () => {
    render(
      <MemoryRouter initialEntries={['/reduction-history']}>
        <PageTitle>Reduction History</PageTitle>
      </MemoryRouter>
    );

    expect(document.title).toBe('Reduction History - FIA');
  });

  test('sets document title for reduction history with instrument', () => {
    render(
      <MemoryRouter initialEntries={['/reduction-history/iris']}>
        <PageTitle>Reduction History</PageTitle>
      </MemoryRouter>
    );

    expect(document.title).toBe('Reduction History - iris - FIA');
  });

  test('sets document title for experiment viewer', () => {
    render(
      <MemoryRouter initialEntries={['/experiment-viewer?instrument=iris']}>
        <PageTitle>Experiment Viewer</PageTitle>
      </MemoryRouter>
    );

    expect(document.title).toBe('Experiment Viewer - iris - FIA');
  });

  test('sets document title for live data', () => {
    render(
      <MemoryRouter initialEntries={['/live-data/iris']}>
        <PageTitle>Live Data</PageTitle>
      </MemoryRouter>
    );

    expect(document.title).toBe('Live Data - iris - FIA');
  });

  test('sets document title for data viewer', () => {
    render(
      <MemoryRouter initialEntries={['/data-viewer/view/iris/123/file.h5']}>
        <PageTitle>Data Viewer</PageTitle>
      </MemoryRouter>
    );

    expect(document.title).toBe('Data Viewer - file.h5 - FIA');
  });
});
