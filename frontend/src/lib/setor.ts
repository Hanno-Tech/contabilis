/**
 * Setores do escritório. Ocorrências, pendências, eventos futuros, senhas,
 * relatórios e alterações são as mesmas telas nos dois — o que muda é a
 * carteira de registros e o prefixo das rotas.
 */
export type Setor = 'pessoal' | 'contabil';

const BASE: Record<Setor, string> = {
  pessoal: '',
  contabil: '/contabil',
};

/** Rota de uma tela dentro do setor: `rota('contabil', '/ocorrencias')` → `/contabil/ocorrencias`. */
export const rota = (setor: Setor, path: string) => `${BASE[setor]}${path}`;
