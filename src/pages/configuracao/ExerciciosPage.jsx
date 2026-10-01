import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardActionButtons from '../../components/standard/StandardActionButtons';
import { supabase } from '../../lib/supabase';

export default function ExerciciosPage() {
  const navigate = useNavigate();
  const [exercicios, setExercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    const { data, error } = await supabase.rpc('sgf_listar_exercicios');

    if (error) {
      setErro(error.message || 'Não foi possível carregar os exercícios.');
      setExercicios([]);
    } else {
      setExercicios(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row">
        <div>
          <h1>Exercícios</h1>
          <p className="requerentes-page-subtitle">
            Define o ano de referência das propostas, processos, contratos e demais operações do FUNDESSAN.
          </p>
        </div>

        <button
          type="button"
          className="standard-button users-new-button"
          onClick={() => navigate('/configuracao/exercicios/novo')}
        >
          + Novo Exercício
        </button>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao')}>
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th className="users-actions-col">Ações</th>
                <th>Exercício</th>
                <th>Situação</th>
                <th>Exercício atual</th>
                <th>Propostas</th>
                <th>Contratos</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="users-empty-cell">Carregando...</td></tr>
              ) : exercicios.length === 0 ? (
                <tr><td colSpan="7" className="users-empty-cell">Nenhum exercício encontrado.</td></tr>
              ) : (
                exercicios.map((exercicio) => (
                  <tr key={exercicio.id}>
                    <td className="users-actions-cell">
                      <StandardActionButtons
                        onEdit={() => navigate(`/configuracao/exercicios/${exercicio.id}/editar`)}
                        editTitle={`Editar exercício ${exercicio.ano}`}
                      />
                    </td>
                    <td><strong>{exercicio.ano}</strong></td>
                    <td>
                      <span className={`status-badge ${exercicio.situacao === 'ABERTO' ? 'is-active' : 'is-inactive'}`}>
                        {exercicio.situacao === 'ABERTO' ? 'Aberto' : 'Encerrado'}
                      </span>
                    </td>
                    <td>{exercicio.atual ? 'Sim' : 'Não'}</td>
                    <td>{exercicio.quantidade_propostas ?? 0}</td>
                    <td>{exercicio.quantidade_contratos ?? 0}</td>
                    <td className="admin-description-cell">{exercicio.observacoes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
