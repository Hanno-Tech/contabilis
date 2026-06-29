import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ClientesListPage } from './pages/ClientesListPage';
import { ClienteDetailPage } from './pages/ClienteDetailPage';
import { ClienteFormPage } from './pages/ClienteFormPage';
import { CctListPage } from './pages/CctListPage';
import { CctDetailPage } from './pages/CctDetailPage';
import { CctFormPage } from './pages/CctFormPage';
import { AlteracoesPage } from './pages/AlteracoesPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientesListPage />} />
          <Route path="/clientes/novo" element={<ClienteFormPage mode="create" />} />
          <Route path="/clientes/:id" element={<ClienteDetailPage />} />
          <Route path="/clientes/:id/editar" element={<ClienteFormPage mode="edit" />} />
          <Route path="/cct" element={<CctListPage />} />
          <Route path="/cct/nova" element={<CctFormPage mode="create" />} />
          <Route path="/cct/:id" element={<CctDetailPage />} />
          <Route path="/cct/:id/editar" element={<CctFormPage mode="edit" />} />
          <Route path="/alteracoes" element={<AlteracoesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
