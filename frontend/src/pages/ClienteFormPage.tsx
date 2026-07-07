import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { fetchFicha, updateFolha } from '../api/resources';
import { SectionCard } from '../components/ui';
import type { ClienteSindicato } from '../types';

type FieldType = 'text' | 'multiline' | 'date' | 'number' | 'select';
interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  wide?: boolean;
  options?: string[];
}

const FORMA_ENVIO_OPCOES = ['Físico', 'Gestta Messenger', 'Gestta Tarefas', 'Portal do cliente'];
const TIPO_SEGURADO_OPCOES = ['Autônomo', 'Facultativo'];
const SIM_NAO_NA = ['Sim', 'Não', 'Não se aplica'];
const OPERADORA_OPCOES = ['Saúde São José', 'Unimed', 'Não se aplica'];
const BENEFICIARIOS_OPCOES = ['Colaborador', 'Colaborador e Dependente', 'Não se aplica'];
const FORMA_PAGAMENTO_OPCOES = ['Dinheiro', 'Crédito em conta', 'Pix', 'Não se aplica'];
const POSSUI_FOLHA_OPCOES = [
  'Não possui',
  'Possui apenas pró labore',
  'Possui apenas folha',
  'Possui folha e pró labore',
  'Possui folha de empregado doméstico',
  'Possui guia avulsa de INSS',
  'Possui apenas RPA',
  'Não se aplica',
];
const RESPONSAVEL_FOLHA_OPCOES = ['Priscila', 'Pâmela', 'Samuel', 'Fernanda'];
const CODIGO_ROTINA_OPCOES = [
  '11 - CÁLCULO PRÓ LABORES SIMPLES',
  '12 - CÁLCULO EMPRESAS COM FUNCIONÁRIOS E SEM LANÇAMENTOS',
  '13 - CÁLCULO EMPRESAS FATOR "R"',
];
const META_ENTREGA_OPCOES = ['Dia 26 do mês da folha', '1º dia útil', '2º dia útil', '3º dia útil'];
const EMPRESA_SST_OPCOES = [
  'Medset', 'Probem', 'Maxipas', 'Dra. Laura', 'Mioprev', 'Ergomed', 'MedIçara',
  'Mais Proteção', 'Sesi', 'MedCri', 'Macroseg', 'Previ&Seg', 'CliniSeg', 'CliniMet', 'Não se aplica',
];
const SITUACAO_CONVENCAO_OPCOES = ['Vigente', 'Vencida', 'Não se aplica'];
const TIPO_LABEL: Record<string, string> = {
  seguro_desemprego: 'Seguro Desemprego',
  empregado_domestico: 'Empregado Doméstico',
};

