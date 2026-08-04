import axios from 'axios';

const TOKEN_KEY = 'contabilis.token';

/**
 * Por padrão a API é consumida na mesma origem do app (`/api`): em produção o
 * Vercel serve os dois no mesmo domínio, e em desenvolvimento o Vite faz proxy
 * de `/api` para o backend local (veja vite.config.ts). Assim não há CORS em
 * nenhum dos dois ambientes. `VITE_API_URL` continua disponível para apontar
 * para uma API em outro endereço.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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

/**
 * Conflito de edição concorrente (locking otimista — RNF-01).
 *
 * Checa o `code`, não só o status: violação de unicidade (código de cliente
 * repetido, por exemplo) também responde 409, e olhar só o status fazia a tela
 * dizer "alterado por outro usuário" para um problema que não é esse. Nesse
 * caso a mensagem do servidor, que descreve o problema real, é que deve
 * aparecer.
 */
export const isConflict = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  error.response?.status === 409 &&
  error.response?.data?.error?.code !== 'UNIQUE_VIOLATION';
