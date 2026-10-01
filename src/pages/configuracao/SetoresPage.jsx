import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardActionButtons from '../../components/standard/StandardActionButtons';
import { supabase } from '../../lib/supabase';


export default function SetoresPage() {
  const navigate = useNavigate();
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase.rpc('sgf_listar_setores');
    if (error) {
      setErro(error.message || 'Não foi possível carregar os setores.');
      setSetores([]);
    } else {
      setSetores(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row">
        <h1>Setores</h1>
        <button type="button" className="standard-button users-new-button" onClick={() => navigate('/configuracao/setores/novo')}>
          + Novo Setor
        </button>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao')}>
        <span aria-hidden="true">←</span><span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th className="users-actions-col">Ações</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Usuários</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="users-empty-cell">Carregando...</td></tr>
              ) : setores.length === 0 ? (
                <tr><td colSpan="5" className="users-empty-cell">Nenhum setor encontrado.</td></tr>
              ) : (
                setores.map((setor) => (
                  <tr key={setor.id}>
                    <td className="users-actions-cell">
                      <StandardActionButtons
                        onEdit={() => navigate(`/configuracao/setores/${setor.id}/editar`)}
                        editTitle={`Editar ${setor.nome}`}
                      />
                    </td>
                    <td>{setor.nome}</td>
                    <td className="admin-description-cell">{setor.descricao || '—'}</td>
                    <td>{setor.quantidade_usuarios ?? 0}</td>
                    <td><span className={`status-badge ${setor.ativo ? 'is-active' : 'is-inactive'}`}>{setor.ativo ? 'Ativo' : 'Inativo'}</span></td>
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
