import { History, Pencil, RefreshCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function normalizarCnpj(valor) {
  return String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
}

function formatarDocumento(valor) {
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  const cnpj = normalizarCnpj(valor);
  if (cnpj.length === 14) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
  }

  return valor || '—';
}

function formatarData(valor) {
  if (!valor) return '—';
  const [ano, mes, dia] = String(valor).split('-');
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function podeOperar(user, acao) {
  const perfil = String(user?.perfilCodigo || '').toUpperCase();
  if (['MASTER', 'ADMINISTRADOR', 'SECRETARIO'].includes(perfil)) return true;
  const permissoes = Array.isArray(user?.permissoes)
    ? user.permissoes.map((item) => String(item).toLowerCase())
    : [];
  return permissoes.includes(String(acao).toLowerCase());
}

function classeStatus(codigo) {
  const valor = String(codigo || '').toUpperCase();
  if (['APROVADA', 'APROVADO', 'CONCLUIDA', 'CONCLUIDO'].includes(valor)) return 'is-success';
  if (['NAO_APROVADA', 'REPROVADA', 'REPROVADO', 'CANCELADA', 'CANCELADO'].includes(valor)) return 'is-danger';
  if (['EM_ANALISE', 'CUMPRINDO_RESSALVA', 'AGUARDANDO_ANALISE', 'ENVIADA_ANALISE'].includes(valor)) return 'is-warning';
  return 'is-neutral';
}

export default function PropostasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const podeIncluir = podeOperar(user, 'incluir');
  const podeEditar = podeOperar(user, 'editar');

  const [propostas, setPropostas] = useState([]);
  const [statusCatalogo, setStatusCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [exercicio, setExercicio] = useState('TODOS');

  const [propostaStatus, setPropostaStatus] = useState(null);
  const [statusNovo, setStatusNovo] = useState('');
  const [justificativaStatus, setJustificativaStatus] = useState('');
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState('');

  const [propostaHistorico, setPropostaHistorico] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoErro, setHistoricoErro] = useState('');

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErro('');

    const [propostasResposta, statusResposta] = await Promise.all([
      supabase.rpc('sgf_listar_propostas_resumidas'),
      supabase.rpc('sgf_listar_status_propostas'),
    ]);

    if (propostasResposta.error) {
      setErro(propostasResposta.error.message || 'Não foi possível carregar as Propostas de Crédito.');
      setPropostas([]);
    } else {
      setPropostas(Array.isArray(propostasResposta.data) ? propostasResposta.data : []);
    }

    if (statusResposta.error) {
      setStatusCatalogo([]);
    } else {
      setStatusCatalogo(Array.isArray(statusResposta.data) ? statusResposta.data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      await carregarDados();
      if (!ativo) return;
    }

    carregar();
    return () => { ativo = false; };
  }, [carregarDados]);

  const exerciciosDisponiveis = useMemo(() => {
    const anos = new Set();
    propostas.forEach((item) => {
      if (item.exercicio_ano) anos.add(String(item.exercicio_ano));
    });
    return Array.from(anos).sort((a, b) => Number(b) - Number(a));
  }, [propostas]);

  const statusDisponiveis = useMemo(() => {
    if (statusCatalogo.length > 0) {
      return statusCatalogo.map((item) => [item.codigo, item.nome]);
    }

    const mapa = new Map();
    propostas.forEach((item) => {
      if (item.status_codigo) mapa.set(item.status_codigo, item.status_nome || item.status_codigo);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [propostas, statusCatalogo]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return propostas.filter((proposta) => {
      if (status !== 'TODOS' && String(proposta.status_codigo) !== status) return false;
      if (exercicio !== 'TODOS' && String(proposta.exercicio_ano) !== exercicio) return false;
      if (!termo) return true;

      const texto = [
        proposta.exercicio_ano,
        proposta.proposta_processo_numero,
        proposta.requerente_nome,
        proposta.requerente_cpf_cnpj,
        formatarDocumento(proposta.requerente_cpf_cnpj),
        proposta.categoria_nome,
        proposta.ramo_atividade,
        proposta.modalidade_nome,
        proposta.valor_financiamento_solicitado,
        proposta.parcelas_solicitadas,
        proposta.status_nome,
      ].filter(Boolean).join(' ').toLowerCase();

      return texto.includes(termo);
    });
  }, [propostas, busca, status, exercicio]);

  function abrirAlteracaoSituacao(proposta) {
    setMensagem('');
    setErroStatus('');
    setStatusNovo('');
    setJustificativaStatus('');
    setPropostaStatus(proposta);
  }

  function fecharAlteracaoSituacao() {
    if (salvandoStatus) return;
    setPropostaStatus(null);
    setErroStatus('');
    setStatusNovo('');
    setJustificativaStatus('');
  }

  async function salvarAlteracaoSituacao() {
    if (!propostaStatus) return;

    setErroStatus('');

    if (!statusNovo) {
      setErroStatus('Selecione a nova situação.');
      return;
    }

    if (statusNovo === propostaStatus.status_codigo) {
      setErroStatus('Selecione uma situação diferente da situação atual.');
      return;
    }

    if (!justificativaStatus.trim()) {
      setErroStatus('A justificativa é obrigatória para alterar a situação.');
      return;
    }

    setSalvandoStatus(true);

    const { error } = await supabase.rpc('sgf_alterar_status_proposta', {
      p_proposta_id: propostaStatus.id,
      p_status_novo: statusNovo,
      p_justificativa: justificativaStatus.trim(),
    });

    if (error) {
      setErroStatus(error.message || 'Não foi possível alterar a situação da Proposta.');
      setSalvandoStatus(false);
      return;
    }

    setPropostaStatus(null);
    setStatusNovo('');
    setJustificativaStatus('');
    setSalvandoStatus(false);
    setMensagem('Situação da Proposta alterada com sucesso.');
    await carregarDados();
  }

  async function abrirHistorico(proposta) {
    setMensagem('');
    setPropostaHistorico(proposta);
    setHistorico([]);
    setHistoricoErro('');
    setHistoricoLoading(true);

    const { data, error } = await supabase.rpc('sgf_listar_historico_status_proposta', {
      p_proposta_id: proposta.id,
    });

    if (error) {
      setHistoricoErro(error.message || 'Não foi possível carregar o histórico de situações.');
      setHistorico([]);
    } else {
      setHistorico(Array.isArray(data) ? data : []);
    }

    setHistoricoLoading(false);
  }

  function fecharHistorico() {
    setPropostaHistorico(null);
    setHistorico([]);
    setHistoricoErro('');
  }

  return (
    <div className="page-content users-page propostas-page">
      <div className="users-page-title-row">
        <div>
          <h1>Propostas de Crédito</h1>
          <p className="requerentes-page-subtitle">
            O Nº do Processo é o identificador da Proposta de Crédito.
          </p>
        </div>

        {podeIncluir ? (
          <button type="button" className="standard-button users-new-button" onClick={() => navigate('/propostas/novo')}>
            + Nova Proposta
          </button>
        ) : null}
      </div>

      {erro ? <div className="users-error">{erro}</div> : null}
      {mensagem ? <div className="proposal-page-success">{mensagem}</div> : null}

      <div className="requerentes-filters-card">
        <label className="user-form-field requerentes-search-field">
          <span>Pesquisar</span>
          <input
            className="standard-input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Nº do Processo, Requerente, categoria ou ramo de atividade"
          />
        </label>

        <label className="user-form-field requerentes-status-filter">
          <span>Exercício</span>
          <select className="standard-select" value={exercicio} onChange={(event) => setExercicio(event.target.value)}>
            <option value="TODOS">Todos</option>
            {exerciciosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </label>

        <label className="user-form-field requerentes-status-filter">
          <span>Situação</span>
          <select className="standard-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="TODOS">Todas</option>
            {statusDisponiveis.map(([codigo, nome]) => (
              <option key={codigo} value={codigo}>{nome}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table propostas-table">
            <thead>
              <tr>
                <th className="users-actions-col">Ações</th>
                <th>Exercício</th>
                <th>Nº do Processo</th>
                <th>Requerente</th>
                <th>CPF / CNPJ</th>
                <th>Categoria</th>
                <th>Ramo de Atividade</th>
                <th>Modalidade</th>
                <th>Valor</th>
                <th>Parcelas</th>
                <th>Data</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="12" className="users-empty-cell">Carregando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan="12" className="users-empty-cell">Nenhuma Proposta de Crédito encontrada.</td></tr>
              ) : (
                filtradas.map((proposta) => (
                  <tr key={proposta.id}>
                    <td className="users-actions-cell">
                      <div className="proposal-actions-group">
                        {podeEditar ? (
                          <>
                            <button
                              type="button"
                              className="users-action-button"
                              onClick={() => navigate(`/propostas/${proposta.id}/editar`)}
                              title="Editar Proposta"
                              aria-label={`Editar proposta ${proposta.proposta_processo_numero || ''}`}
                            >
                              <Pencil size={17} strokeWidth={1.8} />
                            </button>

                            <button
                              type="button"
                              className="users-action-button"
                              onClick={() => abrirAlteracaoSituacao(proposta)}
                              title="Alterar Situação"
                              aria-label={`Alterar situação da proposta ${proposta.proposta_processo_numero || ''}`}
                            >
                              <RefreshCcw size={17} strokeWidth={1.8} />
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          className="users-action-button"
                          onClick={() => abrirHistorico(proposta)}
                          title="Histórico de Situações"
                          aria-label={`Histórico de situações da proposta ${proposta.proposta_processo_numero || ''}`}
                        >
                          <History size={17} strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                    <td>{proposta.exercicio_ano || '—'}</td>
                    <td>
                      <strong className="requerentes-name">
                        {proposta.proposta_processo_numero || '—'}
                      </strong>
                    </td>
                    <td>{proposta.requerente_nome || '—'}</td>
                    <td>{formatarDocumento(proposta.requerente_cpf_cnpj)}</td>
                    <td>{proposta.categoria_nome || '—'}</td>
                    <td>{proposta.ramo_atividade || '—'}</td>
                    <td>{proposta.modalidade_nome || '—'}</td>
                    <td>{formatarMoeda(proposta.valor_financiamento_solicitado)}</td>
                    <td>{proposta.parcelas_solicitadas ?? '—'}</td>
                    <td>{formatarData(proposta.data_proposta)}</td>
                    <td>
                      <span className={`proposal-status-badge ${classeStatus(proposta.status_codigo)}`}>
                        {proposta.status_nome || proposta.status_codigo || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {propostaStatus ? (
        <div className="proposal-modal-backdrop" role="presentation" onMouseDown={fecharAlteracaoSituacao}>
          <div className="proposal-modal-card" role="dialog" aria-modal="true" aria-labelledby="proposal-status-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="proposal-modal-header">
              <div>
                <h2 id="proposal-status-modal-title">Alterar Situação</h2>
                <p>Nº do Processo {propostaStatus.proposta_processo_numero || '—'}</p>
              </div>

              <button type="button" className="proposal-modal-close" onClick={fecharAlteracaoSituacao} disabled={salvandoStatus} aria-label="Fechar">
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            <div className="proposal-modal-body">
              <div className="proposal-status-current">
                <span>Situação atual</span>
                <strong>{propostaStatus.status_nome || propostaStatus.status_codigo || '—'}</strong>
              </div>

              {erroStatus ? <div className="users-error">{erroStatus}</div> : null}

              <label className="user-form-field">
                <span>Nova situação *</span>
                <select className="standard-select" value={statusNovo} onChange={(event) => setStatusNovo(event.target.value)} disabled={salvandoStatus}>
                  <option value="">Selecione</option>
                  {statusDisponiveis
                    .filter(([codigo]) => codigo !== propostaStatus.status_codigo)
                    .map(([codigo, nome]) => (
                      <option key={codigo} value={codigo}>{nome}</option>
                    ))}
                </select>
              </label>

              <label className="user-form-field">
                <span>Justificativa *</span>
                <textarea
                  className="standard-input proposal-status-justification"
                  value={justificativaStatus}
                  onChange={(event) => setJustificativaStatus(event.target.value)}
                  placeholder="Informe o motivo da alteração da situação"
                  disabled={salvandoStatus}
                />
              </label>
            </div>

            <div className="proposal-modal-actions">
              <button type="button" className="user-form-cancel-link" onClick={fecharAlteracaoSituacao} disabled={salvandoStatus}>Cancelar</button>
              <button type="button" className="standard-button" onClick={salvarAlteracaoSituacao} disabled={salvandoStatus}>
                {salvandoStatus ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {propostaHistorico ? (
        <div className="proposal-modal-backdrop" role="presentation" onMouseDown={fecharHistorico}>
          <div className="proposal-modal-card is-wide" role="dialog" aria-modal="true" aria-labelledby="proposal-history-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="proposal-modal-header">
              <div>
                <h2 id="proposal-history-modal-title">Histórico de Situações</h2>
                <p>Nº do Processo {propostaHistorico.proposta_processo_numero || '—'}</p>
              </div>

              <button type="button" className="proposal-modal-close" onClick={fecharHistorico} aria-label="Fechar">
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            <div className="proposal-modal-body">
              {historicoErro ? <div className="users-error">{historicoErro}</div> : null}

              {historicoLoading ? (
                <div className="proposal-history-empty">Carregando histórico...</div>
              ) : historico.length === 0 ? (
                <div className="proposal-history-empty">Nenhuma alteração de situação registrada.</div>
              ) : (
                <div className="proposal-history-scroll">
                  <table className="proposal-history-table">
                    <thead>
                      <tr>
                        <th>Data / Hora</th>
                        <th>De</th>
                        <th>Para</th>
                        <th>Justificativa</th>
                        <th>Usuário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((item) => (
                        <tr key={item.id}>
                          <td>{formatarDataHora(item.alterado_em)}</td>
                          <td>{item.status_anterior_nome || item.status_anterior_codigo || 'Inicial'}</td>
                          <td>{item.status_novo_nome || item.status_novo_codigo || '—'}</td>
                          <td className="proposal-history-justification">{item.justificativa || '—'}</td>
                          <td>{item.usuario_nome || item.alterado_por || 'Sistema'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="proposal-modal-actions">
              <button type="button" className="standard-button" onClick={fecharHistorico}>Fechar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
