import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import InsightsIcon from '@mui/icons-material/Insights';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PieChartIcon from '@mui/icons-material/PieChart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchDashboard } from '../api/resources';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, Mono, SectionCard, formatCompetencia, formatDate } from '../components/ui';
import type { ClienteIncompleto, Dashboard, EventoProximo, Vencimento } from '../types';

const CHART_COLORS = ['#FF8A1E', '#0E9F6E', '#52473D', '#0EA5E9', '#D97706', '#E11D48', '#14B8A6', '#EF8E19'];

/**
 * Teto de altura dos blocos de lista do dashboard. Sem ele, um bloco com
 * centenas de registros (a carteira inteira em "Visão geral incompleta")
 * estica a página por vários metros. Os dois blocos de cada linha ficam com a
 * mesma altura e rolam por dentro.
 */
const ALTURA_BLOCO = 440;

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ------------------------------------------------------------------ KPI cards
function KpiCard({
  icon,
  value,
  label,
  hint,
  color,
  onClick,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  hint?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        '&:hover': onClick
          ? { transform: 'translateY(-2px)', boxShadow: '0 10px 28px rgba(15,23,42,0.10)' }
          : undefined,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: color,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography
            sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 34, lineHeight: 1 }}
          >
            {value}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.75 }}>
            {label}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            color,
            bgcolor: alpha(color, 0.12),
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

// ----------------------------------------------------------- Vencimentos (B)
const FAIXAS = [
  { key: 'vencido', label: 'Vencidos', color: '#E11D48', test: (d: number) => d < 0 },
  { key: '30', label: '≤ 30 dias', color: '#EA580C', test: (d: number) => d >= 0 && d <= 30 },
  { key: '60', label: '31–60 dias', color: '#D97706', test: (d: number) => d > 30 && d <= 60 },
  { key: '90', label: '61–90 dias', color: '#0EA5E9', test: (d: number) => d > 60 && d <= 90 },
] as const;

function faixaDe(dias: number) {
  return FAIXAS.find((f) => f.test(dias)) ?? FAIXAS[3];
}

function textoDias(dias: number): string {
  if (dias < 0) return `vencido há ${-dias} dia${dias === -1 ? '' : 's'}`;
  if (dias === 0) return 'vence hoje';
  return `em ${dias} dia${dias === 1 ? '' : 's'}`;
}

function categoriaIcon(_categoria: Vencimento['categoria']) {
  return <GroupsIcon sx={{ fontSize: 18 }} />;
}

function VencimentoRow({ v, onClick }: { v: Vencimento; onClick: () => void }) {
  const faixa = faixaDe(v.dias);
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      onClick={onClick}
      sx={{
        py: 1.25,
        px: 1,
        borderRadius: 2,
        cursor: 'pointer',
        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: faixa.color, flexShrink: 0 }} />
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{categoriaIcon(v.categoria)}</Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {v.registro_codigo !== null && <Mono sx={{ color: 'text.secondary' }}>{v.registro_codigo} </Mono>}
          {v.registro_nome}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {v.tipo} · <Mono>{formatDate(v.data)}</Mono>
        </Typography>
      </Box>
      <Chip
        size="small"
        label={textoDias(v.dias)}
        sx={{
          flexShrink: 0,
          fontWeight: 700,
          color: faixa.color,
          bgcolor: alpha(faixa.color, 0.12),
          border: 'none',
        }}
      />
    </Stack>
  );
}

function VencimentosBlock({ data }: { data: Vencimento[] }) {
  const navigate = useNavigate();
  const [faixa, setFaixa] = useState<string>('todos');

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of FAIXAS) c[f.key] = data.filter((v) => f.test(v.dias)).length;
    return c;
  }, [data]);

  const filtrados = faixa === 'todos' ? data : data.filter((v) => faixaDe(v.dias).key === faixa);

  return (
    <SectionCard
      fill
      maxHeight={ALTURA_BLOCO}
      title="Alertas de vencimento"
      icon={<NotificationsActiveIcon color="error" />}
      action={
        <Typography variant="caption" color="text.secondary">
          próximos 90 dias + vencidos
        </Typography>
      }
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          label={`Todos · ${data.length}`}
          size="small"
          onClick={() => setFaixa('todos')}
          variant={faixa === 'todos' ? 'filled' : 'outlined'}
          color={faixa === 'todos' ? 'primary' : 'default'}
        />
        {FAIXAS.map((f) => (
          <Chip
            key={f.key}
            size="small"
            label={`${f.label} · ${contagem[f.key]}`}
            onClick={() => setFaixa(f.key)}
            variant={faixa === f.key ? 'filled' : 'outlined'}
            sx={
              faixa === f.key
                ? { bgcolor: f.color, color: '#fff', '&:hover': { bgcolor: f.color } }
                : { borderColor: alpha(f.color, 0.5), color: f.color }
            }
          />
        ))}
      </Stack>

      {filtrados.length > 0 ? (
        <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
          {filtrados.map((v, i) => (
            <VencimentoRow
              key={`${v.registro_id}-${v.tipo}-${i}`}
              v={v}
              onClick={() => navigate(`/clientes/${v.registro_id}`)}
            />
          ))}
        </Stack>
      ) : (
        <EmptyState message="Nada vencendo nessa faixa." />
      )}
    </SectionCard>
  );
}

