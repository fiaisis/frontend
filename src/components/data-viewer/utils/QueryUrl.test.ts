import { describe, expect, test } from 'vitest';

import { FileQueryUrl } from './FileQueryUrl';
import { TextQueryUrl } from './TextQueryUrl';

describe('data viewer query URL helpers', () => {
  test('prefers an instrument-scoped file query when instrument and experiment number are present', () => {
    expect(FileQueryUrl('LOQ', '12345', 'u123')).toBe('find_file/instrument/LOQ/experiment_number/12345');
  });

  test('builds generic file queries from user or experiment number', () => {
    expect(FileQueryUrl(undefined, undefined, 'u123')).toBe('find_file/generic/user_number/u123');
    expect(FileQueryUrl(undefined, '12345')).toBe('find_file/generic/experiment_number/12345');
    expect(FileQueryUrl()).toBeNull();
  });

  test('prefers an instrument-scoped text query when instrument and experiment number are present', () => {
    expect(TextQueryUrl('LOQ', '12345', 'u123')).toBe('/text/instrument/LOQ/experiment_number/12345');
  });

  test('builds generic text queries from user or experiment number', () => {
    expect(TextQueryUrl(undefined, undefined, 'u123')).toBe('text/generic/user_number/u123');
    expect(TextQueryUrl(undefined, '12345')).toBe('text/generic/experiment_number/12345');
    expect(TextQueryUrl()).toBeNull();
  });
});
