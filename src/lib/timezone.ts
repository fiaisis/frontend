// Convert an ISO UTC Timestamp to a Locale formatted Datetime string.
export const formatUtcForLocale = (
  isoUtc: string | null,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'medium', hour12: false },
  locale: string = navigator.language
): string => {
  if (!isoUtc) return 'N/A';
  const normalised = isoUtc.endsWith('Z') ? isoUtc : `${isoUtc}Z`;
  const date = new Date(normalised).toLocaleString(locale, opts);
  return date.replace(/,\s?/, ' ');
};
