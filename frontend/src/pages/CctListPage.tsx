import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listCct } from '../api/resources';
import { EmptyState, Mono, SituacaoChip, formatDate } from '../components/ui';

export function CctListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['cct'], queryFn: listCct });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5">Convenções Coletivas (CCT)</Typography>
          <Typography variant="body2" color="text.secondary">
            {data ? `${data.length} convenção(ões)` : 'Carregando...'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/cct/nova')}>
          Nova convenção
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : data && data.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Apelido</TableCell>
                <TableCell>Sindicato laboral</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell>Vigência</TableCell>
                <TableCell>Expiração</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cct/${c.id}`)}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.apelido}</TableCell>
                  <TableCell>{c.sindicato_laboral ?? '—'}</TableCell>
                  <TableCell>
                    <SituacaoChip situacao={c.situacao} />
                  </TableCell>
                  <TableCell>
                    {c.vigencia_inicio ? (
                      <Mono>{`${formatDate(c.vigencia_inicio)} – ${formatDate(c.vigencia_fim)}`}</Mono>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {c.data_expiracao ? <Mono>{formatDate(c.data_expiracao)}</Mono> : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhuma convenção cadastrada." />
        )}
      </Paper>
    </Box>
  );
}
