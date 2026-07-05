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
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { createCliente, fetchCliente, updateCliente } from '../api/resources';
import { SectionCard, formatDocumento, isValidDocumento } from '../components/ui';

const SITUACOES = ['Ativa', 'Ativa sem movimento', 'Baixada', 'Devolvida', 'Transferida', 'Paralisada', 'Em constituição'];
const TIPO_CLIENTE_OPCOES = [
  'Empresa normal',
  'MEI',
  'Empregador doméstico',
  'Contribuinte Facultativo',
  'Contribuinte Individual',
  'Empregador rural',
  'Associação',
];
const REGIME_OPCOES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'SIMEI', 'Não se aplica'];

const strOrNull = (s: string) => (s.trim() === '' ? null : s);

/** Garante que um valor já gravado apareça na lista mesmo se não for uma das opções padrão. */
const withCurrent = (opcoes: string[], atual: string) =>
  atual && !opcoes.includes(atual) ? [...opcoes, atual] : opcoes;

interface FormState {
  codigo: string;
  nome: string;
  cnpj: string;
  tipo_cliente: string;
  regime_tributacao: string;
  situacao: string;
  data_evento_situacao: string;
  responsavel: string;
}

const emptyForm: FormState = {
  codigo: '',
  nome: '',
  cnpj: '',
  tipo_cliente: '',
  regime_tributacao: '',
  situacao: 'Ativa',
  data_evento_situacao: '',
  responsavel: '',
};

export function InformacoesGeraisFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<FormState>(emptyForm);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => fetchCliente(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!cliente) return;
    setForm({
      codigo: String(cliente.codigo),
      nome: cliente.nome ?? '',
      cnpj: cliente.cnpj ?? '',
      tipo_cliente: cliente.tipo_cliente ?? '',
      regime_tributacao: cliente.regime_tributacao ?? '',
      situacao: cliente.situacao ?? 'Ativa',
      data_evento_situacao: cliente.data_evento_situacao ?? '',
      responsavel: cliente.responsavel ?? '',
    });
    setVersion(cliente.version);
  }, [cliente]);

  const setField = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!form.codigo.trim() || Number.isNaN(Number(form.codigo))) {
      setError('Informe um código numérico.');
      return;
    }
    if (!form.nome.trim()) {
      setError('A razão social é obrigatória.');
      return;
    }
    if (form.cnpj.trim() && !isValidDocumento(form.cnpj)) {
      setError('CNPJ/CPF inválido. Use CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00).');
      return;
    }
    const payload: Record<string, unknown> = {
      codigo: Number(form.codigo),
      nome: form.nome.trim(),
      cnpj: strOrNull(form.cnpj),
      tipo_cliente: strOrNull(form.tipo_cliente),
      regime_tributacao: strOrNull(form.regime_tributacao),
      situacao: form.situacao,
      data_evento_situacao: strOrNull(form.data_evento_situacao),
      responsavel: strOrNull(form.responsavel),
    };

    setSaving(true);
    try {
      if (isEdit) await updateCliente(id, { ...payload, version });
      else await createCliente(payload);
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      navigate('/informacoes-gerais');
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar o cliente.'));
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
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/informacoes-gerais" sx={{ mb: 2 }}>
        Voltar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar informações gerais' : 'Novo cliente'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este cliente foi alterado por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Clientes">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField label="Código" type="number" value={form.codigo} onChange={(e) => setField('codigo', e.target.value)} required fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField label="Razão Social" value={form.nome} onChange={(e) => setField('nome', e.target.value)} required fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="CNPJ / CPF"
              value={form.cnpj}
              onChange={(e) => setField('cnpj', formatDocumento(e.target.value))}
              fullWidth
              size="small"
              placeholder="00.000.000/0000-00"
              inputProps={{ maxLength: 18 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Tipo" value={form.tipo_cliente} onChange={(e) => setField('tipo_cliente', e.target.value)} fullWidth size="small">
              <MenuItem value=""><em>Não informado</em></MenuItem>
              {withCurrent(TIPO_CLIENTE_OPCOES, form.tipo_cliente).map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Regime de tributação" value={form.regime_tributacao} onChange={(e) => setField('regime_tributacao', e.target.value)} fullWidth size="small">
              <MenuItem value=""><em>Não informado</em></MenuItem>
              {withCurrent(REGIME_OPCOES, form.regime_tributacao).map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Responsável" value={form.responsavel} onChange={(e) => setField('responsavel', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Situação" value={form.situacao} onChange={(e) => setField('situacao', e.target.value)} fullWidth size="small">
              {withCurrent(SITUACOES, form.situacao).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Data da situação" type="date" value={form.data_evento_situacao} onChange={(e) => setField('data_evento_situacao', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to="/informacoes-gerais">
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
