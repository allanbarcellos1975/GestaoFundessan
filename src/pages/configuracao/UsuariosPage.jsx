import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardActionButtons from '../../components/standard/StandardActionButtons';
import { supabase } from '../../lib/supabase';


export default function UsuariosPage() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let active = true;

    async function carregarUsuarios() {
      setLoading(true);
      setErro('');

      const { data, error } = await supabase.rpc('sgf_listar_usuarios');

      if (!active) return;

      if (error) {
        setErro(error.message || 'Não foi possível carregar os usuários.');
        setUsuarios([]);
      } else {
        setUsuarios(Array.isArray(data) ? data : []);
      }

      setLoading(false);
    }

    carregarUsuarios();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-content users-page">
      <div className="users-page-title-row">
        <h1>Usuários</h1>
        <button
          type="button"
          className="standard-button users-new-button"
          onClick={() => navigate('/configuracao/usuarios/novo')}
        >
          + Novo Usuário
        </button>
      </div>

      <button
        type="button"
        className="configuration-back-link"
        onClick={() => navigate('/configuracao')}
      >
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
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Setor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="users-empty-cell">Carregando...</td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan="6" className="users-empty-cell">Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="users-actions-cell">
                      <StandardActionButtons
                        onEdit={() => navigate(`/configuracao/usuarios/${usuario.id}/editar`)}
                        editTitle={`Editar ${usuario.nome || usuario.email || 'usuário'}`}
                      />
                    </td>
                    <td>{usuario.nome || '—'}</td>
                    <td>{usuario.email || '—'}</td>
                    <td>{usuario.perfil || 'Sem perfil'}</td>
                    <td>{usuario.setor || 'Sem setor'}</td>
                    <td>
                      <span className={`status-badge ${usuario.ativo ? 'is-active' : 'is-inactive'}`}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
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
