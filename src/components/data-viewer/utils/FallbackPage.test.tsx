import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { Fallback } from './FallbackPage';

describe('Fallback', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the error state with recovery and support links', () => {
    render(<Fallback />);

    expect(screen.getByRole('img', { name: 'Monkey holding excellent website award' })).toHaveAttribute(
      'src',
      '/res/images/monkey.webp'
    );
    expect(screen.getByRole('heading', { name: 'Something Went Wrong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', 'https://reduce.isis.cclrc.ac.uk');
    expect(screen.getByRole('link', { name: 'fia-support' })).toHaveAttribute('href', 'mailto:fia@stfc.ac.uk');
  });
});
