const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export async function authRequest(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Không thể xử lý yêu cầu.');
  return result.data;
}

export {
  TOKEN_KEY,
  USER_KEY,
  decodeJwtPayload,
  isTokenExpired,
  getValidToken,
  getCurrentUser,
  saveSession,
  logout,
} from '../../utils/auth.js';