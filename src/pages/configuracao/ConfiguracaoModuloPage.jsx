import { useNavigate } from 'react-router-dom';

export default function ConfiguracaoModuloPage({ title }) {
  const navigate = useNavigate();

  return (
    <div className="page-content configuration-page">
      <div className="page-header-row configuration-page-header">
        <h1>{title}</h1>
      </div>

      <button
        type="button"
        className="configuration-back-link"
        onClick={() => navigate('/configuracao')}
      >
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>
    </div>
  );
}
