import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardActionButtons from '../../components/standard/StandardActionButtons';
import { supabase } from '../../lib/supabase';

export default function PerfisPage() {
  const navigate = useNavigate();
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    const { data, error } = await supabase.rpc('sgf_listar_perfis');

    if (error) {
      setErro(error.message || 'Não foi possível carregar os perfis.');
      setPerfis([]);
    } else {
      setPerfis(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row">
        <h1>Perfis</h1>
        <button type="button" className="standard-button users-new-button" onClick={() => navigate('/configuracao/perfis/novo')}>
          + Novo Perfil
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
                <th>Nome</th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Usuários</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="users-empty-cell">Carregando...</td></tr>
              ) : perfis.length === 0 ? (
                <tr><td colSpan="6" className="users-empty-cell">Nenhum perfil encontrado.</td></tr>
              ) : (
                perfis.map((perfil) => (
                  <tr key={perfil.id}>
                    <td className="users-actions-cell">
                      <StandardActionButtons
                        onEdit={() => navigate(`/configuracao/perfis/${perfil.id}/editar`)}
                        editTitle={`Editar ${perfil.nome}`}
                      />
                    </td>
                    <td>{perfil.nome}</td>
                    <td>{perfil.codigo}</td>
                    <td className="admin-description-cell">{perfil.descricao || '—'}</td>
                    <td>{perfil.quantidade_usuarios ?? 0}</td>
                    <td>
                      <span className={`status-badge ${perfil.ativo ? 'is-active' : 'is-inactive'}`}>
                        {perfil.ativo ? 'Ativo' : 'Inativo'}
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
