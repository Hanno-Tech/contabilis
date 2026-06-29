import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Avatar,
  Box,
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

const navItems = [
  { to: '/', label: 'Visão geral', icon: <DashboardIcon fontSize="small" /> },
  { to: '/clientes', label: 'Clientes', icon: <GroupsIcon fontSize="small" /> },
  { to: '/cct', label: 'Convenções (CCT)', icon: <DescriptionIcon fontSize="small" /> },
  { to: '/alteracoes', label: 'Alterações', icon: <HistoryIcon fontSize="small" /> },
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

function NavLink({ to, label, icon, onNavigate }: {
  to: string;
  label: string;
  icon: ReactNode;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
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
        px: 1.75,
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
        {navItems.map((item) => (
          <NavLink key={item.to} {...item} onNavigate={onNavigate} />
        ))}
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

        <Box sx={{ px: { xs: 2, sm: 3, md: 5 }, py: { xs: 3, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
