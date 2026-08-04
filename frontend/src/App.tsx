import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ClientesListPage } from './pages/ClientesListPage';
import { ClienteDetailPage } from './pages/ClienteDetailPage';
import { ClienteFormPage } from './pages/ClienteFormPage';
import { InformacoesGeraisListPage } from './pages/InformacoesGeraisListPage';
import { InformacoesGeraisFormPage } from './pages/InformacoesGeraisFormPage';
import { AlteracoesPage } from './pages/AlteracoesPage';
import { OcorrenciasListPage } from './pages/OcorrenciasListPage';
import { OcorrenciaFormPage } from './pages/OcorrenciaFormPage';
import { PendenciasListPage } from './pages/PendenciasListPage';
import { PendenciaFormPage } from './pages/PendenciaFormPage';
import { EventosListPage } from './pages/EventosListPage';
import { EventoFormPage } from './pages/EventoFormPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { SenhasSetorListPage } from './pages/SenhasSetorListPage';
import { SenhaSetorFormPage } from './pages/SenhaSetorFormPage';
import { EntidadesListPage } from './pages/EntidadesListPage';
import { EntidadeFormPage } from './pages/EntidadeFormPage';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/informacoes-gerais" element={<InformacoesGeraisListPage />} />
          <Route path="/informacoes-gerais/novo" element={<InformacoesGeraisFormPage mode="create" />} />
          <Route path="/informacoes-gerais/:id/editar" element={<InformacoesGeraisFormPage mode="edit" />} />
          <Route path="/clientes" element={<ClientesListPage />} />
          <Route path="/clientes/:id" element={<ClienteDetailPage />} />
          <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
          <Route path="/alteracoes" element={<AlteracoesPage />} />
          <Route path="/ocorrencias" element={<OcorrenciasListPage />} />
          <Route path="/ocorrencias/nova" element={<OcorrenciaFormPage mode="create" />} />
          <Route path="/ocorrencias/:id/editar" element={<OcorrenciaFormPage mode="edit" />} />
          <Route path="/pendencias" element={<PendenciasListPage />} />
          <Route path="/pendencias/nova" element={<PendenciaFormPage mode="create" />} />
          <Route path="/pendencias/:id/editar" element={<PendenciaFormPage mode="edit" />} />
          <Route path="/eventos-futuros" element={<EventosListPage />} />
          <Route path="/eventos-futuros/novo" element={<EventoFormPage mode="create" />} />
          <Route path="/eventos-futuros/:id/editar" element={<EventoFormPage mode="edit" />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/senhas-setor" element={<SenhasSetorListPage />} />
          <Route path="/senhas-setor/nova" element={<SenhaSetorFormPage mode="create" />} />
          <Route path="/senhas-setor/:id/editar" element={<SenhaSetorFormPage mode="edit" />} />
          <Route path="/entidades" element={<EntidadesListPage />} />
          <Route path="/entidades/novo" element={<EntidadeFormPage mode="create" />} />
          <Route path="/entidades/:id/editar" element={<EntidadeFormPage mode="edit" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
