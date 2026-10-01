import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const INICIAL = { nome: '', descricao: '', ativo: 'true' };

export default function ServicoFormPage() {
  const navigate = useNavigate();
  const { setorId, servicoId } = useParams();
  const editando = Boolean(servicoId);
  const [setor, setSetor] = useState(null);
  const [form, setForm] = useState(INICIAL);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const setorResult = await supabase.rpc('sgf_obter_setor', { p_id: setorId });
      if (!ativo) return;

      if (setorResult.error || !setorResult.data) {
        setErro(setorResult.error?.message || 'Setor não encontrado.');
        setLoading(false);
        return;
      }

      setSetor(setorResult.data);

      if (editando) {
        const { data, error } = await supabase.rpc('sgf_obter_servico', { p_id: servicoId });
        if (!ativo) return;

        if (error || !data) {
          setErro(error?.message || 'Serviço não encontrado.');
          setLoading(false);
          return;
        }

        if (data.setor_id !== setorId) {
          setErro('O serviço não pertence a este setor.');
          setLoading(false);
          return;
        }

        setForm({
          nome: data.nome || '',
          descricao: data.descricao || '',
          ativo: data.ativo ? 'true' : 'false',
        });
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, setorId, servicoId]);

  const podeSalvar = useMemo(
    () => form.nome.trim().length >= 2 && !loading && !salvando,
    [form.nome, loading, salvando],
  );

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

    const { error } = await supabase.rpc('sgf_salvar_servico', {
      p_id: servicoId || null,
      p_setor_id: setorId,
      p_nome: form.nome.trim(),
      p_descricao: form.descricao.trim() || null,
      p_ativo: form.ativo === 'true',
    });

    if (error) {
      setErro(error.message || 'Não foi possível salvar o serviço.');
      setSalvando(false);
      return;
    }

    navigate(`/configuracao/setores/${setorId}/servicos`);
  }

  return (
    <div className="page-content user-form-page">
      <div className="users-page-title-row">
        <h1>{editando ? 'Editar Serviço' : 'Novo Serviço'}</h1>
      </div>

      <button
        type="button"
        className="configuration-back-link"
        onClick={() => navigate(`/configuracao/setores/${setorId}/servicos`)}
      >
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="user-form-card" onSubmit={salvar}>
          <div className="service-sector-name">
            <span>Setor</span>
            <strong>{setor?.nome || '—'}</strong>
          </div>

          <div className="admin-form-grid admin-form-grid-sector">
            <label className="user-form-field">
              <span>Nome</span>
              <input
                className="standard-input"
                name="nome"
                value={form.nome}
                onChange={alterar}
                required
                disabled={salvando}
              />
            </label>

            <label className="user-form-field admin-form-description">
              <span>Descrição</span>
              <input
                className="standard-input"
                name="descricao"
                value={form.descricao}
                onChange={alterar}
                disabled={salvando}
              />
            </label>

            <label className="user-form-field">
              <span>Situação</span>
              <select
                className="standard-select"
                name="ativo"
                value={form.ativo}
                onChange={alterar}
                disabled={salvando}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          <div className="user-form-actions">
            <button
              type="button"
              className="user-form-cancel-link"
              onClick={() => navigate(`/configuracao/setores/${setorId}/servicos`)}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button type="submit" className="standard-button" disabled={!podeSalvar}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
