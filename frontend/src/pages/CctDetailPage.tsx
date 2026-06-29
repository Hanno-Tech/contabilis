import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
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
import { fetchCct, fetchClientesDaCct } from '../api/resources';
import { EmptyState, ReadField, SectionCard, SituacaoChip, formatDate, formatMoney } from '../components/ui';
import type { Regra } from '../types';

function groupByCategoria(regras: Regra[]): Record<string, Regra[]> {
  return regras.reduce<Record<string, Regra[]>>((acc, r) => {
    (acc[r.categoria] ??= []).push(r);
    return acc;
  }, {});
}

function pct(value: string | null): string {
  if (!value) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${(n * 100).toLocaleString('pt-BR')}%`;
}

export function CctDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: cct, isLoading, error } = useQuery({ queryKey: ['cct', id], queryFn: () => fetchCct(id) });
  const { data: clientes } = useQuery({ queryKey: ['cct', id, 'clientes'], queryFn: () => fetchClientesDaCct(id) });

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !cct) return <Alert severity="error">Não foi possível carregar a convenção.</Alert>;

  const grupos = groupByCategoria(cct.regras);

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/cct" sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5">{cct.apelido}</Typography>
            <SituacaoChip situacao={cct.situacao} />
          </Stack>
        </Box>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/cct/${id}/editar`)}>
          Editar
        </Button>
      </Stack>

      <SectionCard title="Identificação">
        <Grid container spacing={2}>
          <ReadField label="Sindicato patronal" value={cct.sindicato_patronal} wide />
          <ReadField label="Sindicato laboral" value={cct.sindicato_laboral} wide />
          <ReadField label="Vigência" value={cct.vigencia_inicio ? `${formatDate(cct.vigencia_inicio)} a ${formatDate(cct.vigencia_fim)}` : null} />
          <ReadField label="Data de expiração" value={formatDate(cct.data_expiracao)} />
          <ReadField label="Situação" value={cct.situacao} />
          <ReadField label="Contatos do sindicato" value={cct.contatos_sindicato} wide />
        </Grid>
      </SectionCard>

      <SectionCard title="Pisos salariais">
        {cct.pisos.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Função</TableCell>
                <TableCell align="right">Piso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cct.pisos.map((p, i) => (
                <TableRow key={p.id ?? i}>
                  <TableCell>{p.funcao}</TableCell>
                  <TableCell align="right">{formatMoney(p.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Sem pisos cadastrados." />
        )}
      </SectionCard>

      <SectionCard title="Jornada e horas extras">
        <Grid container spacing={2}>
          <ReadField label="HE dias normais (seg–sáb)" value={pct(cct.he_dias_normais)} />
          <ReadField label="HE domingos e feriados" value={pct(cct.he_domingos_feriados)} />
          <ReadField label="Adicional noturno" value={pct(cct.adicional_noturno)} />
          <ReadField label="Observações sobre horas extras" value={cct.he_observacoes} wide pre />
        </Grid>
      </SectionCard>

      <SectionCard title="Regras (texto)">
        {Object.keys(grupos).length ? (
          Object.entries(grupos).map(([categoria, regras], idx) => (
            <Box key={categoria} sx={{ mb: 2 }}>
              {idx > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {categoria}
              </Typography>
              {regras.map((r, i) => (
                <Box key={r.id ?? i} sx={{ mb: 1.5 }}>
                  {r.titulo && (
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.titulo}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {r.conteudo}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))
        ) : (
          <EmptyState message="Sem regras cadastradas." />
        )}
      </SectionCard>

      <SectionCard title="Clientes vinculados">
        {clientes && clientes.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell>Responsável</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${c.id}`)}>
                  <TableCell>{c.codigo}</TableCell>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell>
                    <SituacaoChip situacao={c.situacao} />
                  </TableCell>
                  <TableCell>{c.responsavel ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhum cliente vinculado a esta convenção." />
        )}
      </SectionCard>
    </Box>
  );
}
