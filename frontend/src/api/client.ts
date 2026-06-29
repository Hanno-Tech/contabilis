import axios from 'axios';

const TOKEN_KEY = 'contabilis.token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api',
});

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Injeta o JWT em toda requisição.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada (RF-03) -> limpa e manda para o login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      tokenStore.clear();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** Extrai uma mensagem de erro amigável da resposta da API. */
export function apiErrorMessage(error: unknown, fallback = 'Ocorreu um erro.'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.message ?? fallback;
  }
  return fallback;
}

export const isConflict = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 409;
