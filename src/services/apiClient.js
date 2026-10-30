import axios from 'axios';
export const API_URL = import.meta.env.VITE_API_URL ?? '';
export const api = axios.create({
  baseURL: API_URL
});
const TOKEN_KEY = 'drinkwater.token';
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);else localStorage.removeItem(TOKEN_KEY);
}
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    setToken(null);
    if (!location.pathname.startsWith('/login')) location.href = '/login';
  }
  return Promise.reject(error);
});

/** The API returns ProblemDetails; the title is the message worth showing. */
export function errorMessage(error) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return data?.detail ?? data?.title ?? error.message;
  }
  return error instanceof Error ? error.message : 'Có lỗi xảy ra';
}
export const mediaUrl = path => path ? `${API_URL}${path}` : null;

export default api;