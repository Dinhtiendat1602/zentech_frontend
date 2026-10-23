import { getValidToken, logout } from '../../utils/auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export async function adminRequest(path, options = {}) {
  const token = getValidToken();
  if (!token) {
    logout({ expired: true, redirect: true });
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(!isFormData && options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (response.status === 401) {
    logout({ expired: true, redirect: true });
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `Yêu cầu thất bại (${response.status}).`);
  return result.data;
}

export const formatAdminPrice = (value) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ';

export const formatAdminDate = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
};

export const formatAdminTime = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
};

export const formatAdminDateTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    const time = formatAdminTime(d);
    const date = formatAdminDate(d);
    return time ? `${time} ${date}` : date;
  } catch {
    return '—';
  }
};
