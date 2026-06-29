import { api } from './client';
import type {
  Alteracao,
  Dashboard,
  Cct,
  CctListItem,
  Cliente,
  ClienteListItem,
  CredencialRevelada,
  Filtros,
  SessionUser,
} from '../types';

// ------------------------------------------------------------------ Dashboard
export async function fetchDashboard() {
  const { data } = await api.get<Dashboard>('/dashboard');
  return data;
}

// ----------------------------------------------------------------------- Auth
export async function login(username: string, password: string) {
  const { data } = await api.post<{ token: string; user: SessionUser }>('/auth/login', {
    username,
    password,
  });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: SessionUser }>('/auth/me');
  return data.user;
}

// ------------------------------------------------------------------- Clientes
export interface ClienteQuery {
  q?: string;
  situacao?: string;
  responsavel?: string;
  regime?: string;
}

export async function listClientes(params: ClienteQuery) {
  const { data } = await api.get<ClienteListItem[]>('/clientes', { params });
  return data;
}

export async function fetchFiltros() {
  const { data } = await api.get<Filtros>('/clientes/filtros');
  return data;
}

export async function fetchCliente(id: string) {
  const { data } = await api.get<Cliente>(`/clientes/${id}`);
  return data;
}

export async function revelarCredenciais(id: string) {
  const { data } = await api.get<CredencialRevelada[]>(`/clientes/${id}/credenciais`);
  return data;
}

export async function createCliente(payload: Record<string, unknown>) {
  const { data } = await api.post<Cliente>('/clientes', payload);
  return data;
}

export async function updateCliente(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<Cliente>(`/clientes/${id}`, payload);
  return data;
}

// ------------------------------------------------------------------------ CCT
export async function listCct() {
  const { data } = await api.get<CctListItem[]>('/cct');
  return data;
}

export async function fetchCct(id: string) {
  const { data } = await api.get<Cct>(`/cct/${id}`);
  return data;
}

export async function fetchClientesDaCct(id: string) {
  const { data } = await api.get<ClienteListItem[]>(`/cct/${id}/clientes`);
  return data;
}

export async function createCct(payload: Record<string, unknown>) {
  const { data } = await api.post<Cct>('/cct', payload);
  return data;
}

export async function updateCct(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<Cct>(`/cct/${id}`, payload);
  return data;
}

// ------------------------------------------------------------------ Alterações
export interface AlteracaoQuery {
  entidade?: 'cliente' | 'convencao';
  entidade_id?: string;
  q?: string;
}

export async function listAlteracoes(params: AlteracaoQuery = {}) {
  const { data } = await api.get<Alteracao[]>('/alteracoes', { params });
  return data;
}
