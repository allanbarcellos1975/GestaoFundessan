import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StandardActionButtons from '../../components/standard/StandardActionButtons';
import { supabase } from '../../lib/supabase';


export default function SetorServicosPage() {
  const navigate = useNavigate();
  const { setorId } = useParams();
  const [setor, setSetor] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    const [setorResult, servicosResult] = await Promise.all([
      supabase.rpc('sgf_obter_setor', { p_id: setorId }),
      supabase.rpc('sgf_listar_servicos_setor', { p_setor_id: setorId }),
    ]);

    if (setorResult.error) {
      setErro(setorResult.error.message || 'Não foi possível carregar o setor.');
      setSetor(null);
      setServicos([]);
      setLoading(false);
      return;
    }

    if (servicosResult.error) {
      setErro(servicosResult.error.message || 'Não foi possível carregar os serviços.');
      setSetor(setorResult.data || null);
      setServicos([]);
      setLoading(false);
      return;
    }

    setSetor(setorResult.data || null);
    setServicos(Array.isArray(servicosResult.data) ? servicosResult.data : []);
    setLoading(false);
  }, [setorId]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row">
        <h1>Serviços{setor?.nome ? ` — ${setor.nome}` : ''}</h1>
        <button
          type="button"
          className="standard-button users-new-button"
          onClick={() => navigate(`/configuracao/setores/${setorId}/servicos/novo`)}
          disabled={loading || !setor}
        >
          + Novo Serviço
        </button>
      </div>

      <button
        type="button"
        className="configuration-back-link"
        onClick={() => navigate('/configuracao/setores')}
      >
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table services-table">
            <thead>
              <tr>
                <th className="users-actions-col">Ações</th>
                <th>Serviço</th>
                <th>Descrição</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="users-empty-cell">Carregando...</td></tr>
              ) : servicos.length === 0 ? (
                <tr><td colSpan="4" className="users-empty-cell">Nenhum serviço cadastrado neste setor.</td></tr>
              ) : (
                servicos.map((servico) => (
                  <tr key={servico.id}>
                    <td className="users-actions-cell">
                      <StandardActionButtons
                        onEdit={() => navigate(`/configuracao/setores/${setorId}/servicos/${servico.id}/editar`)}
                        editTitle={`Editar ${servico.nome}`}
                      />
                    </td>
                    <td>{servico.nome}</td>
                    <td className="admin-description-cell">{servico.descricao || '—'}</td>
                    <td>
                      <span className={`status-badge ${servico.ativo ? 'is-active' : 'is-inactive'}`}>
                        {servico.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
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
