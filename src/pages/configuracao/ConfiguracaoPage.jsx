import { Building2, Calendar, Landmark, Scale, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfiguracaoIconGrid from '../../components/configuracao/ConfiguracaoIconGrid';

const itens = [
  {
    label: 'Perfis',
    path: '/configuracao/perfis',
    descricao: 'Perfis de acesso utilizados para organizar os usuários do sistema.',
    icon: ShieldCheck,
  },
  {
    label: 'Setores',
    path: '/configuracao/setores',
    descricao: 'Setores internos utilizados para organizar os usuários.',
    icon: Building2,
  },
  {
    label: 'Usuários',
    path: '/configuracao/usuarios',
    descricao: 'Usuários, perfil, setor, situação e permissões de acesso.',
    icon: Users,
  },
  {
    label: 'Cadastro Institucional',
    path: '/configuracao/institucional',
    descricao: 'Dados oficiais do FUNDESSAN utilizados nas propostas, contratos e documentos emitidos.',
    icon: Landmark,
  },
  {
    label: 'Exercícios',
    path: '/configuracao/exercicios',
    descricao: 'Anos de referência utilizados para organizar propostas, processos, contratos e demais operações do FUNDESSAN.',
    icon: Calendar,
  },
  {
    label: 'Normas e Condições de Crédito',
    path: '/configuracao/normas-credito',
    descricao: 'Normas do FUNDESSAN e condições contratuais de crédito com instituições financeiras, mantendo histórico de vigências.',
    icon: Scale,
  },
];

export default function ConfiguracaoPage() {
  const navigate = useNavigate();

  function handleVoltar() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  }

  return (
    <div className="page-content configuration-page">
      <div className="page-header-row configuration-page-header">
        <h1>Configuração</h1>
      </div>

      <button type="button" className="configuration-back-link" onClick={handleVoltar}>
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      <ConfiguracaoIconGrid items={itens} />
    </div>
  );
}
