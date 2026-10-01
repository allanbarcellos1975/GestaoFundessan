import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ACOES = [
  { chave: 'consultar', label: 'Consultar' },
  { chave: 'incluir', label: 'Incluir' },
  { chave: 'editar', label: 'Editar' },
  { chave: 'excluir', label: 'Excluir' },
];

const PERMISSAO_VAZIA = {
  consultar: false,
  incluir: false,
  editar: false,
  excluir: false,
};

export default function PermissoesPage() {
  const navigate = useNavigate();
  const [perfis, setPerfis] = useState([]);
  const [setores, setSetores] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [perfilId, setPerfilId] = useState('');
  const [matriz, setMatriz] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const { data, error } = await supabase.rpc('sgf_matriz_permissoes_setores');
      if (!ativo) return;

      if (error) {
        setErro(error.message || 'Não foi possível carregar as permissões.');
        setLoading(false);
        return;
      }

      const listaPerfis = Array.isArray(data?.perfis) ? data.perfis : [];
      const listaSetores = Array.isArray(data?.setores) ? data.setores : [];
      const listaRegistros = Array.isArray(data?.permissoes) ? data.permissoes : [];

      setPerfis(listaPerfis);
      setSetores(listaSetores);
      setRegistros(listaRegistros);
      setPerfilId((atual) => atual || listaPerfis[0]?.id || '');
      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, []);

  const perfilAtual = useMemo(
    () => perfis.find((perfil) => perfil.id === perfilId) || null,
    [perfis, perfilId],
  );

  const protegido = perfilAtual?.codigo === 'ADMINISTRADOR';

  useEffect(() => {
    if (!perfilId) {
      setMatriz({});
      return;
    }

    const proxima = {};

    registros
      .filter((item) => item.perfil_id === perfilId)
      .forEach((item) => {
        proxima[item.setor_id] = {
          consultar: Boolean(item.consultar),
          incluir: Boolean(item.incluir),
          editar: Boolean(item.editar),
          excluir: Boolean(item.excluir),
        };
      });

    setores.forEach((setor) => {
      if (!proxima[setor.id]) {
        proxima[setor.id] = protegido
          ? { consultar: true, incluir: true, editar: true, excluir: true }
          : { ...PERMISSAO_VAZIA };
      }
    });

    setMatriz(proxima);
    setErro('');
    setSucesso('');
  }, [perfilId, protegido, registros, setores]);

  function alternar(setorId, acao) {
    if (protegido || salvando) return;

    setMatriz((atual) => ({
      ...atual,
      [setorId]: {
        ...(atual[setorId] || PERMISSAO_VAZIA),
        [acao]: !(atual[setorId]?.[acao] || false),
      },
    }));
    setSucesso('');
  }

  function colunaCompleta(acao) {
    return setores.length > 0
      && setores.every((setor) => Boolean(matriz[setor.id]?.[acao]));
  }

  function alternarColuna(acao) {
    if (protegido || salvando) return;

    const marcar = !colunaCompleta(acao);

    setMatriz((atual) => {
      const proxima = { ...atual };
      setores.forEach((setor) => {
        proxima[setor.id] = {
          ...(proxima[setor.id] || PERMISSAO_VAZIA),
          [acao]: marcar,
        };
      });
      return proxima;
    });
    setSucesso('');
  }

  async function salvar() {
    if (!perfilId || protegido || salvando) return;

    setSalvando(true);
    setErro('');
    setSucesso('');

    const payload = setores.map((setor) => {
      const permissoes = matriz[setor.id] || PERMISSAO_VAZIA;
      return {
        setor_id: setor.id,
        consultar: Boolean(permissoes.consultar),
        incluir: Boolean(permissoes.incluir),
        editar: Boolean(permissoes.editar),
        excluir: Boolean(permissoes.excluir),
      };
    });

    const { error } = await supabase.rpc('sgf_salvar_permissoes_setores', {
      p_perfil_id: perfilId,
      p_permissoes: payload,
    });

    if (error) {
      setErro(error.message || 'Não foi possível salvar as permissões.');
      setSalvando(false);
      return;
    }

    setRegistros((atuais) => [
      ...atuais.filter((item) => item.perfil_id !== perfilId),
      ...payload.map((item) => ({ perfil_id: perfilId, ...item })),
    ]);
    setSucesso('Permissões salvas com sucesso.');
    setSalvando(false);
  }

  return (
    <div className="page-content permissions-page">
      <div className="users-page-title-row">
        <h1>Permissões</h1>
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
      {sucesso ? <div className="admin-success">{sucesso}</div> : null}

      <div className="permissions-matrix-card">
        <div className="permissions-matrix-toolbar">
          <label className="user-form-field permissions-profile-field">
            <span>Perfil</span>
            <select
              className="standard-select"
              value={perfilId}
              onChange={(event) => setPerfilId(event.target.value)}
              disabled={loading || salvando}
            >
              {perfis.map((perfil) => (
                <option key={perfil.id} value={perfil.id}>{perfil.nome}</option>
              ))}
            </select>
          </label>
        </div>

        {protegido ? (
          <div className="admin-form-note">
            O perfil Administrador é protegido e possui acesso total a todos os setores.
          </div>
        ) : null}

        {loading ? (
          <div className="users-empty-cell">Carregando...</div>
        ) : setores.length === 0 ? (
          <div className="permissions-no-services">
            <span>Nenhum setor foi cadastrado.</span>
            <button type="button" onClick={() => navigate('/configuracao/setores')}>
              Ir para Setores
            </button>
          </div>
        ) : (
          <div className="permissions-matrix-scroll permissions-setor-matrix-scroll">
            <table className="permissions-matrix-table permissions-setor-matrix-table">
              <thead>
                <tr>
                  <th>Setor</th>
                  {ACOES.map((acao) => (
                    <th key={acao.chave} className="permissions-action-column">
                      <label className="permissions-header-check">
                        <input
                          type="checkbox"
                          checked={colunaCompleta(acao.chave)}
                          onChange={() => alternarColuna(acao.chave)}
                          disabled={protegido || salvando}
                          aria-label={`${acao.label} em todos os setores`}
                        />
                        <span>{acao.label}</span>
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {setores.map((setor) => (
                  <tr key={setor.id}>
                    <td className="permissions-sector-cell">
                      <strong>{setor.nome}</strong>
                      {setor.descricao ? <small>{setor.descricao}</small> : null}
                    </td>
                    {ACOES.map((acao) => (
                      <td key={acao.chave} className="permissions-action-cell">
                        <input
                          type="checkbox"
                          checked={Boolean(matriz[setor.id]?.[acao.chave])}
                          onChange={() => alternar(setor.id, acao.chave)}
                          disabled={protegido || salvando}
                          aria-label={`${acao.label} - ${setor.nome}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="user-form-actions">
          <button
            type="button"
            className="user-form-cancel-link"
            onClick={() => navigate('/configuracao')}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="standard-button"
            onClick={salvar}
            disabled={!perfilId || protegido || salvando || loading || setores.length === 0}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
