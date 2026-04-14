export const DEFAULT_AUTH_REDIRECT = '/dashboard';
export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 72;
export const AUTH_NAME_MAX_LENGTH = 80;

export function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getSafeCallbackPath(callbackUrl?: string | null) {
  if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const url = new URL(callbackUrl, 'http://localhost');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
