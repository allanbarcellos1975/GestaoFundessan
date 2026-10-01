import { FileText, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfiguracaoIconGrid from '../../components/configuracao/ConfiguracaoIconGrid';

const itens = [
  {
    label: 'Normas',
    path: '/configuracao/normas-credito/normas',
    descricao: 'Decretos, resoluções, limites, faixas, carência, cronograma e demais regras normativas.',
    icon: FileText,
  },
  {
    label: 'Condições de Crédito',
    path: '/configuracao/normas-credito/condicoes',
    descricao: 'Contratos com instituições financeiras, juros, tarifas, pagamento, garantias e histórico de vigências.',
    icon: Landmark,
  },
];

export default function NormasCondicoesCreditoPage() {
  const navigate = useNavigate();

  return (
    <div className="page-content configuration-page">
      <div className="page-header-row configuration-page-header">
        <div>
          <h1>Normas e Condições de Crédito</h1>
          <p className="norms-page-subtitle">Cadastros normativos e condições contratuais utilizados nas operações de crédito do FUNDESSAN.</p>
        </div>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao')}>
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      <ConfiguracaoIconGrid items={itens} />
    </div>
  );
}
