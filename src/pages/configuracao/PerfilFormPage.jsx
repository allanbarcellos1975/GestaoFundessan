import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const INICIAL = { nome: '', codigo: '', descricao: '', ativo: 'true' };
const PERFIS_PROTEGIDOS = new Set(['MASTER', 'SECRETARIO']);

export default function PerfilFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);
  const [form, setForm] = useState(INICIAL);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [protegido, setProtegido] = useState(false);

  useEffect(() => {
    if (!editando) return;

    let ativo = true;

    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase.rpc('sgf_obter_perfil', { p_id: id });
      if (!ativo) return;

      if (error || !data) {
        setErro(error?.message || 'Perfil não encontrado.');
      } else {
        const codigo = String(data.codigo || '').toUpperCase();
        setForm({
          nome: data.nome || '',
          codigo: data.codigo || '',
          descricao: data.descricao || '',
          ativo: data.ativo ? 'true' : 'false',
        });
        setProtegido(PERFIS_PROTEGIDOS.has(codigo));
      }
      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, id]);

  const podeSalvar = useMemo(() => (
    form.nome.trim().length >= 2
    && form.codigo.trim().length >= 2
    && !salvando
    && !loading
  ), [form, salvando, loading]);

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

    const { error } = await supabase.rpc('sgf_salvar_perfil', {
      p_id: id || null,
      p_codigo: form.codigo.trim().toUpperCase(),
      p_nome: form.nome.trim(),
      p_descricao: form.descricao.trim() || null,
      p_ativo: form.ativo === 'true',
    });

    if (error) {
      setErro(error.message || 'Não foi possível salvar o perfil.');
      setSalvando(false);
      return;
    }

    navigate('/configuracao/perfis');
  }

  return (
    <div className="page-content user-form-page">
      <div className="users-page-title-row"><h1>{editando ? 'Editar Perfil' : 'Novo Perfil'}</h1></div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/perfis')}>
        <span aria-hidden="true">←</span><span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="user-form-card" onSubmit={salvar}>
          <div className="admin-form-grid admin-form-grid-profile">
            <label className="user-form-field">
              <span>Nome</span>
              <input className="standard-input" name="nome" value={form.nome} onChange={alterar} required disabled={salvando || protegido} />
            </label>

            <label className="user-form-field">
              <span>Código</span>
              <input className="standard-input" name="codigo" value={form.codigo} onChange={alterar} required disabled={salvando || protegido} />
            </label>

            <label className="user-form-field admin-form-description">
              <span>Descrição</span>
              <input className="standard-input" name="descricao" value={form.descricao} onChange={alterar} disabled={salvando} />
            </label>

            <label className="user-form-field">
              <span>Situação</span>
              <select className="standard-select" name="ativo" value={form.ativo} onChange={alterar} disabled={salvando || protegido}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          {protegido ? <div className="admin-form-note">Este é um perfil estrutural do sistema e não pode ser renomeado nem desativado.</div> : null}

          <div className="user-form-actions">
            <button type="button" className="user-form-cancel-link" onClick={() => navigate('/configuracao/perfis')} disabled={salvando}>Cancelar</button>
            <button type="submit" className="standard-button" disabled={!podeSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
