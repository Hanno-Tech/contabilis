import { api } from './client';
import type { Setor } from '../lib/setor';
import type {
  Alteracao,
  ClienteContabilListItem,
  FichaContabil,
  FiltrosContabil,
  Imovel,
  Dashboard,
  Cliente,
  ClienteFicha,
  ClienteListItem,
  CredencialRevelada,
  EventoFuturo,
  EntidadeCadastro,
  EstruturaFicha,
  Filtros,
  Ocorrencia,
  OcorrenciaOpcoes,
  Pendencia,
  Relatorio,
  RelatorioResumo,
  SenhaSetor,
  SenhaSetorRevelada,
  SessionUser,
  StatusOpcoes,
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

export async function trocarSenha(senha_atual: string, nova_senha: string) {
  const { data } = await api.post<{ ok: true }>('/auth/trocar-senha', {
    senha_atual,
    nova_senha,
  });
  return data;
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

/**
 * Estrutura da ficha (quadros e regras de obrigatoriedade). Definida no
 * backend para que formulário e dashboard usem a mesma regra.
 */
export async function fetchEstruturaFicha() {
  const { data } = await api.get<EstruturaFicha>('/clientes/estrutura-ficha');
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

// ------------------------------------------------------------------ Alterações
export interface AlteracaoQuery {
  setor: Setor;
  entidade?: 'cliente' | 'ocorrencia' | 'pendencia' | 'evento' | 'imovel';
  entidade_id?: string;
  q?: string;
}

export async function listAlteracoes(params: AlteracaoQuery) {
  const { data } = await api.get<Alteracao[]>('/alteracoes', { params });
  return data;
}

// ----------------------------------------------------------------- Ocorrências
export interface OcorrenciaQuery {
  setor: Setor;
  q?: string;
  cliente_id?: string;
  situacao?: string;
  responsavel_id?: string;
  data_de?: string;
  data_ate?: string;
}

export async function listOcorrencias(params: OcorrenciaQuery) {
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

// ----------------------------------------------------------------- Pendências
export interface PendenciaQuery {
  setor: Setor;
  q?: string;
  cliente_id?: string;
  situacao?: string;
  solucao_id?: string;
  data_de?: string;
  data_ate?: string;
}

export async function listPendencias(params: PendenciaQuery) {
  const { data } = await api.get<Pendencia[]>('/pendencias', { params });
  return data;
}

export async function fetchPendenciaOpcoes() {
  const { data } = await api.get<StatusOpcoes>('/pendencias/opcoes');
  return data;
}

export async function fetchPendencia(id: string) {
  const { data } = await api.get<Pendencia>(`/pendencias/${id}`);
  return data;
}

export async function createPendencia(payload: Record<string, unknown>) {
  const { data } = await api.post<Pendencia>('/pendencias', payload);
  return data;
}

export async function updatePendencia(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<Pendencia>(`/pendencias/${id}`, payload);
  return data;
}

export async function deletePendencia(id: string) {
  await api.delete(`/pendencias/${id}`);
}

// ------------------------------------------------------------- Eventos futuros
export interface EventoQuery {
  setor: Setor;
  q?: string;
  cliente_id?: string;
  situacao?: string;
  comp_de?: string;
  comp_ate?: string;
}

export async function listEventos(params: EventoQuery) {
  const { data } = await api.get<EventoFuturo[]>('/eventos-futuros', { params });
  return data;
}

export async function fetchEventoOpcoes() {
  const { data } = await api.get<StatusOpcoes>('/eventos-futuros/opcoes');
  return data;
}

export async function fetchEvento(id: string) {
  const { data } = await api.get<EventoFuturo>(`/eventos-futuros/${id}`);
  return data;
}

export async function createEvento(payload: Record<string, unknown>) {
  const { data } = await api.post<EventoFuturo>('/eventos-futuros', payload);
  return data;
}

export async function updateEvento(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<EventoFuturo>(`/eventos-futuros/${id}`, payload);
  return data;
}

export async function deleteEvento(id: string) {
  await api.delete(`/eventos-futuros/${id}`);
}

// ------------------------------------------------------------- Senhas do setor
export async function listSenhasSetor(setor: Setor, q?: string) {
  const { data } = await api.get<SenhaSetor[]>('/senhas-setor', { params: { setor, q } });
  return data;
}

export async function fetchSenhaSetor(id: string) {
  const { data } = await api.get<SenhaSetor>(`/senhas-setor/${id}`);
  return data;
}

export async function createSenhaSetor(payload: Record<string, unknown>) {
  const { data } = await api.post<SenhaSetor>('/senhas-setor', payload);
  return data;
}

export async function updateSenhaSetor(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<SenhaSetor>(`/senhas-setor/${id}`, payload);
  return data;
}

export async function deleteSenhaSetor(id: string) {
  await api.delete(`/senhas-setor/${id}`);
}

export async function revelarSenhaSetor(id: string) {
  const { data } = await api.get<SenhaSetorRevelada>(`/senhas-setor/${id}/senha`);
  return data;
}

// ----------------------------------------------------------------- Relatórios
export async function listRelatorios(setor: Setor) {
  const { data } = await api.get<RelatorioResumo[]>('/relatorios', { params: { setor } });
  return data;
}

export async function fetchRelatorio(key: string) {
  const { data } = await api.get<Relatorio>(`/relatorios/${key}`);
  return data;
}

// ------------------------------------------- Sindicatos e empresas de SST
export async function listEntidades(params: { q?: string; tipo?: string } = {}) {
  const { data } = await api.get<EntidadeCadastro[]>('/entidades', { params });
  return data;
}

export async function fetchEntidade(id: string) {
  const { data } = await api.get<EntidadeCadastro>(`/entidades/${id}`);
  return data;
}

export async function createEntidade(payload: Record<string, unknown>) {
  const { data } = await api.post<EntidadeCadastro>('/entidades', payload);
  return data;
}

export async function updateEntidade(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<EntidadeCadastro>(`/entidades/${id}`, payload);
  return data;
}

export async function deleteEntidade(id: string) {
  await api.delete(`/entidades/${id}`);
}

// ------------------------------------------- Setor contábil: informações gerais
export interface ClienteContabilQuery {
  q?: string;
  situacao?: string;
  responsavel?: string;
  prioridade?: string;
  grupo?: string;
  regime?: string;
}

export async function listClientesContabil(params: ClienteContabilQuery) {
  const { data } = await api.get<ClienteContabilListItem[]>('/contabil/clientes', { params });
  return data;
}

export async function fetchFiltrosContabil() {
  const { data } = await api.get<FiltrosContabil>('/contabil/clientes/filtros');
  return data;
}

export async function fetchFichaContabil(id: string) {
  const { data } = await api.get<FichaContabil>(`/contabil/clientes/${id}`);
  return data;
}

export async function updateFichaContabil(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<FichaContabil>(`/contabil/clientes/${id}`, payload);
  return data;
}

// --------------------------------------------- Setor contábil: controle de imóveis
export interface ImovelQuery {
  q?: string;
  cliente_id?: string;
  tipo?: string;
  situacao?: string;
  forma_aquisicao?: string;
}

export async function listImoveis(params: ImovelQuery = {}) {
  const { data } = await api.get<Imovel[]>('/imoveis', { params });
  return data;
}

export async function fetchImovel(id: string) {
  const { data } = await api.get<Imovel>(`/imoveis/${id}`);
  return data;
}

export async function createImovel(payload: Record<string, unknown>) {
  const { data } = await api.post<Imovel>('/imoveis', payload);
  return data;
}

export async function updateImovel(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put<Imovel>(`/imoveis/${id}`, payload);
  return data;
}

export async function deleteImovel(id: string) {
  await api.delete(`/imoveis/${id}`);
}
