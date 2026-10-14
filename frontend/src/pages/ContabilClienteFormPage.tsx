import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { Alert, Box, Button, CircularProgress, Grid, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { fetchFichaContabil, updateFichaContabil } from '../api/resources';
import { campoEditavel } from '../components/CampoEditavel';
import { SectionCard } from '../components/ui';
import { CHAVES_CONTABIL, QUADROS_CONTABIL, SEM_BENEFICIO } from '../lib/contabil-campos';

/** Edição da ficha contábil do cliente. O cadastro geral é editado no menu "Clientes". */
export function ContabilClienteFormPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(CHAVES_CONTABIL.map((k) => [k, ''])),
  );
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: ficha, isLoading } = useQuery({
    queryKey: ['ficha-contabil', id],
    queryFn: () => fetchFichaContabil(id),
  });

  useEffect(() => {
    if (!ficha) return;
    const contabil = (ficha.contabil ?? {}) as Record<string, unknown>;
    setForm(
      Object.fromEntries(
        CHAVES_CONTABIL.map((k) => [k, contabil[k] == null ? '' : String(contabil[k])]),
      ),
    );
    setVersion(ficha.contabil?.version ?? 1);
  }, [ficha]);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);

    const payload: Record<string, unknown> = {};
    for (const key of CHAVES_CONTABIL) {
      const raw = form[key]?.trim() ?? '';
      payload[key] = raw === '' ? null : raw;
    }
    // Regra da planilha: sem benefício fiscal, "Qual benefício possui?" é "Não".
    if (form.possui_beneficio_fiscal === 'Não') payload.qual_beneficio_fiscal = SEM_BENEFICIO;

    setSaving(true);
    try {
      await updateFichaContabil(id, { ...payload, version });
      queryClient.invalidateQueries({ queryKey: ['ficha-contabil', id] });
      queryClient.invalidateQueries({ queryKey: ['clientes-contabil'] });
      queryClient.invalidateQueries({ queryKey: ['filtros-contabil'] });
      navigate(`/contabil/clientes/${id}`);
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

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to={`/contabil/clientes/${id}`} sx={{ mb: 2 }}>
        Cancelar
      </Button>
      <Typography variant="h5">Editar informações contábeis</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {ficha.nome} · Código {ficha.codigo} — razão social, CNPJ, tipo, situação e regime são editados no menu “Clientes”.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Estes dados foram alterados por outro usuário enquanto você editava. Recarregue antes de salvar novamente.
        </Alert>
      )}

      {QUADROS_CONTABIL.map((q) => (
        <SectionCard key={`${q.title}-${q.subtitle ?? ''}`} title={q.subtitle ? `${q.title} — ${q.subtitle}` : q.title}>
          <Grid container spacing={2}>
            {q.title === 'Informações tributárias' && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                  Regime de tributação
                </Typography>
                <TextField
                  aria-label="Regime de tributação"
                  value={ficha.regime_tributacao ?? ''}
                  fullWidth
                  size="small"
                  disabled
                  helperText="Editado no menu Clientes"
                />
              </Grid>
            )}
            {q.fields.map((f) => campoEditavel(f, form, setField, true))}
          </Grid>
        </SectionCard>
      ))}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to={`/contabil/clientes/${id}`}>Cancelar</Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
