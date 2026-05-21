import { describe, expect, test } from 'vitest';

import { formatUtcForLocale } from './timezone';

describe('formatUtcForLocale', () => {
  test('returns N/A for missing timestamps', () => {
    expect(formatUtcForLocale(null)).toBe('N/A');
  });

  test('formats UTC timestamps with the requested locale and options', () => {
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: false,
      timeZone: 'UTC',
    };

    expect(formatUtcForLocale('2025-01-02T03:04:05Z', options, 'en-GB')).toBe('02/01/2025 03:04:05');
  });

  test('treats timestamps without a timezone suffix as UTC', () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    };

    expect(formatUtcForLocale('2025-01-02T03:04:05', options, 'en-GB')).toBe('03:04');
  });
});
