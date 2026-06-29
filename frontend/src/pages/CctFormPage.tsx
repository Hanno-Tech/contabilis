import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import { createCct, fetchCct, updateCct } from '../api/resources';
import { SectionCard } from '../components/ui';
import type { Piso, Regra } from '../types';

const SITUACOES = ['Vigente', 'Expirada', 'Em negociação'];

interface MainState {
  apelido: string;
  sindicato_patronal: string;
  sindicato_laboral: string;
  situacao: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  data_expiracao: string;
  adicional_noturno: string;
  he_dias_normais: string;
  he_domingos_feriados: string;
  he_observacoes: string;
  contatos_sindicato: string;
}

const emptyMain: MainState = {
  apelido: '',
  sindicato_patronal: '',
  sindicato_laboral: '',
  situacao: 'Vigente',
  vigencia_inicio: '',
  vigencia_fim: '',
  data_expiracao: '',
  adicional_noturno: '',
  he_dias_normais: '',
  he_domingos_feriados: '',
  he_observacoes: '',
  contatos_sindicato: '',
};

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const strOrNull = (s: string) => (s.trim() === '' ? null : s);

export function CctFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [main, setMain] = useState<MainState>(emptyMain);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: cct, isLoading } = useQuery({
    queryKey: ['cct', id],
    queryFn: () => fetchCct(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!cct) return;
    setMain({
      apelido: cct.apelido ?? '',
      sindicato_patronal: cct.sindicato_patronal ?? '',
      sindicato_laboral: cct.sindicato_laboral ?? '',
      situacao: cct.situacao ?? 'Vigente',
      vigencia_inicio: cct.vigencia_inicio ?? '',
      vigencia_fim: cct.vigencia_fim ?? '',
      data_expiracao: cct.data_expiracao ?? '',
      adicional_noturno: cct.adicional_noturno ?? '',
      he_dias_normais: cct.he_dias_normais ?? '',
      he_domingos_feriados: cct.he_domingos_feriados ?? '',
      he_observacoes: cct.he_observacoes ?? '',
      contatos_sindicato: cct.contatos_sindicato ?? '',
    });
    setPisos(cct.pisos.map((p) => ({ funcao: p.funcao, valor: p.valor })));
    setRegras(cct.regras.map((r) => ({ categoria: r.categoria, titulo: r.titulo, conteudo: r.conteudo })));
    setVersion(cct.version);
  }, [cct]);

  const setField = (key: keyof MainState, value: string) => setMain((m) => ({ ...m, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!main.apelido.trim()) {
      setError('O apelido da convenção é obrigatório.');
      return;
    }
    const payload: Record<string, unknown> = {
      apelido: main.apelido,
      sindicato_patronal: strOrNull(main.sindicato_patronal),
      sindicato_laboral: strOrNull(main.sindicato_laboral),
      situacao: main.situacao,
      vigencia_inicio: strOrNull(main.vigencia_inicio),
      vigencia_fim: strOrNull(main.vigencia_fim),
      data_expiracao: strOrNull(main.data_expiracao),
      adicional_noturno: numOrNull(main.adicional_noturno),
      he_dias_normais: numOrNull(main.he_dias_normais),
      he_domingos_feriados: numOrNull(main.he_domingos_feriados),
      he_observacoes: strOrNull(main.he_observacoes),
      contatos_sindicato: strOrNull(main.contatos_sindicato),
      pisos: pisos
        .filter((p) => p.funcao.trim())
        .map((p) => ({ funcao: p.funcao, valor: p.valor ? Number(p.valor) : null })),
      regras: regras
        .filter((r) => r.categoria.trim() && r.conteudo.trim())
        .map((r) => ({ categoria: r.categoria, titulo: strOrNull(r.titulo ?? ''), conteudo: r.conteudo })),
    };

    setSaving(true);
    try {
      const saved = isEdit ? await updateCct(id, { ...payload, version }) : await createCct(payload);
      queryClient.invalidateQueries({ queryKey: ['cct'] });
      navigate(`/cct/${saved.id}`);
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar a convenção.'));
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
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to={isEdit ? `/cct/${id}` : '/cct'} sx={{ mb: 2 }}>
        Cancelar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar convenção' : 'Nova convenção'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta convenção foi alterada por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Identificação">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Apelido" value={main.apelido} onChange={(e) => setField('apelido', e.target.value)} required fullWidth size="small" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Situação" value={main.situacao} onChange={(e) => setField('situacao', e.target.value)} fullWidth size="small">
              {SITUACOES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Sindicato patronal" value={main.sindicato_patronal} onChange={(e) => setField('sindicato_patronal', e.target.value)} fullWidth size="small" multiline />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Sindicato laboral" value={main.sindicato_laboral} onChange={(e) => setField('sindicato_laboral', e.target.value)} fullWidth size="small" multiline />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Início da vigência" type="date" value={main.vigencia_inicio} onChange={(e) => setField('vigencia_inicio', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Fim da vigência" type="date" value={main.vigencia_fim} onChange={(e) => setField('vigencia_fim', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Data de expiração" type="date" value={main.data_expiracao} onChange={(e) => setField('data_expiracao', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Contatos do sindicato" value={main.contatos_sindicato} onChange={(e) => setField('contatos_sindicato', e.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Jornada e horas extras">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Percentuais em fração (ex.: 0.6 = 60%).
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField label="HE dias normais" type="number" value={main.he_dias_normais} onChange={(e) => setField('he_dias_normais', e.target.value)} fullWidth size="small" inputProps={{ step: '0.01' }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="HE domingos/feriados" type="number" value={main.he_domingos_feriados} onChange={(e) => setField('he_domingos_feriados', e.target.value)} fullWidth size="small" inputProps={{ step: '0.01' }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Adicional noturno" type="number" value={main.adicional_noturno} onChange={(e) => setField('adicional_noturno', e.target.value)} fullWidth size="small" inputProps={{ step: '0.01' }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Observações sobre horas extras" value={main.he_observacoes} onChange={(e) => setField('he_observacoes', e.target.value)} fullWidth size="small" multiline minRows={2} />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title="Pisos salariais"
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => setPisos([...pisos, { funcao: '', valor: '' }])}>
            Adicionar
          </Button>
        }
      >
        <Stack spacing={1.5}>
          {pisos.map((p, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <TextField label="Função" value={p.funcao} onChange={(e) => setPisos(pisos.map((x, j) => (j === i ? { ...x, funcao: e.target.value } : x)))} size="small" sx={{ flex: 1 }} />
              <TextField label="Valor (R$)" type="number" value={p.valor ?? ''} onChange={(e) => setPisos(pisos.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} size="small" sx={{ width: 160 }} inputProps={{ step: '0.01' }} />
              <IconButton color="error" onClick={() => setPisos(pisos.filter((_, j) => j !== i))}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          {pisos.length === 0 && <Typography variant="body2" color="text.disabled">Nenhum piso adicionado.</Typography>}
        </Stack>
      </SectionCard>

      <SectionCard
        title="Regras (texto)"
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => setRegras([...regras, { categoria: '', titulo: '', conteudo: '' }])}>
            Adicionar
          </Button>
        }
      >
        <Stack spacing={2}>
          {regras.map((r, i) => (
            <Box key={i} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField label="Categoria" value={r.categoria} onChange={(e) => setRegras(regras.map((x, j) => (j === i ? { ...x, categoria: e.target.value } : x)))} size="small" sx={{ flex: 1 }} />
                <TextField label="Subtítulo (opcional)" value={r.titulo ?? ''} onChange={(e) => setRegras(regras.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))} size="small" sx={{ flex: 1 }} />
                <IconButton color="error" onClick={() => setRegras(regras.filter((_, j) => j !== i))}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
              <TextField label="Conteúdo" value={r.conteudo} onChange={(e) => setRegras(regras.map((x, j) => (j === i ? { ...x, conteudo: e.target.value } : x)))} size="small" fullWidth multiline minRows={2} />
            </Box>
          ))}
          {regras.length === 0 && <Typography variant="body2" color="text.disabled">Nenhuma regra adicionada.</Typography>}
        </Stack>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to={isEdit ? `/cct/${id}` : '/cct'}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
