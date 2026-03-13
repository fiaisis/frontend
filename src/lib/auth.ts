import { jwtDecode } from 'jwt-decode';

export type UserRole = 'staff' | 'user';

interface TokenClaims {
  role?: UserRole;
  user_number?: string | number;
  userNumber?: string | number;
  employee_number?: string | number;
  employeeNumber?: string | number;
}

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('scigateway:token');
};

const coerceString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const getDecodedToken = (): TokenClaims | null => {
  const token = getStoredToken();
  if (!token) {
    return null;
  }

  try {
    return jwtDecode<TokenClaims>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getUserRole = (): UserRole | null => {
  const decoded = getDecodedToken();
  return decoded?.role || (decoded ? 'user' : null);
};

export const getCurrentUserNumber = (): string | null => {
  const decoded = getDecodedToken();
  if (!decoded) {
    return null;
  }

  return coerceString(decoded.user_number ?? decoded.userNumber ?? decoded.employee_number ?? decoded.employeeNumber);
};
