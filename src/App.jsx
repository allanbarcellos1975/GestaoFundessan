import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RecuperarSenhaPage from './pages/auth/RecuperarSenhaPage';
import AlterarSenhaPage from './pages/auth/AlterarSenhaPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import RequerentesPage from './pages/RequerentesPage';
import RequerenteFormPage from './pages/RequerenteFormPage';
import PropostasPage from './pages/PropostasPage';
import PropostaFormPage from './pages/PropostaFormPage';
import MemoriasCalculoPage from './pages/MemoriasCalculoPage';
import MemoriaCalculoDetalhePage from './pages/MemoriaCalculoDetalhePage';
import ContratosPage from './pages/ContratosPage';
import ConfiguracaoPage from './pages/configuracao/ConfiguracaoPage';
import UsuariosPage from './pages/configuracao/UsuariosPage';
import NovoUsuarioPage from './pages/configuracao/NovoUsuarioPage';
import PerfisPage from './pages/configuracao/PerfisPage';
import PerfilFormPage from './pages/configuracao/PerfilFormPage';
import SetoresPage from './pages/configuracao/SetoresPage';
import SetorFormPage from './pages/configuracao/SetorFormPage';
import CadastroInstitucionalPage from './pages/configuracao/CadastroInstitucionalPage';
import ExerciciosPage from './pages/configuracao/ExerciciosPage';
import ExercicioFormPage from './pages/configuracao/ExercicioFormPage';
import NormasCondicoesCreditoPage from './pages/configuracao/NormasCondicoesCreditoPage';
import NormasCreditoPage from './pages/configuracao/NormasCreditoPage';
import CondicoesCreditoPage from './pages/configuracao/CondicoesCreditoPage';
import CondicaoCreditoDetalhePage from './pages/configuracao/CondicaoCreditoDetalhePage';
import CondicaoCreditoFormPage from './pages/configuracao/CondicaoCreditoFormPage';
import NormaCreditoDetalhePage from './pages/configuracao/NormaCreditoDetalhePage';
import NormaCreditoFormPage from './pages/configuracao/NormaCreditoFormPage';

function MasterOnly({ children }) {
  return <ProtectedRoute masterOnly>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/recuperar-senha" element={<PublicOnlyRoute><RecuperarSenhaPage /></PublicOnlyRoute>} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="alterar-senha" element={<AlterarSenhaPage />} />

            <Route path="requerentes" element={<RequerentesPage />} />
            <Route path="requerentes/novo" element={<RequerenteFormPage />} />
            <Route path="requerentes/:id/editar" element={<RequerenteFormPage />} />

            <Route path="propostas" element={<PropostasPage />} />
            <Route path="propostas/novo" element={<PropostaFormPage />} />
            <Route path="propostas/:id/editar" element={<PropostaFormPage />} />
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="financeiro" element={<MemoriasCalculoPage />} />
            <Route path="financeiro/:propostaId" element={<MemoriaCalculoDetalhePage />} />
            <Route path="memoria-calculo" element={<MemoriasCalculoPage />} />
            <Route path="memoria-calculo/:propostaId" element={<MemoriaCalculoDetalhePage />} />

            <Route path="configuracao" element={<MasterOnly><ConfiguracaoPage /></MasterOnly>} />
            <Route path="configuracao/perfis" element={<MasterOnly><PerfisPage /></MasterOnly>} />
            <Route path="configuracao/perfis/novo" element={<MasterOnly><PerfilFormPage /></MasterOnly>} />
            <Route path="configuracao/perfis/:id/editar" element={<MasterOnly><PerfilFormPage /></MasterOnly>} />
            <Route path="configuracao/permissoes" element={<Navigate to="/configuracao/usuarios" replace />} />
            <Route path="configuracao/setores" element={<MasterOnly><SetoresPage /></MasterOnly>} />
            <Route path="configuracao/setores/novo" element={<MasterOnly><SetorFormPage /></MasterOnly>} />
            <Route path="configuracao/setores/:id/editar" element={<MasterOnly><SetorFormPage /></MasterOnly>} />
            <Route path="configuracao/usuarios" element={<MasterOnly><UsuariosPage /></MasterOnly>} />
            <Route path="configuracao/usuarios/novo" element={<MasterOnly><NovoUsuarioPage /></MasterOnly>} />
            <Route path="configuracao/usuarios/:id/editar" element={<MasterOnly><NovoUsuarioPage /></MasterOnly>} />
            <Route path="configuracao/institucional" element={<MasterOnly><CadastroInstitucionalPage /></MasterOnly>} />
            <Route path="configuracao/exercicios" element={<MasterOnly><ExerciciosPage /></MasterOnly>} />
            <Route path="configuracao/exercicios/novo" element={<MasterOnly><ExercicioFormPage /></MasterOnly>} />
            <Route path="configuracao/exercicios/:id/editar" element={<MasterOnly><ExercicioFormPage /></MasterOnly>} />
            <Route path="configuracao/normas-credito" element={<MasterOnly><NormasCondicoesCreditoPage /></MasterOnly>} />

            <Route path="configuracao/normas-credito/normas" element={<MasterOnly><NormasCreditoPage /></MasterOnly>} />
            <Route path="configuracao/normas-credito/normas/novo" element={<MasterOnly><NormaCreditoFormPage /></MasterOnly>} />
            <Route path="configuracao/normas-credito/normas/:id" element={<MasterOnly><NormaCreditoDetalhePage /></MasterOnly>} />
            <Route path="configuracao/normas-credito/normas/:id/editar" element={<MasterOnly><NormaCreditoFormPage /></MasterOnly>} />

            <Route path="configuracao/normas-credito/condicoes" element={<MasterOnly><CondicoesCreditoPage /></MasterOnly>} />
            <Route path="configuracao/normas-credito/condicoes/novo" element={<MasterOnly><CondicaoCreditoFormPage /></MasterOnly>} />
            <Route path="configuracao/normas-credito/condicoes/:id" element={<MasterOnly><CondicaoCreditoDetalhePage /></MasterOnly>} />
            <Route path="configuracao/normas-credito/condicoes/:id/editar" element={<MasterOnly><CondicaoCreditoFormPage /></MasterOnly>} />

            <Route path="configuracao/normas-credito/novo" element={<Navigate to="/configuracao/normas-credito/normas/novo" replace />} />
            <Route path="configuracao/normas-credito/:id" element={<MasterOnly><NormaCreditoDetalhePage /></MasterOnly>} />
            <Route path="configuracao/normas-credito/:id/editar" element={<MasterOnly><NormaCreditoFormPage /></MasterOnly>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
