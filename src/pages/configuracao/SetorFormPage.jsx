import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const INICIAL = { nome: '', descricao: '', ativo: 'true' };

export default function SetorFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);
  const [form, setForm] = useState(INICIAL);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!editando) return;
    let ativo = true;

    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase.rpc('sgf_obter_setor', { p_id: id });
      if (!ativo) return;
      if (error || !data) {
        setErro(error?.message || 'Setor não encontrado.');
      } else {
        setForm({ nome: data.nome || '', descricao: data.descricao || '', ativo: data.ativo ? 'true' : 'false' });
      }
      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, id]);

  const podeSalvar = useMemo(() => form.nome.trim().length >= 2 && !loading && !salvando, [form.nome, loading, salvando]);

  function alterar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    setErro('');
  }

  async function salvar(event) {
    event.preventDefault();
    if (!podeSalvar) return;
    setSalvando(true);
    setErro('');

    const { error } = await supabase.rpc('sgf_salvar_setor', {
      p_id: id || null,
      p_nome: form.nome.trim(),
      p_descricao: form.descricao.trim() || null,
      p_ativo: form.ativo === 'true',
    });

    if (error) {
      setErro(error.message || 'Não foi possível salvar o setor.');
      setSalvando(false);
      return;
    }

    navigate('/configuracao/setores');
  }

  return (
    <div className="page-content user-form-page">
      <div className="users-page-title-row"><h1>{editando ? 'Editar Setor' : 'Novo Setor'}</h1></div>
      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/setores')}>
        <span aria-hidden="true">←</span><span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="user-form-card" onSubmit={salvar}>
          <div className="admin-form-grid admin-form-grid-sector">
            <label className="user-form-field">
              <span>Nome</span>
              <input className="standard-input" name="nome" value={form.nome} onChange={alterar} required disabled={salvando} />
            </label>
            <label className="user-form-field admin-form-description">
              <span>Descrição</span>
              <input className="standard-input" name="descricao" value={form.descricao} onChange={alterar} disabled={salvando} />
            </label>
            <label className="user-form-field">
              <span>Situação</span>
              <select className="standard-select" name="ativo" value={form.ativo} onChange={alterar} disabled={salvando}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          <div className="user-form-actions">
            <button type="button" className="user-form-cancel-link" onClick={() => navigate('/configuracao/setores')} disabled={salvando}>Cancelar</button>
            <button type="submit" className="standard-button" disabled={!podeSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