// Quadros com campos escalares (os demais — sindicais, empregador doméstico, senhas — são customizados).
const SCALAR_CARDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Informações tributárias',
    fields: [
      { key: 'fator_r', label: 'Fator "R"?', type: 'select', options: SIM_NAO_NA },
      { key: 'atividade_concomitante', label: 'Atividades concomitantes', type: 'select', options: SIM_NAO_NA },
      { key: 'inss_retido_nf', label: 'INSS retido na NF?', type: 'select', options: SIM_NAO_NA },
      { key: 'construcao_civil', label: 'Construção civil?' },
      { key: 'cprb', label: 'CPRB?' },
      { key: 'encargos_recolhidos_escritorio', label: 'Encargos recolhidos pelo escritório', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Admissão',
    fields: [
      { key: 'concede_plano_saude', label: 'Concede plano de saúde?', type: 'select', options: SIM_NAO_NA },
      { key: 'plano_operadora', label: 'Operadora do plano', type: 'select', options: OPERADORA_OPCOES },
      { key: 'plano_beneficiarios', label: 'Beneficiários do plano', type: 'select', options: BENEFICIARIOS_OPCOES },
      { key: 'forma_pagamento_salarios', label: 'Forma de pagamento dos salários', type: 'select', options: FORMA_PAGAMENTO_OPCOES },
      { key: 'prazo_contrato_experiencia', label: 'Prazo do contrato de experiência' },
      { key: 'cargos_insalubres_perigosos', label: 'Possui cargos insalubres ou perigosos?', type: 'select', options: SIM_NAO_NA },
      { key: 'lancamentos_fixos', label: 'Possui lançamentos fixos?', type: 'select', options: SIM_NAO_NA },
      { key: 'relatorios_admissao', label: 'Relatórios admissionais', type: 'multiline', wide: true },
      { key: 'particularidades_cliente', label: 'Especificidades do cliente', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Fechamento da folha',
    fields: [
      { key: 'possui_folha', label: 'Possui folha?', type: 'select', options: POSSUI_FOLHA_OPCOES },
      { key: 'responsavel_fechamento_folha', label: 'Responsável pelo fechamento da folha', type: 'select', options: RESPONSAVEL_FOLHA_OPCOES },
      { key: 'folha_rotina_automatica', label: 'Gera folha via rotina automática?', type: 'select', options: SIM_NAO_NA },
      { key: 'codigo_rotina_automatica', label: 'Código da rotina automática', type: 'select', options: CODIGO_ROTINA_OPCOES },
      { key: 'data_meta_entrega_folha', label: 'Meta de entrega da folha', type: 'select', options: META_ENTREGA_OPCOES },
      { key: 'apura_ponto_escritorio', label: 'Apura o ponto pelo escritório?', type: 'select', options: SIM_NAO_NA },
      { key: 'realiza_lancamentos', label: 'Realiza lançamentos?', type: 'select', options: SIM_NAO_NA },
      { key: 'observacoes_folha', label: 'Informações importantes no fechamento da folha', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Informações sobre SST',
    fields: [
      { key: 'possui_laudos_sst', label: 'Possui laudo de SST?', type: 'select', options: SIM_NAO_NA },
      { key: 'empresa_responsavel_sst', label: 'Empresa responsável', type: 'select', options: EMPRESA_SST_OPCOES },
      { key: 'data_vencimento_laudo', label: 'Vencimento do laudo', type: 'date' },
      { key: 'termo_ciencia_sst', label: 'Termo de ciência enviado (ausência de laudos)?', type: 'select', options: SIM_NAO_NA },
    ],
  },
  {
    title: 'Forma de envio dos documentos',
    fields: [
      { key: 'envio_meio', label: 'Forma de envio', type: 'select', options: FORMA_ENVIO_OPCOES },
      { key: 'envio_contato', label: 'Contato', type: 'multiline', wide: true },
      { key: 'envio_observacoes', label: 'Observações', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Dados de contribuintes individuais',
    fields: [
      { key: 'inss_nit', label: 'NIT' },
      { key: 'inss_tipo_segurado', label: 'Tipo de segurado', type: 'select', options: TIPO_SEGURADO_OPCOES },
      { key: 'inss_codigo_recolhimento', label: 'Código de recolhimento' },
      { key: 'inss_salario_contribuicao', label: 'Salário de contribuição', type: 'number' },
      { key: 'inss_aliquota', label: 'Alíquota', type: 'number' },
    ],
  },
  {
    title: 'Procurações',
    fields: [
      { key: 'venc_procuracao_rfb', label: 'Procuração RFB', type: 'date' },
      { key: 'venc_procuracao_det', label: 'Procuração DET', type: 'date' },
      { key: 'venc_procuracao_fgts', label: 'Procuração FGTS Digital', type: 'date' },
      { key: 'venc_procuracao_econsignado', label: 'Procuração e-Consignado', type: 'date' },
      { key: 'emails_notificacao_det', label: 'E-mails que recebem o DET', wide: true },
    ],
  },
];

const NUMBER_FIELDS = new Set(['inss_salario_contribuicao', 'inss_aliquota']);
const SCALAR_KEYS = SCALAR_CARDS.flatMap((c) => c.fields.map((f) => f.key));

interface OrgaoState {
  id?: string;
  tipo: string;
  link: string;
  usuario: string;
  senha: string;
}

export function ClienteFormPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(SCALAR_KEYS.map((k) => [k, ''])),
  );
  const [regime, setRegime] = useState(''); // geral (só leitura aqui)
  const [sindicatos, setSindicatos] = useState<ClienteSindicato[]>([]);
  const [orgaos, setOrgaos] = useState<OrgaoState[]>([]);
  const [edUsuario, setEdUsuario] = useState('');
  const [edSenha, setEdSenha] = useState('');
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: ficha, isLoading } = useQuery({ queryKey: ['ficha', id], queryFn: () => fetchFicha(id) });

  useEffect(() => {
    if (!ficha) return;
    const folha = (ficha.folha ?? {}) as unknown as Record<string, unknown>;
    setForm(Object.fromEntries(SCALAR_KEYS.map((k) => {
      const v = folha[k];
      return [k, v === null || v === undefined ? '' : String(v)];
    })));
    setRegime(ficha.regime_tributacao ?? '');
    setSindicatos(ficha.sindicatos.length ? ficha.sindicatos : []);
    setOrgaos(
      ficha.credenciais
        .filter((c) => c.tipo !== 'empregado_domestico')
        .map((c) => ({ id: c.id, tipo: TIPO_LABEL[c.tipo] ?? c.tipo, link: c.link ?? '', usuario: c.usuario ?? '', senha: '' })),
    );
    const ed = ficha.credenciais.find((c) => c.tipo === 'empregado_domestico');
    setEdUsuario(ed?.usuario ?? '');
    setEdSenha('');
    setVersion(ficha.folha?.version ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ficha]);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);

    const payload: Record<string, unknown> = {};
    for (const key of SCALAR_KEYS) {
      const raw = form[key]?.trim() ?? '';
      payload[key] = raw === '' ? null : NUMBER_FIELDS.has(key) ? Number(raw) : raw;
    }

    payload.sindicatos = sindicatos
      .filter((s) => s.sindicato || s.convencao_aplicavel_nome || s.situacao_convencao || s.recolhe_contribuicao)
      .map((s) => ({
        sindicato: s.sindicato || null,
        convencao_aplicavel_nome: s.convencao_aplicavel_nome || null,
        situacao_convencao: s.situacao_convencao || null,
        recolhe_contribuicao: s.recolhe_contribuicao || null,
      }));

    const orgaosPayload = orgaos
      .filter((o) => o.tipo.trim())
      .map((o) => ({
        ...(o.id ? { id: o.id } : {}),
        tipo: o.tipo.trim(),
        link: o.link || null,
        usuario: o.usuario || null,
        ...(o.senha ? { senha: o.senha } : {}),
      }));
    payload.credenciais = {
      orgaos: orgaosPayload,
      empregado_domestico: {
        usuario: edUsuario || null,
        ...(edSenha ? { senha: edSenha } : {}),
      },
    };

    setSaving(true);
    try {
      await updateFolha(id, { ...payload, version });
      queryClient.invalidateQueries({ queryKey: ['ficha', id] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      navigate(`/clientes/${id}`);
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar os dados.'));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!ficha) return <Alert severity="error">Não foi possível carregar o cliente.</Alert>;

  const renderField = (f: FieldDef) => {
    const value = form[f.key] ?? '';
    if (f.type === 'select') {
      const opts = f.options ?? [];
      const options = value && !opts.includes(value) ? [...opts, value] : opts;
      return (
        <Grid key={f.key} item xs={12} sm={f.wide ? 12 : 6} md={f.wide ? 12 : 4}>
          <TextField select label={f.label} value={value} onChange={(e) => setField(f.key, e.target.value)} fullWidth size="small">
            <MenuItem value=""><em>Não informado</em></MenuItem>
            {options.map((o) => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </TextField>
        </Grid>
      );
    }
    return (
      <Grid key={f.key} item xs={12} sm={f.wide ? 12 : 6} md={f.wide ? 12 : 4}>
        <TextField
          label={f.label}
          value={value}
          onChange={(e) => setField(f.key, e.target.value)}
          fullWidth
          size="small"
          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
          multiline={f.type === 'multiline'}
          minRows={f.type === 'multiline' ? 3 : undefined}
          InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
        />
      </Grid>
    );
  };

  const cardByTitle = (title: string) => SCALAR_CARDS.find((c) => c.title === title)!;
  // Função que retorna JSX (NÃO um componente) — evita remontar o subtree a cada
  // tecla, o que fazia os inputs perderem o foco.
  const scalarCard = (title: string) => {
    const card = cardByTitle(title);
    return (
      <SectionCard title={card.title}>
        <Grid container spacing={2}>{card.fields.map(renderField)}</Grid>
      </SectionCard>
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to={`/clientes/${id}`} sx={{ mb: 2 }}>
        Cancelar
      </Button>
      <Typography variant="h5">Editar dados da empresa</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {ficha.nome} · Código {ficha.codigo} — os dados gerais (razão social, CNPJ, tipo, situação) são editados no menu “Informações gerais”.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Estes dados foram alterados por outro usuário enquanto você editava. Recarregue antes de salvar novamente.
        </Alert>
      )}

      {/* Informações tributárias (com Regime só leitura) */}
      <SectionCard title="Informações tributárias">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Regime de tributação"
              value={regime}
              fullWidth
              size="small"
              disabled
              helperText="Editado em Informações gerais"
            />
          </Grid>
          {cardByTitle('Informações tributárias').fields.map(renderField)}
        </Grid>
      </SectionCard>

      {scalarCard('Admissão')}

      <SectionCard title="Rescisão">
        <Typography variant="body2" color="text.disabled">Campos a definir.</Typography>
      </SectionCard>

      {scalarCard('Fechamento da folha')}

      {/* Informações sindicais (vários) */}
      <SectionCard
        title="Informações sindicais"
        action={
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setSindicatos([...sindicatos, { sindicato: '', convencao_aplicavel_nome: '', situacao_convencao: '', recolhe_contribuicao: '' }])}
          >
            Adicionar
          </Button>
        }
      >
        <Stack spacing={2}>
          {sindicatos.map((s, i) => {
            const set = (patch: Partial<ClienteSindicato>) =>
              setSindicatos(sindicatos.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <Box key={s.id ?? i} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Sindicato {i + 1}</Typography>
                  <IconButton size="small" color="error" onClick={() => setSindicatos(sindicatos.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField label="Sindicato ao qual está sujeito" value={s.sindicato ?? ''} onChange={(e) => set({ sindicato: e.target.value })} fullWidth size="small" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Convenção aplicável" value={s.convencao_aplicavel_nome ?? ''} onChange={(e) => set({ convencao_aplicavel_nome: e.target.value })} fullWidth size="small" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Situação da convenção"
                      value={s.situacao_convencao ?? ''}
                      onChange={(e) => set({ situacao_convencao: e.target.value })}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value=""><em>Não informado</em></MenuItem>
                      {SITUACAO_CONVENCAO_OPCOES.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField select label="Recolhe contribuições sindicais?" value={s.recolhe_contribuicao ?? ''} onChange={(e) => set({ recolhe_contribuicao: e.target.value })} fullWidth size="small">
                      <MenuItem value=""><em>Não informado</em></MenuItem>
                      {SIM_NAO_NA.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                    </TextField>
                  </Grid>
                </Grid>
              </Box>
            );
          })}
          {sindicatos.length === 0 && <Typography variant="body2" color="text.disabled">Nenhum sindicato adicionado.</Typography>}
        </Stack>
      </SectionCard>

      {scalarCard('Informações sobre SST')}
      {scalarCard('Forma de envio dos documentos')}
      {scalarCard('Dados de contribuintes individuais')}

      {/* Empregador doméstico */}
      <SectionCard title="Dados do empregador doméstico">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          A senha é armazenada cifrada. Deixe em branco para manter a atual.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField label="Usuário e-social" value={edUsuario} onChange={(e) => setEdUsuario(e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Senha" type="password" value={edSenha} onChange={(e) => setEdSenha(e.target.value)} fullWidth size="small" placeholder="••••••" /></Grid>
        </Grid>
      </SectionCard>

      {scalarCard('Procurações')}

      {/* Senhas (por órgão) */}
      <SectionCard
        title="Senhas"
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => setOrgaos([...orgaos, { tipo: '', link: '', usuario: '', senha: '' }])}>
            Adicionar órgão
          </Button>
        }
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          As senhas são armazenadas cifradas. Deixe a senha em branco para manter a atual.
        </Typography>
        <Stack spacing={2}>
          {orgaos.map((o, i) => {
            const set = (patch: Partial<OrgaoState>) => setOrgaos(orgaos.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <Box key={o.id ?? i}>
                {i > 0 && <Divider sx={{ mb: 2 }} />}
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}><TextField label="Órgão" value={o.tipo} onChange={(e) => set({ tipo: e.target.value })} fullWidth size="small" /></Grid>
                  <Grid item xs={12} md={3}><TextField label="Link de acesso" value={o.link} onChange={(e) => set({ link: e.target.value })} fullWidth size="small" /></Grid>
                  <Grid item xs={12} md={3}><TextField label="Usuário" value={o.usuario} onChange={(e) => set({ usuario: e.target.value })} fullWidth size="small" /></Grid>
                  <Grid item xs={11} md={2}><TextField label="Senha" type="password" value={o.senha} onChange={(e) => set({ senha: e.target.value })} fullWidth size="small" placeholder="••••••" /></Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" color="error" onClick={() => setOrgaos(orgaos.filter((_, j) => j !== i))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            );
          })}
          {orgaos.length === 0 && <Typography variant="body2" color="text.disabled">Nenhum órgão adicionado.</Typography>}
        </Stack>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to={`/clientes/${id}`}>Cancelar</Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
