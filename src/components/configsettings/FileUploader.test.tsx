import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import FileUploader from './FileUploader';
import { fiaApi } from '../../lib/api';

import type { ChangeEvent } from 'react';

vi.mock('../../lib/api', () => ({
  fiaApi: {
    post: vi.fn(),
  },
}));

function fileSelectionEvent(file: File | null): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      files: file ? [file] : null,
    },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

describe('FileUploader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test('stores the selected file and exposes a selection message', () => {
    const file = new File(['print("reduce")'], 'reduce.py', { type: 'text/x-python' });
    const { result } = renderHook(() => FileUploader('/extras/loq'));

    act(() => {
      result.current.handleFileSelection(fileSelectionEvent(file));
    });

    expect(result.current.selectedFile).toBe(file);
    expect(result.current.uploadMessage).toBe('Selected file: reduce.py');
  });

  test('clears the selection message when the file input has no files', () => {
    const { result } = renderHook(() => FileUploader('/extras/loq'));

    act(() => {
      result.current.handleFileSelection(fileSelectionEvent(null));
    });

    expect(result.current.selectedFile).toBeNull();
    expect(result.current.uploadMessage).toBe('');
  });

  test('uploads the selected file to the instrument-specific endpoint', async () => {
    const file = new File(['script contents'], 'loq_reduction.py', { type: 'text/x-python' });
    const { result } = renderHook(() => FileUploader('/extras/loq'));

    vi.mocked(fiaApi.post).mockResolvedValue({ data: {} });

    act(() => {
      result.current.handleFileSelection(fileSelectionEvent(file));
    });

    await act(async () => {
      await result.current.handleFileUpload();
    });

    expect(fiaApi.post).toHaveBeenCalledWith('/extras/loq/loq_reduction.py', expect.any(FormData));

    const formData = vi.mocked(fiaApi.post).mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
    expect(result.current.uploadMessage).toBe('Uploaded file: loq_reduction.py');
  });

  test('does not post when no file has been selected', async () => {
    const { result } = renderHook(() => FileUploader('/extras/loq'));

    await act(async () => {
      await result.current.handleFileUpload();
    });

    expect(fiaApi.post).not.toHaveBeenCalled();
  });

  test('logs upload failures and rejects with a user-facing error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const file = new File(['script contents'], 'loq_reduction.py', { type: 'text/x-python' });
    const uploadError = new Error('upload failed');
    const { result } = renderHook(() => FileUploader('/extras/loq'));

    vi.mocked(fiaApi.post).mockRejectedValue(uploadError);

    act(() => {
      result.current.handleFileSelection(fileSelectionEvent(file));
    });

    await expect(result.current.handleFileUpload()).rejects.toThrow('Failed to upload the file');
    expect(consoleError).toHaveBeenCalledWith('Error uploading file:', uploadError);
  });
});
