import { ROUTES } from '../constants/routes.js';

export const TOKEN_KEY = 'novatech-token';
export const USER_KEY = 'novatech-user';

/**
 * Safely decodes base64url JWT payload
 * @param {string} token
 * @returns {object|null}
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if token is expired or will expire within buffer seconds
 * @param {string} token
 * @param {number} bufferSeconds - Safety window in seconds (default 5s)
 * @returns {boolean}
 */
export function isTokenExpired(token, bufferSeconds = 5) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= (payload.exp - bufferSeconds) * 1000;
}

/**
 * Gets remaining time in milliseconds until token expires
 * @param {string} token
 * @returns {number}
 */
export function getTokenTimeRemaining(token) {
  if (!token) return 0;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
}

/**
 * Gets valid token from localStorage, or clears storage and returns null if expired
 * @returns {string|null}
 */
export function getValidToken() {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    logout({ expired: true, redirect: false });
    return null;
  }
  return token;
}

/**
 * Gets current user from localStorage if token is valid
 * @returns {object|null}
 */
export function getCurrentUser() {
  const token = getValidToken();
  if (!token) return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

/**
 * Saves login session to localStorage and emits auth change event
 * @param {{ token: string, user: object }} session
 */
export function saveSession(session) {
  if (session?.token) {
    window.localStorage.setItem(TOKEN_KEY, session.token);
  }
  if (session?.user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  }
  window.dispatchEvent(
    new CustomEvent('novatech-auth-change', {
      detail: { action: 'login', session },
    })
  );
}

/**
 * Clears session and optionally redirects to login
 * @param {{ expired?: boolean, redirect?: boolean, navigate?: Function }} options
 */
export function logout(options = {}) {
  const hadToken = Boolean(window.localStorage.getItem(TOKEN_KEY));
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);

  window.dispatchEvent(
    new CustomEvent('novatech-auth-change', {
      detail: { action: 'logout', expired: Boolean(options.expired) },
    })
  );

  const pathname = window.location.pathname;
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/tai-khoan') ||
    pathname.startsWith('/profile');

  const shouldRedirect =
    options.redirect === true ||
    (options.redirect !== false && isProtectedRoute);

  if (shouldRedirect) {
    const isAlreadyOnAuth =
      pathname.startsWith('/dang-nhap') || pathname.startsWith('/login');

    if (!isAlreadyOnAuth) {
      if (options.navigate) {
        options.navigate(ROUTES.login, {
          replace: true,
          state: { sessionExpired: options.expired || hadToken },
        });
      } else {
        const query = options.expired || hadToken ? '?expired=1' : '';
        window.location.href = `${ROUTES.login}${query}`;
      }
    }
  }
}
