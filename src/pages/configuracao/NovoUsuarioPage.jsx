import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const FORM_INICIAL = {
  nome: '',
  email: '',
  perfilId: '',
  setorId: '',
  ativo: 'true',
  consultar: true,
  incluir: true,
  editar: true,
  excluir: true,
};

const ACOES = [
  ['consultar', 'Consultar'],
  ['incluir', 'Incluir'],
  ['editar', 'Editar'],
  ['excluir', 'Excluir'],
];

const PERFIS_ESPECIAIS = new Set(['MASTER', 'SECRETARIO']);

export default function NovoUsuarioPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);

  const [form, setForm] = useState(FORM_INICIAL);
  const [perfis, setPerfis] = useState([]);
  const [setores, setSetores] = useState([]);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
  const [carregandoUsuario, setCarregandoUsuario] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregandoOpcoes(true);
      setCarregandoUsuario(editando);
      setErro('');

      const [opcoesResult, usuarioResult] = await Promise.all([
        supabase.rpc('sgf_usuario_form_opcoes'),
        editando
          ? supabase.rpc('sgf_obter_usuario', { p_usuario_id: id })
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!ativo) return;

      if (opcoesResult.error) {
        setErro(opcoesResult.error.message || 'Não foi possível carregar os dados do formulário.');
        setPerfis([]);
        setSetores([]);
      } else {
        setPerfis(Array.isArray(opcoesResult.data?.perfis) ? opcoesResult.data.perfis : []);
        setSetores(Array.isArray(opcoesResult.data?.setores) ? opcoesResult.data.setores : []);
      }

      if (editando) {
        if (usuarioResult.error) {
          setErro(usuarioResult.error.message || 'Não foi possível carregar o usuário.');
        } else if (usuarioResult.data) {
          const permissoes = usuarioResult.data.permissoes || {};
          setForm({
            nome: usuarioResult.data.nome || '',
            email: usuarioResult.data.email || '',
            perfilId: usuarioResult.data.perfil_id || '',
            setorId: usuarioResult.data.setor_id || '',
            ativo: usuarioResult.data.ativo === false ? 'false' : 'true',
            consultar: Boolean(permissoes.consultar),
            incluir: Boolean(permissoes.incluir),
            editar: Boolean(permissoes.editar),
            excluir: Boolean(permissoes.excluir),
          });
        }
      }

      setCarregandoOpcoes(false);
      setCarregandoUsuario(false);
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [editando, id]);

  const perfilSelecionado = useMemo(
    () => perfis.find((perfil) => perfil.id === form.perfilId) || null,
    [perfis, form.perfilId],
  );

  const codigoPerfil = String(perfilSelecionado?.codigo || '').toUpperCase();
  const perfilEspecial = PERFIS_ESPECIAIS.has(codigoPerfil);

  const podeSalvar = useMemo(() => (
    form.nome.trim().length >= 2
    && form.email.trim().length > 0
    && Boolean(form.perfilId)
    && (perfilEspecial || Boolean(form.setorId))
    && !salvando
    && !carregandoOpcoes
    && !carregandoUsuario
  ), [form, perfilEspecial, salvando, carregandoOpcoes, carregandoUsuario]);

  function atualizarCampo(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    setErro('');
    setSucesso('');
  }

  function atualizarPermissao(event) {
    const { name, checked } = event.target;
    if (perfilEspecial) return;
    setForm((atual) => ({ ...atual, [name]: checked }));
    setErro('');
    setSucesso('');
  }

  function atualizarTodasPermissoes(event) {
    const { checked } = event.target;
    if (perfilEspecial) return;
    setForm((atual) => ({
      ...atual,
      consultar: checked,
      incluir: checked,
      editar: checked,
      excluir: checked,
    }));
    setErro('');
    setSucesso('');
  }

  const todasPermissoes = ACOES.every(([campo]) => Boolean(form[campo]));

  async function salvarUsuario(event) {
    event.preventDefault();
    if (!podeSalvar) return;

    setSalvando(true);
    setErro('');
    setSucesso('');
    setResultado(null);
    setCopiado(false);

    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      perfil_id: form.perfilId,
      setor_id: form.setorId || null,
      ativo: form.ativo === 'true',
      permissoes: perfilEspecial
        ? null
        : {
            consultar: Boolean(form.consultar),
            incluir: Boolean(form.incluir),
            editar: Boolean(form.editar),
            excluir: Boolean(form.excluir),
          },
    };

    const { data, error } = await supabase.functions.invoke('sgf-gerenciar-usuario-auth', {
      body: {
        acao: editando ? 'editar' : 'criar',
        id: editando ? id : undefined,
        ...payload,
      },
    });

    if (error) {
      let mensagem = error.message || `Não foi possível ${editando ? 'atualizar' : 'criar'} o usuário.`;
      try {
        const contexto = error.context;
        if (contexto && typeof contexto.json === 'function') {
          const corpo = await contexto.json();
          mensagem = corpo?.message || mensagem;
        }
      } catch {
        // Mantém a mensagem original do Supabase Functions.
      }
      setErro(mensagem);
      setSalvando(false);
      return;
    }

    if (!data?.ok) {
      setErro(data?.message || `Não foi possível ${editando ? 'atualizar' : 'criar'} o usuário.`);
      setSalvando(false);
      return;
    }

    if (editando) {
      setSucesso('Usuário atualizado com sucesso.');
      setSalvando(false);
      return;
    }

    setResultado({
      nome: data.usuario?.nome || payload.nome,
      email: data.usuario?.email || payload.email,
      senhaTemporaria: data.senha_temporaria || '',
    });
    setSalvando(false);
  }

  async function copiarSenha() {
    if (!resultado?.senhaTemporaria) return;

    try {
      await navigator.clipboard.writeText(resultado.senhaTemporaria);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  if (carregandoOpcoes || carregandoUsuario) {
    return (
      <div className="page-content user-form-page">
        <div className="users-page-title-row"><h1>{editando ? 'Editar Usuário' : 'Novo Usuário'}</h1></div>
        <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/usuarios')}>
          <span aria-hidden="true">←</span><span>Voltar</span>
        </button>
        <div className="users-table-card"><div className="users-empty-cell">Carregando...</div></div>
      </div>
    );
  }

  return (
    <div className="page-content user-form-page">
      <div className="users-page-title-row">
        <h1>{editando ? 'Editar Usuário' : 'Novo Usuário'}</h1>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/usuarios')}>
        <span aria-hidden="true">←</span><span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}
      {sucesso ? <div className="admin-success">{sucesso}</div> : null}

      {resultado ? (
        <div className="user-created-card">
          <h2>Usuário criado com sucesso</h2>
          <div className="user-created-data">
            <div><span>Nome</span><strong>{resultado.nome}</strong></div>
            <div><span>E-mail</span><strong>{resultado.email}</strong></div>
            <div className="user-created-password-row">
              <div><span>Senha temporária</span><strong className="temporary-password">{resultado.senhaTemporaria || '—'}</strong></div>
              {resultado.senhaTemporaria ? (
                <button type="button" className="standard-button" onClick={copiarSenha}>{copiado ? 'Copiada' : 'Copiar senha'}</button>
              ) : null}
            </div>
          </div>
          <div className="user-form-actions">
            <button type="button" className="standard-button" onClick={() => navigate('/configuracao/usuarios')}>Voltar para Usuários</button>
          </div>
        </div>
      ) : (
        <form className="user-form-card" onSubmit={salvarUsuario}>
          <div className="user-form-grid">
            <label className="user-form-field user-form-field-half">
              <span>Nome</span>
              <input className="standard-input" type="text" name="nome" value={form.nome} onChange={atualizarCampo} autoComplete="off" required disabled={salvando} />
            </label>

            <label className="user-form-field user-form-field-half">
              <span>E-mail</span>
              <input className="standard-input" type="email" name="email" value={form.email} onChange={atualizarCampo} autoComplete="off" required disabled={salvando} />
            </label>

            <label className="user-form-field user-form-field-third">
              <span>Perfil</span>
              <select className="standard-select" name="perfilId" value={form.perfilId} onChange={atualizarCampo} required disabled={salvando}>
                <option value="">Selecione</option>
                {perfis.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nome}</option>)}
              </select>
            </label>

            <label className="user-form-field user-form-field-third">
              <span>Setor</span>
              <select className="standard-select" name="setorId" value={form.setorId} onChange={atualizarCampo} required={!perfilEspecial} disabled={salvando}>
                <option value="">{perfilEspecial ? 'Sem setor' : 'Selecione'}</option>
                {setores.map((setor) => <option key={setor.id} value={setor.id}>{setor.nome}</option>)}
              </select>
            </label>

            <label className="user-form-field user-form-field-third">
              <span>Situação</span>
              <select className="standard-select" name="ativo" value={form.ativo} onChange={atualizarCampo} disabled={salvando}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>

          {!perfilEspecial && form.perfilId ? (
            <div className="user-permissions-inline">
              <div className="user-permissions-heading">
                <strong>Permissões</strong>
              </div>

              <div className="user-permissions-options">
                <label className="user-permission-check user-permission-all">
                  <input
                    type="checkbox"
                    name="todas"
                    checked={todasPermissoes}
                    onChange={atualizarTodasPermissoes}
                    disabled={salvando}
                  />
                  <span>Todas</span>
                </label>

                {ACOES.map(([campo, label]) => (
                  <label key={campo} className="user-permission-check">
                    <input
                      type="checkbox"
                      name={campo}
                      checked={Boolean(form[campo])}
                      onChange={atualizarPermissao}
                      disabled={salvando}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="user-form-actions">
            <button type="button" className="user-form-cancel-link" onClick={() => navigate('/configuracao/usuarios')} disabled={salvando}>Cancelar</button>
            <button type="submit" className="standard-button" disabled={!podeSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
