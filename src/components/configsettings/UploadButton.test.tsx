import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import UploadButton from './UploadButton';

vi.mock('@mui/icons-material', () => ({
  Edit: () => null,
  UploadFile: () => null,
}));

describe('UploadButton', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders upload and disabled edit controls without a selection message', () => {
    const { container } = render(<UploadButton onChange={vi.fn()} selectedFile={null} uploadMessage="Selected file" />);

    expect(screen.getByRole('button', { name: /select file to upload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change script/i })).toBeDisabled();
    expect(screen.queryByText('Selected file')).not.toBeInTheDocument();

    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('multiple');
  });

  test('shows the upload message once a file is selected', () => {
    const file = new File(['script contents'], 'script.py');

    render(<UploadButton onChange={vi.fn()} selectedFile={file} uploadMessage="Selected file: script.py" />);

    expect(screen.getByText('Selected file: script.py')).toBeInTheDocument();
  });

  test('forwards file input changes to the supplied handler', () => {
    const onChange = vi.fn();
    const file = new File(['script contents'], 'script.py');
    const { container } = render(<UploadButton onChange={onChange} selectedFile={null} uploadMessage="" />);
    const input = container.querySelector('input[type="file"]');

    if (!input) {
      throw new Error('Expected upload input to be rendered');
    }

    fireEvent.change(input, { target: { files: [file] } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
