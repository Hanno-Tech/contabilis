import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { fetchFichaContabil, listImoveis } from '../api/resources';
import { ReadField, SectionCard, SituacaoChip, formatDate } from '../components/ui';
import { QUADROS_CONTABIL } from '../lib/contabil-campos';
import { ImovelSituacaoChip } from './ImoveisListPage';

/** Ficha contábil do cliente (somente leitura). */
export function ContabilClienteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: ficha, isLoading, error } = useQuery({
    queryKey: ['ficha-contabil', id],
    queryFn: () => fetchFichaContabil(id),
  });
  const { data: imoveis } = useQuery({
    queryKey: ['imoveis', { cliente_id: id }],
    queryFn: () => listImoveis({ cliente_id: id }),
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !ficha) return <Alert severity="error">Não foi possível carregar o cliente.</Alert>;

  const contabil = (ficha.contabil ?? {}) as Record<string, string | null>;
  const comoTexto = Object.fromEntries(
    Object.entries(contabil).map(([k, v]) => [k, v == null ? '' : String(v)]),
  );

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/contabil/clientes" sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5">{ficha.nome}</Typography>
            <SituacaoChip situacao={ficha.situacao} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Código {ficha.codigo} · {ficha.cnpj ?? 'sem CNPJ'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/contabil/clientes/${id}/editar`)}>
          Editar
        </Button>
      </Stack>

      <SectionCard
        title="Cadastro geral"
        action={
          <Button size="small" component={RouterLink} to={`/informacoes-gerais/${id}/editar`} startIcon={<EditIcon fontSize="small" />}>
            Editar dados gerais
          </Button>
        }
      >
        <Grid container spacing={2}>
          <ReadField label="Código" value={ficha.codigo} />
          <ReadField label="Razão social" value={ficha.nome} />
          <ReadField label="CNPJ / CPF" value={ficha.cnpj} />
          <ReadField label="Tipo de cliente" value={ficha.tipo_cliente} />
          <ReadField label="Regime de tributação" value={ficha.regime_tributacao} />
          <ReadField label="Situação" value={ficha.situacao} />
          <ReadField label="Data da situação" value={formatDate(ficha.data_evento_situacao)} />
        </Grid>
      </SectionCard>

      {QUADROS_CONTABIL.map((q) => (
        <SectionCard key={`${q.title}-${q.subtitle ?? ''}`} title={q.subtitle ? `${q.title} — ${q.subtitle}` : q.title}>
          <Grid container spacing={2}>
            {q.fields.map((f) =>
              f.showIf && !f.showIf(comoTexto) ? null : (
                <ReadField key={f.key} label={f.label} value={contabil[f.key]} wide={f.wide} pre={f.type === 'multiline'} />
              ),
            )}
          </Grid>
        </SectionCard>
      ))}

      <SectionCard
        title="Imóveis"
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => navigate(`/contabil/imoveis/novo?cliente=${id}`)}>
            Novo imóvel
          </Button>
        }
      >
        {imoveis && imoveis.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nº</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Município</TableCell>
                <TableCell>Matrícula</TableCell>
                <TableCell>Utilização</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {imoveis.map((i) => (
                <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/contabil/imoveis/${i.id}/editar`)}>
                  <TableCell>{i.numero_ordem}</TableCell>
                  <TableCell>{i.tipo ?? '—'}</TableCell>
                  <TableCell>{i.municipio ?? '—'}</TableCell>
                  <TableCell>{i.matricula ?? '—'}</TableCell>
                  <TableCell>{i.utilizacao ?? '—'}</TableCell>
                  <TableCell>
                    <ImovelSituacaoChip situacao={i.situacao} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.disabled">
            Nenhum imóvel cadastrado.
          </Typography>
        )}
      </SectionCard>
    </Box>
  );
}
