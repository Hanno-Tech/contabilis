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
import { ContabilClientesListPage } from './pages/ContabilClientesListPage';
import { ContabilClienteDetailPage } from './pages/ContabilClienteDetailPage';
import { ContabilClienteFormPage } from './pages/ContabilClienteFormPage';
import { ImoveisListPage } from './pages/ImoveisListPage';
import { ImovelFormPage } from './pages/ImovelFormPage';

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

          {/* Setor contábil — as telas compartilhadas recebem o setor por prop */}
          <Route path="/contabil" element={<Navigate to="/contabil/clientes" replace />} />
          <Route path="/contabil/clientes" element={<ContabilClientesListPage />} />
          <Route path="/contabil/clientes/:id" element={<ContabilClienteDetailPage />} />
          <Route path="/contabil/clientes/:id/editar" element={<ContabilClienteFormPage />} />
          <Route path="/contabil/imoveis" element={<ImoveisListPage />} />
          <Route path="/contabil/imoveis/novo" element={<ImovelFormPage mode="create" />} />
          <Route path="/contabil/imoveis/:id/editar" element={<ImovelFormPage mode="edit" />} />
          <Route path="/contabil/ocorrencias" element={<OcorrenciasListPage key="contabil" setor="contabil" />} />
          <Route path="/contabil/ocorrencias/nova" element={<OcorrenciaFormPage key="contabil" mode="create" setor="contabil" />} />
          <Route path="/contabil/ocorrencias/:id/editar" element={<OcorrenciaFormPage key="contabil" mode="edit" setor="contabil" />} />
          <Route path="/contabil/pendencias" element={<PendenciasListPage key="contabil" setor="contabil" />} />
          <Route path="/contabil/pendencias/nova" element={<PendenciaFormPage key="contabil" mode="create" setor="contabil" />} />
          <Route path="/contabil/pendencias/:id/editar" element={<PendenciaFormPage key="contabil" mode="edit" setor="contabil" />} />
          <Route path="/contabil/eventos-futuros" element={<EventosListPage key="contabil" setor="contabil" />} />
          <Route path="/contabil/eventos-futuros/novo" element={<EventoFormPage key="contabil" mode="create" setor="contabil" />} />
          <Route path="/contabil/eventos-futuros/:id/editar" element={<EventoFormPage key="contabil" mode="edit" setor="contabil" />} />
          <Route path="/contabil/senhas-setor" element={<SenhasSetorListPage key="contabil" setor="contabil" />} />
          <Route path="/contabil/senhas-setor/nova" element={<SenhaSetorFormPage key="contabil" mode="create" setor="contabil" />} />
          <Route path="/contabil/senhas-setor/:id/editar" element={<SenhaSetorFormPage key="contabil" mode="edit" setor="contabil" />} />
          <Route path="/contabil/relatorios" element={<RelatoriosPage key="contabil" setor="contabil" />} />
          <Route path="/contabil/alteracoes" element={<AlteracoesPage key="contabil" setor="contabil" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
