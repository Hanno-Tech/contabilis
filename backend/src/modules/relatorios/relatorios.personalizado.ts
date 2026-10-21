import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { QUADROS } from '../clientes/ficha.rules.js';
import type { Relatorio } from './relatorios.repository.js';

/**
 * Relatório personalizado do setor pessoal: o usuário escolhe quais campos da
 * ficha entram e recebe a tabela (e o Excel) só com eles — como o "relatório em
 * Excel dos empregados ativos" do Domínio.
 *
 * O catálogo sai de `ficha.rules.ts` (a mesma fonte do formulário), mais a
 * situação do cliente e a lista de sindicatos. Credenciais ficam de fora: o
 * relatório é uma exportação e não deve carregar senhas (RNF-02).
 */

export interface CampoCatalogo {
  chave: string;
  rotulo: string;
}

export interface QuadroCatalogo {
  quadro: string;
  campos: CampoCatalogo[];
}

type Origem = 'cliente' | 'folha' | 'sindicatos';
interface CampoInterno extends CampoCatalogo {
  origem: Origem;
  data: boolean;
}

/** Campos de data da ficha (o resto é texto ou número). */
const ehData = (chave: string) =>
  chave === 'data_evento_situacao' ||
  chave === 'data_vencimento_laudo' ||
  /^venc_procuracao_(det_fgts|econsignado)(_data_situacao)?$/.test(chave);

const CAMPOS_SINDICATOS: CampoInterno[] = [
  { chave: 'sindicatos_nomes', rotulo: 'Sindicato(s)', origem: 'sindicatos', data: false },
  { chave: 'sindicatos_convencoes', rotulo: 'Convenção(ões) aplicável(is)', origem: 'sindicatos', data: false },
  { chave: 'sindicatos_recolhe', rotulo: 'Recolhe contribuição?', origem: 'sindicatos', data: false },
];

function montarCatalogo(): Array<{ quadro: string; campos: CampoInterno[] }> {
  return QUADROS.map((q) => {
    let campos: CampoInterno[] = q.campos.map((c) => ({
      chave: c.campo,
      rotulo: c.rotulo,
      origem: c.origem,
      data: ehData(c.campo),
    }));
    if (q.titulo === 'Informações gerais') {
      campos = [
        { chave: 'situacao', rotulo: 'Situação', origem: 'cliente', data: false },
        ...campos,
      ];
    }
    if (q.titulo === 'Informações sindicais') campos = CAMPOS_SINDICATOS;
    return { quadro: q.titulo, campos };
  }).filter((q) => q.campos.length > 0);
}

const CATALOGO = montarCatalogo();
const POR_CHAVE = new Map(CATALOGO.flatMap((q) => q.campos).map((c) => [c.chave, c]));

export function catalogoPersonalizado(): QuadroCatalogo[] {
  return CATALOGO.map((q) => ({
    quadro: q.quadro,
    campos: q.campos.map(({ chave, rotulo }) => ({ chave, rotulo })),
  }));
}

export class CamposInvalidos extends Error {}

export interface FiltroPersonalizado {
  campos: string[];
  /** 'ativos' (padrão) ou 'todos'. */
  situacao?: 'ativos' | 'todos';
}

const fmtData = (v: unknown): string => {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  return y && m && d ? `${d}/${m}/${y}` : s;
};

export async function relPersonalizado(filtro: FiltroPersonalizado): Promise<Relatorio> {
  const escolhidos = [...new Set(filtro.campos)].map((k) => {
    const campo = POR_CHAVE.get(k);
    if (!campo) throw new CamposInvalidos(`Campo desconhecido: ${k}`);
    return campo;
  });
  if (escolhidos.length === 0) throw new CamposInvalidos('Escolha ao menos um campo');

  // Mantém a ordem do catálogo (a mesma da ficha), não a do clique.
  const ordem = [...POR_CHAVE.keys()];
  escolhidos.sort((a, b) => ordem.indexOf(a.chave) - ordem.indexOf(b.chave));

  const colsCliente = escolhidos.filter((c) => c.origem === 'cliente').map((c) => c.chave);
  const colsFolha = escolhidos.filter((c) => c.origem === 'folha').map((c) => c.chave);
  const querSindicatos = escolhidos.some((c) => c.origem === 'sindicatos');

  let consulta = db
    .selectFrom('clientes')
    .leftJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'clientes.nome',
      // Chaves validadas contra o catálogo acima — nunca vêm cruas do cliente HTTP.
      ...colsCliente.map((c) => `clientes.${c}` as never),
      ...colsFolha.map((c) => `cliente_folha.${c}` as never),
    ])
    .orderBy('clientes.codigo');

  if ((filtro.situacao ?? 'ativos') === 'ativos') {
    consulta = consulta.where(sql<boolean>`clientes.situacao ilike 'ativ%'`);
  }
  const rows = (await consulta.execute()) as unknown as Array<Record<string, unknown>>;

  // Sindicatos: vários por cliente, juntados em um texto só por célula.
  const sind = new Map<string, { nomes: string[]; convencoes: string[]; recolhe: string[] }>();
  if (querSindicatos) {
    const lista = await db
      .selectFrom('cliente_sindicatos')
      .select(['cliente_id', 'sindicato', 'convencao_aplicavel_nome', 'recolhe_contribuicao'])
      .orderBy('ordem')
      .execute();
    for (const s of lista) {
      const e = sind.get(s.cliente_id) ?? { nomes: [], convencoes: [], recolhe: [] };
      if (s.sindicato) e.nomes.push(s.sindicato);
      if (s.convencao_aplicavel_nome) e.convencoes.push(s.convencao_aplicavel_nome);
      if (s.recolhe_contribuicao) e.recolhe.push(s.recolhe_contribuicao);
      sind.set(s.cliente_id, e);
    }
  }

  const linhas = rows.map((r) => {
    const linha: Relatorio['linhas'][number] = { codigo: r.codigo as number, nome: r.nome as string };
    for (const c of escolhidos) {
      if (c.origem === 'sindicatos') {
        const e = sind.get(r.id as string);
        const lista =
          c.chave === 'sindicatos_nomes' ? e?.nomes : c.chave === 'sindicatos_convencoes' ? e?.convencoes : e?.recolhe;
        linha[c.chave] = (lista ?? []).join('; ');
        continue;
      }
      const v = r[c.chave];
      linha[c.chave] = c.data ? fmtData(v) : v === null || v === undefined ? '' : (v as string | number);
    }
    return linha;
  });

  return {
    titulo: 'Relatório personalizado',
    colunas: [
      { key: 'codigo', label: 'Código da empresa' },
      { key: 'nome', label: 'Nome da empresa' },
      ...escolhidos.map((c) => ({ key: c.chave, label: c.rotulo })),
    ],
    linhas,
  };
}
