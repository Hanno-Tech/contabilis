import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BadgeIcon from '@mui/icons-material/Badge';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Drawer,
  IconButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { brandGradient } from '../theme';

const SIDEBAR_WIDTH = 256;

type NavItem = { to: string; label: string; icon: ReactNode };
type NavGroup = { label: string; icon: ReactNode; children: NavItem[] };
type NavEntry = ({ kind: 'item' } & NavItem) | ({ kind: 'group' } & NavGroup);

const navEntries: NavEntry[] = [
  // Menu de topo, no mesmo nível de "Setor pessoal".
  {
    kind: 'item',
    to: '/informacoes-gerais',
    label: 'Clientes',
    icon: <BadgeIcon fontSize="small" />,
  },
  {
    kind: 'group',
    label: 'Setor pessoal',
    icon: <WorkOutlineIcon fontSize="small" />,
    children: [
      { to: '/', label: 'Dashboards', icon: <DashboardIcon fontSize="small" /> },
      { to: '/clientes', label: 'Informações Gerais', icon: <GroupsIcon fontSize="small" /> },
      { to: '/ocorrencias', label: 'Ocorrências', icon: <ReportProblemOutlinedIcon fontSize="small" /> },
      { to: '/pendencias', label: 'Pendências', icon: <PlaylistAddCheckIcon fontSize="small" /> },
      { to: '/eventos-futuros', label: 'Eventos futuros', icon: <EventNoteIcon fontSize="small" /> },
      { to: '/senhas-setor', label: 'Senhas do setor', icon: <VpnKeyOutlinedIcon fontSize="small" /> },
      { to: '/relatorios', label: 'Relatórios', icon: <AssessmentOutlinedIcon fontSize="small" /> },
      { to: '/alteracoes', label: 'Alterações', icon: <HistoryIcon fontSize="small" /> },
    ],
  },
];

/** Marca em gradiente — assinatura da identidade. */
function Brand() {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, py: 2.5 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 2,
          background: brandGradient,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 700,
          fontSize: 20,
          boxShadow: '0 8px 20px rgba(79,70,229,0.35)',
        }}
      >
        C
      </Box>
      <Box>
        <Typography
          sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.1 }}
        >
          Contabilis
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Departamento Pessoal
        </Typography>
      </Box>
    </Stack>
  );
}

function isItemActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

function NavLink({ to, label, icon, onNavigate, nested }: {
  to: string;
  label: string;
  icon: ReactNode;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const location = useLocation();
  const active = isItemActive(location.pathname, to);
  return (
    <Box
      component={RouterLink}
      to={to}
      onClick={onNavigate}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mx: 1.5,
        my: 0.25,
        pl: nested ? 3.5 : 1.75,
        pr: 1.75,
        py: 1.1,
        borderRadius: 2,
        textDecoration: 'none',
        position: 'relative',
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.1) : 'transparent',
        fontWeight: active ? 700 : 500,
        transition: 'background-color 120ms ease, color 120ms ease',
        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, active ? 0.13 : 0.06) },
        '&::before': active
          ? {
              content: '""',
              position: 'absolute',
              left: -6,
              top: 8,
              bottom: 8,
              width: 4,
              borderRadius: 4,
              background: brandGradient,
            }
          : undefined,
      }}
    >
      <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 'inherit' }}>
        {label}
      </ListItemText>
    </Box>
  );
}

function NavGroupItem({ group, onNavigate }: { group: NavGroup; onNavigate?: () => void }) {
  const location = useLocation();
  const hasActiveChild = group.children.some((c) => isItemActive(location.pathname, c.to));
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: 'calc(100% - 24px)',
          mx: 1.5,
          my: 0.25,
          px: 1.75,
          py: 1.1,
          border: 0,
          borderRadius: 2,
          cursor: 'pointer',
          textAlign: 'left',
          bgcolor: 'transparent',
          color: hasActiveChild ? 'text.primary' : 'text.secondary',
          fontWeight: 700,
          transition: 'background-color 120ms ease, color 120ms ease',
          '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>{group.icon}</ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 'inherit' }}>
          {group.label}
        </ListItemText>
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {group.children.map((item) => (
          <NavLink key={item.to} {...item} onNavigate={onNavigate} nested />
        ))}
      </Collapse>
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
      <Brand />
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 3, pt: 1, pb: 0.5, fontSize: 10 }}
      >
        Navegação
      </Typography>
      <Box sx={{ flexGrow: 1 }}>
        {navEntries.map((entry) =>
          entry.kind === 'group' ? (
            <NavGroupItem key={entry.label} group={entry} onNavigate={onNavigate} />
          ) : (
            <NavLink
              key={entry.to}
              to={entry.to}
              label={entry.label}
              icon={entry.icon}
              onNavigate={onNavigate}
            />
          ),
        )}
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 36, height: 36, background: brandGradient, fontSize: 15 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              @{user?.username}
            </Typography>
          </Box>
          <Tooltip title="Sair">
            <IconButton onClick={logout} size="small" sx={{ color: 'text.secondary' }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar permanente (desktop) */}
      <Box
        component="nav"
        sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          <SidebarContent />
        </Drawer>

        {/* Drawer temporário (mobile) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      </Box>

      {/* Área principal */}
      <Box sx={{ flexGrow: 1, width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` } }}>
        {/* Top bar só no mobile, para abrir o menu */}
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{
            display: { md: 'none' },
            bgcolor: '#fff',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}>
              Contabilis
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
