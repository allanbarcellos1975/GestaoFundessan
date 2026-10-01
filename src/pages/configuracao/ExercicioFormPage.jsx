import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const INICIAL = {
  ano: '',
  situacao: 'ABERTO',
  atual: 'false',
  observacoes: '',
};

export default function ExercicioFormPage() {
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
      setErro('');

      const { data, error } = await supabase.rpc('sgf_obter_exercicio', { p_id: id });
      if (!ativo) return;

      if (error || !data) {
        setErro(error?.message || 'Exercício não encontrado.');
      } else {
        setForm({
          ano: data.ano ?? '',
          situacao: data.situacao || 'ABERTO',
          atual: data.atual ? 'true' : 'false',
          observacoes: data.observacoes || '',
        });
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, id]);

  const podeSalvar = useMemo(() => {
    const ano = Number(form.ano);
    return Number.isInteger(ano) && ano >= 2000 && ano <= 2100 && !loading && !salvando;
  }, [form.ano, loading, salvando]);

  function alterar(event) {
    const { name, value } = event.target;
    setForm((atual) => {
      const proximo = { ...atual, [name]: value };
      if (name === 'situacao' && value === 'ENCERRADO') proximo.atual = 'false';
      if (name === 'atual' && value === 'true') proximo.situacao = 'ABERTO';
      return proximo;
    });
    setErro('');
  }

  async function salvar(event) {
    event.preventDefault();
    if (!podeSalvar) return;

    setSalvando(true);
    setErro('');

    const { error } = await supabase.rpc('sgf_salvar_exercicio', {
      p_id: editando ? id : null,
      p_ano: Number(form.ano),
      p_situacao: form.situacao,
      p_atual: form.atual === 'true',
      p_observacoes: form.observacoes.trim() || null,
    });

    if (error) {
      setErro(error.message || 'Não foi possível salvar o exercício.');
      setSalvando(false);
      return;
    }

    navigate('/configuracao/exercicios');
  }

  return (
    <div className="page-content user-form-page">
      <div className="users-page-title-row">
        <div>
          <h1>{editando ? 'Editar Exercício' : 'Novo Exercício'}</h1>
          <p className="requerentes-page-subtitle">
            O exercício atual será selecionado automaticamente nas novas propostas.
          </p>
        </div>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/exercicios')}>
        <span aria-hidden="true">←</span><span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="user-form-card" onSubmit={salvar}>
          <div className="admin-form-grid admin-form-grid-sector">
            <label className="user-form-field">
              <span>Ano *</span>
              <input
                className="standard-input"
                type="number"
                min="2000"
                max="2100"
                step="1"
                name="ano"
                value={form.ano}
                onChange={alterar}
                placeholder="Ex.: 2026"
                required
                disabled={salvando || editando}
              />
            </label>

            <label className="user-form-field">
              <span>Situação</span>
              <select className="standard-select" name="situacao" value={form.situacao} onChange={alterar} disabled={salvando}>
                <option value="ABERTO">Aberto</option>
                <option value="ENCERRADO">Encerrado</option>
              </select>
            </label>

            <label className="user-form-field">
              <span>Exercício atual</span>
              <select className="standard-select" name="atual" value={form.atual} onChange={alterar} disabled={salvando}>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </label>

            <label className="user-form-field admin-form-description">
              <span>Observações</span>
              <input
                className="standard-input"
                name="observacoes"
                value={form.observacoes}
                onChange={alterar}
                maxLength="500"
                disabled={salvando}
              />
            </label>
          </div>

          <div className="user-form-actions">
            <button type="button" className="user-form-cancel-link" onClick={() => navigate('/configuracao/exercicios')} disabled={salvando}>
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
