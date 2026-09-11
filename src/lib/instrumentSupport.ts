export const REDUCTION_SUPPORTED_INSTRUMENTS = [
  'ENGINX',
  'GEM',
  'IMAT',
  'IRIS',
  'LOQ',
  'MARI',
  'MERLIN',
  'OSIRIS',
  'SANS2D',
  'TOSCA',
  'VESUVIO',
] as const;

// Used until the live-data support API responds, or if it is unavailable.
export const LIVE_SUPPORTED_INSTRUMENTS_FALLBACK = ['MARI', 'MERLIN'] as const;

export type InstrumentSupportPage = 'reduction-history' | 'experiment-viewer' | 'live-data';

export interface InstrumentSupport {
  page: InstrumentSupportPage;
  instruments: readonly string[];
}

export const getHideUnsupportedStorageKey = (page: InstrumentSupportPage): string =>
  `hideUnsupportedInstruments:${page}`;

export const getStoredHideUnsupported = (page?: InstrumentSupportPage): boolean => {
  try {
    return !page || localStorage.getItem(getHideUnsupportedStorageKey(page)) !== 'false';
  } catch {
    return true;
  }
};

export const setStoredHideUnsupported = (page: InstrumentSupportPage, hidden: boolean): void => {
  try {
    localStorage.setItem(getHideUnsupportedStorageKey(page), String(hidden));
  } catch {
    // Filtering still works when browser storage is unavailable.
  }
};
