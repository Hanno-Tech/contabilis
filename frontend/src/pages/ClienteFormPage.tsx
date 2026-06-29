import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { createCliente, fetchCliente, listCct, updateCliente } from '../api/resources';
import { SectionCard } from '../components/ui';

type FieldType = 'text' | 'multiline' | 'date' | 'number';
interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  wide?: boolean;
  required?: boolean;
}

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Informações gerais',
    fields: [
      { key: 'codigo', label: 'Código da empresa', type: 'number', required: true },
      { key: 'nome', label: 'Nome', required: true, wide: true },
      { key: 'cnpj', label: 'CNPJ (00.000.000/0000-00)' },
      { key: 'tipo_cliente', label: 'Tipo de cliente' },
      { key: 'regime_tributacao', label: 'Regime de tributação' },
      { key: 'situacao', label: 'Situação', required: true },
      { key: 'data_evento_situacao', label: 'Data do evento da situação', type: 'date' },
      { key: 'responsavel', label: 'Responsável' },
    ],
  },
  {
    title: 'Folha de pagamento',
    fields: [
      { key: 'possui_folha', label: 'Possui folha?' },
      { key: 'forma_pagamento_salarios', label: 'Forma de pagamento dos salários' },
      { key: 'apura_ponto_escritorio', label: 'Apura o ponto pelo escritório?' },
      { key: 'realiza_lancamentos', label: 'Realiza lançamentos?' },
      { key: 'concede_plano_saude', label: 'Concede plano de saúde?' },
      { key: 'plano_operadora', label: 'Operadora do plano' },
      { key: 'plano_beneficiarios', label: 'Beneficiários' },
      { key: 'fator_r', label: 'Fator "R"?' },
      { key: 'atividade_concomitante', label: 'Atividade concomitante?' },
      { key: 'construcao_civil', label: 'Construção civil?' },
      { key: 'cprb', label: 'CPRB?' },
      { key: 'prazo_envio_folhas', label: 'Prazo para envio das folhas' },
      { key: 'folha_rotina_automatica', label: 'Gera folha via rotina automática?' },
      { key: 'observacoes_folha', label: 'Observações importantes sobre a folha', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Admissão',
    fields: [
      { key: 'prazo_contrato_experiencia', label: 'Prazo do contrato de experiência' },
      { key: 'lancamentos_fixos', label: 'Lançamentos fixos', type: 'multiline', wide: true },
      { key: 'particularidades_cliente', label: 'Particularidades do cliente', type: 'multiline', wide: true },
      { key: 'relatorios_admissao', label: 'Relatórios gerados na admissão', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Envio de documentos',
    fields: [
      { key: 'envio_meio', label: 'Meio' },
      { key: 'envio_documento', label: 'Documento' },
      { key: 'envio_contato', label: 'Contato', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Saúde e segurança do trabalho (SST)',
    fields: [
      { key: 'possui_laudos_sst', label: 'Possui laudos de SST?' },
      { key: 'empresa_responsavel_sst', label: 'Empresa responsável pela SST' },
      { key: 'data_vencimento_laudo', label: 'Vencimento do laudo', type: 'date' },
    ],
  },
  {
    title: 'Procurações',
    fields: [
      { key: 'venc_procuracao_rfb', label: 'Vencimento RFB', type: 'date' },
      { key: 'venc_procuracao_det_fgts', label: 'Vencimento DET e FGTS Digital', type: 'date' },
      { key: 'venc_procuracao_econsignado', label: 'Vencimento e-Consignado', type: 'date' },
      { key: 'emails_notificacao_det', label: 'E-mails que recebem o DET', wide: true },
    ],
  },
  {
    title: 'Guia INSS autônomo/facultativo',
    fields: [
      { key: 'inss_nit', label: 'NIT' },
      { key: 'inss_codigo_recolhimento', label: 'Código de recolhimento' },
      { key: 'inss_salario_contribuicao', label: 'Salário de contribuição', type: 'number' },
      { key: 'inss_aliquota', label: 'Alíquota', type: 'number' },
    ],
  },
];

const NUMBER_FIELDS = new Set(['codigo', 'inss_salario_contribuicao', 'inss_aliquota']);
const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

type FormState = Record<string, string>;
interface CredState {
  sd_usuario: string;
  sd_senha: string;
  sd_email: string;
  sd_email_senha: string;
  ed_usuario: string;
  ed_senha: string;
}

const emptyCred: CredState = {
  sd_usuario: '',
  sd_senha: '',
  sd_email: '',
  sd_email_senha: '',
  ed_usuario: '',
  ed_senha: '',
};

export function ClienteFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<FormState>(() =>
    Object.fromEntries(ALL_KEYS.map((k) => [k, k === 'situacao' ? 'Ativa' : ''])),
  );
  const [cred, setCred] = useState<CredState>(emptyCred);
  const [convencaoId, setConvencaoId] = useState('');
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: cctList } = useQuery({ queryKey: ['cct'], queryFn: listCct });

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => fetchCliente(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!cliente) return;
    const next: FormState = { ...form };
    for (const key of ALL_KEYS) {
      const v = (cliente as unknown as Record<string, unknown>)[key];
      next[key] = v === null || v === undefined ? '' : String(v);
    }
    setForm(next);
    setConvencaoId(cliente.convencao_id ?? '');
    setVersion(cliente.version);
    const sd = cliente.credenciais.find((c) => c.tipo === 'seguro_desemprego');
    const ed = cliente.credenciais.find((c) => c.tipo === 'empregado_domestico');
    setCred({
      sd_usuario: sd?.usuario ?? '',
      sd_senha: '',
      sd_email: sd?.email ?? '',
      sd_email_senha: '',
      ed_usuario: ed?.usuario ?? '',
      ed_senha: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const payload = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const key of ALL_KEYS) {
      const raw = form[key]?.trim() ?? '';
      if (NUMBER_FIELDS.has(key)) {
        out[key] = raw === '' ? (key === 'codigo' ? undefined : null) : Number(raw);
      } else {
        out[key] = raw === '' ? null : raw;
      }
    }
    out.convencao_id = convencaoId || null;

    const credenciais: Record<string, unknown> = {};
    if (cred.sd_usuario || cred.sd_senha || cred.sd_email || cred.sd_email_senha) {
      credenciais.seguro_desemprego = {
        usuario: cred.sd_usuario || null,
        email: cred.sd_email || null,
        ...(cred.sd_senha ? { senha: cred.sd_senha } : {}),
        ...(cred.sd_email_senha ? { email_senha: cred.sd_email_senha } : {}),
      };
    }
    if (cred.ed_usuario || cred.ed_senha) {
      credenciais.empregado_domestico = {
        usuario: cred.ed_usuario || null,
        ...(cred.ed_senha ? { senha: cred.ed_senha } : {}),
      };
    }
    if (Object.keys(credenciais).length) out.credenciais = credenciais;
    return out;
  }, [form, cred, convencaoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!form.nome.trim() || !form.codigo.trim()) {
      setError('Código e nome são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const saved = await updateCliente(id, { ...payload, version });
        queryClient.invalidateQueries({ queryKey: ['cliente', id] });
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
        navigate(`/clientes/${saved.id}`);
      } else {
        const saved = await createCliente(payload);
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
        navigate(`/clientes/${saved.id}`);
      }
    } catch (err) {
      if (isConflict(err)) {
        setConflict(true);
      } else {
        setError(apiErrorMessage(err, 'Não foi possível salvar o cliente.'));
      }
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to={isEdit ? `/clientes/${id}` : '/clientes'} sx={{ mb: 2 }}>
        Cancelar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar cliente' : 'Novo cliente'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este cliente foi alterado por outro usuário enquanto você editava. Recarregue a ficha para
          ver a versão atual antes de salvar novamente.
        </Alert>
      )}

      {SECTIONS.map((section) => (
        <SectionCard key={section.title} title={section.title}>
          <Grid container spacing={2}>
            {section.fields.map((f) => (
              <Grid key={f.key} item xs={12} sm={f.wide ? 12 : 6} md={f.wide ? 12 : 4}>
                <TextField
                  label={f.label}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  required={f.required}
                  fullWidth
                  size="small"
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  multiline={f.type === 'multiline'}
                  minRows={f.type === 'multiline' ? 3 : undefined}
                  InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
                />
              </Grid>
            ))}
          </Grid>
        </SectionCard>
      ))}

      <SectionCard title="Sindicato e convenção">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Sindicato ao qual está sujeito" value={form.sindicato ?? ''} onChange={(e) => setField('sindicato', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Convenção aplicável (texto livre)" value={form.convencao_aplicavel_nome ?? ''} onChange={(e) => setField('convencao_aplicavel_nome', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Convenção vinculada (CCT)" value={convencaoId} onChange={(e) => setConvencaoId(e.target.value)} fullWidth size="small" helperText="Vincula o cliente a uma convenção cadastrada (RF-17)">
              <MenuItem value="">Nenhuma</MenuItem>
              {cctList?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.apelido}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Credenciais de portais (dados sensíveis)">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          As senhas são armazenadas cifradas. {isEdit && 'Deixe o campo de senha em branco para manter a senha atual.'}
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Seguro Desemprego</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}><TextField label="Usuário" value={cred.sd_usuario} onChange={(e) => setCred({ ...cred, sd_usuario: e.target.value })} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Senha" type="password" value={cred.sd_senha} onChange={(e) => setCred({ ...cred, sd_senha: e.target.value })} fullWidth size="small" placeholder={isEdit ? '••••••' : ''} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="E-mail do cliente" value={cred.sd_email} onChange={(e) => setCred({ ...cred, sd_email: e.target.value })} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Senha do e-mail" type="password" value={cred.sd_email_senha} onChange={(e) => setCred({ ...cred, sd_email_senha: e.target.value })} fullWidth size="small" /></Grid>
        </Grid>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Empregado Doméstico</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><TextField label="Usuário" value={cred.ed_usuario} onChange={(e) => setCred({ ...cred, ed_usuario: e.target.value })} fullWidth size="small" /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField label="Senha" type="password" value={cred.ed_senha} onChange={(e) => setCred({ ...cred, ed_senha: e.target.value })} fullWidth size="small" /></Grid>
        </Grid>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to={isEdit ? `/clientes/${id}` : '/clientes'}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
