import { api } from './client';
import type {
  Alteracao,
  Dashboard,
  Cct,
  CctListItem,
  Cliente,
  ClienteFicha,
  ClienteListItem,
  CredencialRevelada,
  Filtros,
  Ocorrencia,
  OcorrenciaOpcoes,
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

// Clientes
export async function fetchCliente(id: string) {
  const { data } = await api.get<Cliente>(`/clientes/${id}`);
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

// Ficha completa (Informações Gerais) e edição da folha
export async function fetchFicha(id: string) {
  const { data } = await api.get<ClienteFicha>(`/clientes/${id}/ficha`);
  return data;
}

export async function updateFolha(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<ClienteFicha>(`/clientes/${id}/folha`, payload);
  return data;
}

export async function revelarCredenciais(id: string) {
  const { data } = await api.get<CredencialRevelada[]>(`/clientes/${id}/credenciais`);
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
  entidade?: 'cliente' | 'convencao' | 'ocorrencia';
  entidade_id?: string;
  q?: string;
}

export async function listAlteracoes(params: AlteracaoQuery = {}) {
  const { data } = await api.get<Alteracao[]>('/alteracoes', { params });
  return data;
}

// ----------------------------------------------------------------- Ocorrências
export interface OcorrenciaQuery {
  q?: string;
  cliente_id?: string;
  situacao?: string;
  responsavel_id?: string;
}

export async function listOcorrencias(params: OcorrenciaQuery = {}) {
  const { data } = await api.get<Ocorrencia[]>('/ocorrencias', { params });
  return data;
}

export async function fetchOcorrenciaOpcoes() {
  const { data } = await api.get<OcorrenciaOpcoes>('/ocorrencias/opcoes');
  return data;
}

export async function fetchOcorrencia(id: string) {
  const { data } = await api.get<Ocorrencia>(`/ocorrencias/${id}`);
  return data;
}

export async function createOcorrencia(payload: Record<string, unknown>) {
  const { data } = await api.post<Ocorrencia>('/ocorrencias', payload);
  return data;
}

export async function updateOcorrencia(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<Ocorrencia>(`/ocorrencias/${id}`, payload);
  return data;
}

export async function deleteOcorrencia(id: string) {
  await api.delete(`/ocorrencias/${id}`);
}