// -------------------------------------------------------------- Charts (C)
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <Box sx={{ bgcolor: '#0F172A', color: '#fff', px: 1.5, py: 0.75, borderRadius: 2, fontSize: 12 }}>
      <strong>{p.name}</strong>: {p.value}
    </Box>
  );
}

function BarsHorizontais({ data }: { data: { label: string; total: number }[] }) {
  if (!data.length) return <EmptyState message="Sem dados." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tick={{ fontSize: 12, fill: '#475569' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip cursor={{ fill: 'rgba(79,70,229,0.06)' }} content={<ChartTooltip />} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Rosca({ data }: { data: { label: string; total: number }[] }) {
  if (!data.length) return <EmptyState message="Sem dados." />;
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <ResponsiveContainer width="55%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="label"
            innerRadius={48}
            outerRadius={78}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <Stack spacing={0.75} sx={{ flexGrow: 1, minWidth: 0 }}>
        {data.map((d, i) => (
          <Stack key={d.label} direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '3px',
                bgcolor: CHART_COLORS[i % CHART_COLORS.length],
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
              {d.label}
            </Typography>
            <Mono sx={{ fontWeight: 600 }}>{d.total}</Mono>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------- Atividade (D)
/** Rota de destino de um item da trilha de auditoria, por tipo de registro. */
function atividadeDestino(entidade: string, id: string): string {
  switch (entidade) {
    case 'ocorrencia':
      return `/ocorrencias/${id}/editar`;
    case 'pendencia':
      return `/pendencias/${id}/editar`;
    case 'evento':
      return `/eventos-futuros/${id}/editar`;
    default:
      return `/clientes/${id}`;
  }
}

function AtividadeBlock({ data }: { data: Dashboard['atividade'] }) {
  const navigate = useNavigate();
  return (
    <SectionCard
      fill
      maxHeight={ALTURA_BLOCO}
      title="Atividade recente"
      icon={<HistoryIcon color="primary" />}
      action={
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', fontWeight: 700 }}
          onClick={() => navigate('/alteracoes')}
        >
          Ver tudo →
        </Typography>
      }
    >
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        {[
          { n: data.ultimos_7, l: 'nos últimos 7 dias' },
          { n: data.ultimos_30, l: 'nos últimos 30 dias' },
        ].map((s) => (
          <Paper key={s.l} variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: 26 }}>
              {s.n}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.l}
            </Typography>
          </Paper>
        ))}
      </Stack>

      {data.recentes.length > 0 ? (
        <Stack spacing={1.25}>
          {data.recentes.map((a) => (
            <Stack
              key={a.id}
              direction="row"
              spacing={1.25}
              alignItems="center"
              onClick={() => navigate(atividadeDestino(a.entidade, a.entidade_id))}
              sx={{ cursor: 'pointer', '&:hover .lbl': { color: 'primary.main' } }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: a.acao === 'criou' ? 'success.main' : 'primary.main',
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
                <strong>{a.usuario_nome}</strong> {a.acao}{' '}
                <Box component="span" className="lbl">
                  {a.entidade_label}
                </Box>
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : (
        <EmptyState message="Nenhuma alteração registrada ainda." />
      )}
    </SectionCard>
  );
}

// ------------------------------------------------ Empresas incompletas (E)
function IncompletosBlock({ data }: { data: ClienteIncompleto[] }) {
  const navigate = useNavigate();
  return (
    <SectionCard
      fill
      maxHeight={ALTURA_BLOCO}
      title="Empresas com Visão geral incompleta"
      icon={<WarningAmberIcon sx={{ color: '#D97706' }} />}
      action={
        <Typography variant="caption" color="text.secondary">
          {data.length} a completar
        </Typography>
      }
    >
      {data.length > 0 ? (
        <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
          {data.map((c) => (
            <Stack
              key={c.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              onClick={() => navigate(`/clientes/${c.id}`)}
              sx={{
                py: 1.25,
                px: 1,
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  <Mono sx={{ color: 'text.secondary' }}>{c.codigo} </Mono>
                  {c.nome}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ficha incompleta
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${c.faltantes} campo(s)`}
                sx={{
                  flexShrink: 0,
                  fontWeight: 700,
                  color: '#B45309',
                  bgcolor: alpha('#F59E0B', 0.14),
                  border: 'none',
                }}
              />
            </Stack>
          ))}
        </Stack>
      ) : (
        <EmptyState message="Todos os cadastros estão completos." />
      )}
    </SectionCard>
  );
}

// -------------------------------------------- Eventos futuros a lançar (F)
function EventosBlock({ data }: { data: EventoProximo[] }) {
  const navigate = useNavigate();
  const textoMeses = (meses: number) => {
    if (meses < 0) return `atrasado ${-meses} mês(es)`;
    if (meses === 0) return 'este mês';
    return `em ${meses} mês(es)`;
  };
  return (
    <SectionCard
      fill
      maxHeight={ALTURA_BLOCO}
      title="Eventos futuros a lançar"
      icon={<EventNoteIcon color="primary" />}
      action={
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', fontWeight: 700 }}
          onClick={() => navigate('/eventos-futuros')}
        >
          Ver tudo →
        </Typography>
      }
    >
      {data.length > 0 ? (
        <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
          {data.map((e) => (
            <Stack
              key={e.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              onClick={() => navigate(`/eventos-futuros/${e.id}/editar`)}
              sx={{
                py: 1.25,
                px: 1,
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {e.nome}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {e.descricao || e.colaborador || 'Lançamento'} · competência{' '}
                  <Mono>{formatCompetencia(e.competencia)}</Mono>
                </Typography>
              </Box>
              <Chip
                size="small"
                label={textoMeses(e.meses)}
                sx={{
                  flexShrink: 0,
                  fontWeight: 700,
                  color: e.meses < 0 ? '#BE123C' : '#B45309',
                  bgcolor: alpha(e.meses < 0 ? '#E11D48' : '#F59E0B', 0.14),
                  border: 'none',
                }}
              />
            </Stack>
          ))}
        </Stack>
      ) : (
        <EmptyState message="Nenhum evento próximo a lançar." />
      )}
    </SectionCard>
  );
}

// -------------------------------------------------------------------- Página
export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (isLoading || !data) {
    return (
      <Box sx={{ p: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const { kpis, vencimentos, composicao, atividade, incompletos, eventos } = data;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">
          {saudacao()}, {user?.name?.split(' ')[0]}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
          {hoje}
        </Typography>
      </Box>

      {/* A — KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 1 }}>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<GroupsIcon />}
            value={kpis.clientes_ativos}
            label="Clientes ativos"
            hint={`${kpis.clientes_total} no total`}
            color="#4F46E5"
            onClick={() => undefined}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<WarningAmberIcon />}
            value={incompletos.length}
            label="Cadastros incompletos"
            hint="empresas a completar"
            color="#D97706"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<EventNoteIcon />}
            value={eventos.length}
            label="Eventos a lançar"
            hint="competência próxima"
            color="#0E9F6E"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={<NotificationsActiveIcon />}
            value={kpis.vencimentos_vencidos + kpis.vencimentos_30}
            label="Vencimentos urgentes"
            hint={`${kpis.vencimentos_vencidos} vencido(s) · ${kpis.vencimentos_30} em 30 dias`}
            color="#E11D48"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        {/* B — Alertas (coluna principal) */}
        <Grid item xs={12} md={7}>
          <VencimentosBlock data={vencimentos} />
        </Grid>
        {/* D — Atividade (coluna lateral) */}
        <Grid item xs={12} md={5}>
          <AtividadeBlock data={atividade} />
        </Grid>
      </Grid>

      {/* E/F — Cadastros incompletos + eventos a lançar */}
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        <Grid item xs={12} md={7}>
          <IncompletosBlock data={incompletos} />
        </Grid>
        <Grid item xs={12} md={5}>
          <EventosBlock data={eventos} />
        </Grid>
      </Grid>

      {/* C — Composição */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, mb: 1.5 }}>
        <InsightsIcon color="primary" />
        <Typography variant="h6">Composição da carteira</Typography>
      </Stack>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <SectionCard title="Clientes por responsável" icon={<GroupsIcon color="action" />}>
            <BarsHorizontais data={composicao.por_responsavel} />
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Por regime de tributação" icon={<PieChartIcon color="action" />}>
            <Rosca data={composicao.por_regime} />
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Por situação" icon={<PieChartIcon color="action" />}>
            <Rosca data={composicao.por_situacao} />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
