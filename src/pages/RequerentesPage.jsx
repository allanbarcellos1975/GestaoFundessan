import { FilePlus2, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import StandardActionButtons from '../components/standard/StandardActionButtons';
import { supabase } from '../lib/supabase';

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarDocumento(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  const cnpj = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  if (cnpj.length === 14) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
  }

  return valor || '—';
}

function formatarTelefone(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digitos.length === 10) return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return valor || '—';
}

export default function RequerentesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const codigoPerfil = String(user?.perfilCodigo || '').toUpperCase();
  const acessoOperacionalTotal = ['MASTER', 'ADMINISTRADOR', 'SECRETARIO'].includes(codigoPerfil);
  const permissoes = Array.isArray(user?.permissoes) ? user.permissoes.map((item) => String(item).toLowerCase()) : [];
  const podeIncluir = acessoOperacionalTotal || permissoes.includes('incluir');
  const podeEditar = acessoOperacionalTotal || permissoes.includes('editar');

  const [requerentes, setRequerentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('TODOS');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const { data, error } = await supabase.rpc('sgf_listar_requerentes');
      if (!ativo) return;

      if (error) {
        setErro(error.message || 'Não foi possível carregar os Requerentes.');
        setRequerentes([]);
      } else {
        setRequerentes(Array.isArray(data) ? data : []);
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return requerentes.filter((requerente) => {
      const atendeSituacao = situacao === 'TODOS' || String(requerente.situacao || '').toUpperCase() === situacao;
      if (!atendeSituacao) return false;
      if (!termo) return true;

      const texto = [
        requerente.nome_razao_social,
        requerente.nome_fantasia,
        requerente.cpf_cnpj,
        formatarDocumento(requerente.cpf_cnpj),
        requerente.categorias,
        requerente.telefone,
        requerente.whatsapp,
      ].filter(Boolean).join(' ').toLowerCase();

      return texto.includes(termo);
    });
  }, [requerentes, busca, situacao]);

  return (
    <div className="page-content users-page requerentes-page">
      <div className="users-page-title-row">
        <div>
          <h1>Requerentes</h1>
          <p className="requerentes-page-subtitle">Cadastro-base das pessoas físicas e jurídicas que poderão apresentar propostas de crédito.</p>
        </div>

        {podeIncluir ? (
          <button type="button" className="standard-button users-new-button" onClick={() => navigate('/requerentes/novo')}>
            + Novo Requerente
          </button>
        ) : null}
      </div>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="requerentes-filters-card">
        <label className="user-form-field requerentes-search-field">
          <span>Pesquisar</span>
          <input
            className="standard-input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Nome, CPF/CNPJ, categoria ou telefone"
          />
        </label>

        <label className="user-form-field requerentes-status-filter">
          <span>Situação</span>
          <select className="standard-select" value={situacao} onChange={(event) => setSituacao(event.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </select>
        </label>
      </div>

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table requerentes-table">
            <thead>
              <tr>
                <th className="users-actions-col">Ações</th>
                <th>Nome / Razão Social</th>
                <th>CPF / CNPJ</th>
                <th>Tipo</th>
                <th>Categorias</th>
                <th>Telefone</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="users-empty-cell">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan="7" className="users-empty-cell">Nenhum Requerente encontrado.</td></tr>
              ) : (
                filtrados.map((requerente) => (
                  <tr key={requerente.id}>
                    <td className="users-actions-cell">
                      {podeEditar || podeIncluir ? (
                        <StandardActionButtons
                          actions={[
                            podeEditar
                              ? {
                                  key: 'edit',
                                  title: 'Editar',
                                  ariaLabel: `Editar ${requerente.nome_razao_social}`,
                                  icon: Pencil,
                                  onClick: () => navigate(`/requerentes/${requerente.id}/editar`),
                                }
                              : null,
                            podeIncluir
                              ? {
                                  key: 'new-proposal',
                                  title: 'Nova Proposta',
                                  ariaLabel: `Nova proposta para ${requerente.nome_razao_social}`,
                                  icon: FilePlus2,
                                  onClick: () => navigate(`/propostas/novo?requerente=${requerente.id}`),
                                }
                              : null,
                          ].filter(Boolean)}
                        />
                      ) : '—'}
                    </td>
                    <td>
                      <strong className="requerentes-name">{requerente.nome_razao_social || '—'}</strong>
                      {requerente.nome_fantasia ? <span className="requerentes-secondary">{requerente.nome_fantasia}</span> : null}
                    </td>
                    <td>{formatarDocumento(requerente.cpf_cnpj)}</td>
                    <td>{requerente.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</td>
                    <td>{requerente.categorias || '—'}</td>
                    <td>{formatarTelefone(requerente.telefone || requerente.whatsapp)}</td>
                    <td>
                      <span className={`status-badge ${String(requerente.situacao).toUpperCase() === 'ATIVO' ? 'is-active' : 'is-inactive'}`}>
                        {String(requerente.situacao).toUpperCase() === 'ATIVO' ? 'Ativo' : 'Inativo'}
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
