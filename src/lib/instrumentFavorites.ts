export const FAVORITE_INSTRUMENTS_STORAGE_KEY = 'favoriteInstruments';

export const getStoredFavoriteInstrumentIds = (): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const storedFavorites = localStorage.getItem(FAVORITE_INSTRUMENTS_STORAGE_KEY);
  if (!storedFavorites) {
    return [];
  }

  try {
    const parsedFavorites: unknown = JSON.parse(storedFavorites);
    return Array.isArray(parsedFavorites)
      ? parsedFavorites.filter((favoriteId): favoriteId is number => Number.isInteger(favoriteId))
      : [];
  } catch {
    return [];
  }
};

export const setStoredFavoriteInstrumentIds = (favoriteIds: number[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(FAVORITE_INSTRUMENTS_STORAGE_KEY, JSON.stringify(favoriteIds));
};
