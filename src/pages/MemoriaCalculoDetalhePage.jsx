import { ArrowLeft, Check, FileSignature, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import StandardActionButtons from '../components/standard/StandardActionButtons';
import { supabase } from '../lib/supabase';

function formatarMoeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarPercentual(valor, casas = 2) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return `${numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

function formatarDocumento(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor || '—';
}

function formatarData(valor) {
  if (!valor) return '—';
  const texto = String(valor).slice(0, 10);
  const [ano, mes, dia] = texto.split('-');
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function parseValor(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const texto = String(valor).trim().replace(/\s/g, '');
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function valorParaInput(valor, zeroVazio = false) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  if (zeroVazio && Math.abs(numero) < 0.000001) return '';
  return numero.toFixed(2).replace('.', ',');
}

function montarPagamentos(linhas) {
  return (Array.isArray(linhas) ? linhas : []).reduce((acc, item) => {
    if (!item?.id || item.tipo !== 'PARCELA') return acc;
    acc[item.id] = {
      data_pagamento: item.data_pagamento || '',
      valor_pago: valorParaInput(item.valor_pago),
      multa: valorParaInput(item.multa, true),
      juros_mora: valorParaInput(item.juros_mora, true),
    };
    return acc;
  }, {});
}

function podeOperar(user, acao) {
  const perfil = String(user?.perfilCodigo || '').toUpperCase();
  if (['MASTER', 'ADMINISTRADOR', 'SECRETARIO'].includes(perfil)) return true;
  const permissoes = Array.isArray(user?.permissoes)
    ? user.permissoes.map((item) => String(item).toLowerCase())
    : [];
  return permissoes.includes(String(acao).toLowerCase());
}

export default function MemoriaCalculoDetalhePage() {
  const { propostaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const podeEditar = podeOperar(user, 'editar');

  const [dados, setDados] = useState(null);
  const [pagamentos, setPagamentos] = useState({});
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [salvandoPagamento, setSalvandoPagamento] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const scheduleScrollRef = useRef(null);
  const floatingScrollRef = useRef(null);
  const [floatingScrollWidth, setFloatingScrollWidth] = useState(0);
  const [mostrarFloatingScroll, setMostrarFloatingScroll] = useState(false);

  const proposta = dados?.proposta || {};
  const memoria = dados?.memoria || null;
  const linhas = Array.isArray(dados?.parcelas) ? dados.parcelas : [];
  const finalizada = memoria?.status === 'FINALIZADA';

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase.rpc('sgf_obter_memoria_calculo', {
      p_proposta_id: propostaId,
    });
    if (error) {
      setErro(error.message || 'Não foi possível carregar o Financeiro.');
      setDados(null);
      setPagamentos({});
    } else {
      setDados(data || null);
      setPagamentos(montarPagamentos(data?.parcelas));
    }
    setLoading(false);
  }, [propostaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const scrollArea = scheduleScrollRef.current;
    const floating = floatingScrollRef.current;
    if (!scrollArea || !floating || !memoria) return undefined;

    let sincronizando = false;

    const atualizarMedidas = () => {
      const largura = scrollArea.scrollWidth;
      setFloatingScrollWidth(largura);
      setMostrarFloatingScroll(largura > scrollArea.clientWidth + 2);
      floating.scrollLeft = scrollArea.scrollLeft;
    };

    const tabelaParaBarra = () => {
      if (sincronizando) return;
      sincronizando = true;
      floating.scrollLeft = scrollArea.scrollLeft;
      requestAnimationFrame(() => { sincronizando = false; });
    };

    const barraParaTabela = () => {
      if (sincronizando) return;
      sincronizando = true;
      scrollArea.scrollLeft = floating.scrollLeft;
      requestAnimationFrame(() => { sincronizando = false; });
    };

    const observarVisibilidade = new IntersectionObserver(
      ([entry]) => {
        const visivel = entry?.isIntersecting && scrollArea.scrollWidth > scrollArea.clientWidth + 2;
        setMostrarFloatingScroll(Boolean(visivel));
      },
      { root: null, threshold: 0.01 },
    );

    const redimensionar = new ResizeObserver(atualizarMedidas);

    scrollArea.addEventListener('scroll', tabelaParaBarra, { passive: true });
    floating.addEventListener('scroll', barraParaTabela, { passive: true });
    redimensionar.observe(scrollArea);
    if (scrollArea.firstElementChild) redimensionar.observe(scrollArea.firstElementChild);
    observarVisibilidade.observe(scrollArea);
    atualizarMedidas();

    return () => {
      scrollArea.removeEventListener('scroll', tabelaParaBarra);
      floating.removeEventListener('scroll', barraParaTabela);
      redimensionar.disconnect();
      observarVisibilidade.disconnect();
    };
  }, [memoria, linhas.length]);

  async function gerar() {
    setProcessando(true);
    setErro('');
    setMensagem('');
    const { error } = await supabase.rpc('sgf_gerar_memoria_calculo', {
      p_proposta_id: propostaId,
    });
    if (error) {
      setErro(error.message || 'Não foi possível gerar o cálculo financeiro.');
    } else {
      setMensagem('Cálculo financeiro gerado com sucesso.');
      await carregar();
    }
    setProcessando(false);
  }

  async function finalizar() {
    if (!window.confirm('Confirmar este cálculo financeiro? Depois de confirmado, os valores originais não poderão ser recalculados.')) return;
    setProcessando(true);
    setErro('');
    setMensagem('');
    const { error } = await supabase.rpc('sgf_finalizar_memoria_calculo', {
      p_proposta_id: propostaId,
    });
    if (error) {
      setErro(error.message || 'Não foi possível confirmar o Financeiro.');
      setProcessando(false);
      return;
    }

    setMensagem('Financeiro confirmado com sucesso.');
    await carregar();
    setProcessando(false);
  }

  function atualizarPagamento(id, campo, valor) {
    setPagamentos((atual) => ({
      ...atual,
      [id]: {
        ...(atual[id] || {}),
        [campo]: valor,
      },
    }));
  }

  async function salvarPagamento(item) {
    const pagamento = pagamentos[item.id] || {};
    const valorPago = parseValor(pagamento.valor_pago);
    const multa = parseValor(pagamento.multa) ?? 0;
    const jurosMora = parseValor(pagamento.juros_mora) ?? 0;
    const temAlgumValor = (valorPago ?? 0) > 0 || multa > 0 || jurosMora > 0;

    if (temAlgumValor && !pagamento.data_pagamento) {
      setErro(`Informe a Data do Pagamento da prestação ${item.numero_parcela}.`);
      return;
    }

    if (pagamento.data_pagamento && !(valorPago > 0)) {
      setErro(`Informe o Valor Pago da prestação ${item.numero_parcela}.`);
      return;
    }

    setSalvandoPagamento(item.id);
    setErro('');
    setMensagem('');

    const { error } = await supabase.rpc('sgf_salvar_pagamento_prestacao', {
      p_linha_id: item.id,
      p_data_pagamento: pagamento.data_pagamento || null,
      p_valor_pago: valorPago,
      p_multa: multa,
      p_juros_mora: jurosMora,
    });

    if (error) {
      setErro(error.message || `Não foi possível salvar o pagamento da prestação ${item.numero_parcela}.`);
    } else {
      setMensagem(`Pagamento da prestação ${item.numero_parcela} atualizado.`);
      await carregar();
    }

    setSalvandoPagamento('');
  }

  const totaisRecebidos = useMemo(() => {
    return Object.entries(pagamentos).reduce((acc, [id, pagamento]) => {
      acc[id] = (parseValor(pagamento.valor_pago) || 0)
        + (parseValor(pagamento.multa) || 0)
        + (parseValor(pagamento.juros_mora) || 0);
      return acc;
    }, {});
  }, [pagamentos]);

  if (loading) {
    return <div className="page-content admin-page"><div className="users-empty-cell">Carregando...</div></div>;
  }

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row memory-title-row">
        <div>
          <h1>Financeiro</h1>
          <p className="requerentes-page-subtitle">
            Processo {proposta.numero_processo || '—'} · {proposta.requerente_nome || '—'}
          </p>
        </div>

        {finalizada ? (
          <span className="memory-contract-ready"><FileSignature size={15} /> Confirmado</span>
        ) : null}
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/financeiro')}>
        <ArrowLeft size={14} />
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}
      {mensagem ? <div className="proposal-page-success">{mensagem}</div> : null}

      <section className="memory-summary-card">
        <div className="memory-summary-grid">
          <div><span>Nº do Processo</span><strong>{proposta.numero_processo || '—'}</strong></div>
          <div><span>Requerente</span><strong>{proposta.requerente_nome || '—'}</strong></div>
          <div><span>CPF / CNPJ</span><strong>{formatarDocumento(proposta.requerente_documento)}</strong></div>
          <div><span>Valor da Proposta</span><strong>{formatarMoeda(proposta.valor_proposta)}</strong></div>
          <div><span>Situação</span><strong>{proposta.status_nome || proposta.status_codigo || '—'}</strong></div>
        </div>
      </section>

      {!memoria ? (
        <section className="memory-empty-card">
          <h2>Gerar Financeiro</h2>
          <p>
            O sistema aplicará a faixa correspondente ao valor da Proposta, a carência escolhida e a quantidade de parcelas informada na Proposta.
          </p>
          <p className="memory-capitalization-note">
            Durante a carência a prestação é zero, mas os juros mensais são incorporados ao saldo devedor.
          </p>
          <button
            type="button"
            className="standard-button"
            onClick={gerar}
            disabled={processando || !podeEditar || !proposta.apta_memoria}
          >
            {processando ? 'Calculando...' : 'Gerar cálculo'}
          </button>
        </section>
      ) : (
        <>
          <section className="memory-calculation-card">
            <div className="memory-section-header">
              <div>
                <h2>Condições Financeiras</h2>
                <p>{memoria.faixa_descricao}</p>
              </div>
              <span className={`status-badge ${finalizada ? 'is-active' : 'is-inactive'}`}>
                {finalizada ? 'Confirmado' : 'Rascunho'}
              </span>
            </div>

            <div className="memory-kpi-grid">
              <div><span>Valor da operação</span><strong>{formatarMoeda(memoria.valor_operacao)}</strong></div>
              <div><span>Taxa</span><strong>{formatarPercentual(memoria.taxa_juros_anual)} a.a.</strong><small>{formatarPercentual(Number(memoria.taxa_juros_mensal) * 100, 2)} a.m.</small></div>
              <div><span>Carência</span><strong>{memoria.carencia_dias} dias</strong><small>{memoria.carencia_meses} {memoria.carencia_meses === 1 ? 'mês' : 'meses'}</small></div>
              <div><span>Prazo total</span><strong>{memoria.prazo_total_meses} meses</strong><small>{memoria.quantidade_parcelas} prestações</small></div>
              <div><span>Juros capitalizados na carência</span><strong>{formatarMoeda(memoria.juros_capitalizados_carencia)}</strong></div>
              <div><span>Saldo após a carência</span><strong>{formatarMoeda(memoria.saldo_apos_carencia)}</strong></div>
              <div><span>Prestação Price</span><strong>{formatarMoeda(memoria.valor_parcela)}</strong></div>
              <div><span>Total das prestações</span><strong>{formatarMoeda(memoria.total_prestacoes)}</strong></div>
            </div>

            <div className="memory-capitalization-note is-inline">
              Na carência não há pagamento. O juro de 0,5% ao mês é capitalizado e passa a compor o principal usado no cálculo das prestações.
            </div>
          </section>

          <section className="users-table-card memory-schedule-card">
            <div className="memory-section-header memory-table-header">
              <div>
                <h2>Cronograma e pagamentos</h2>
                <p>
                  Sistema de amortização: {memoria.sistema_amortizacao}. Os valores originais do cálculo permanecem preservados; após a confirmação, são registrados apenas os dados de pagamento.
                </p>
              </div>
            </div>
            <div className="users-table-scroll payment-schedule-scroll" ref={scheduleScrollRef}>
              <table className="users-table memory-schedule-table payment-schedule-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Fase</th>
                    <th>Vencimento</th>
                    <th>Prestação</th>
                    <th>Juros Contratuais</th>
                    <th>Amortização</th>
                    <th>Saldo Devedor</th>
                    <th>Data do Pagamento</th>
                    <th>Valor Pago</th>
                    <th>Multa</th>
                    <th>Juros de Mora</th>
                    <th>Total Recebido</th>
                    <th className="users-actions-col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((item) => {
                    const editavel = finalizada && item.tipo === 'PARCELA';
                    const pagamento = pagamentos[item.id] || {};
                    const totalRecebido = totaisRecebidos[item.id] ?? Number(item.total_recebido || 0);

                    return (
                      <tr key={item.id || `${item.mes}-${item.numero_parcela || 0}`} className={item.tipo === 'CARENCIA' ? 'is-grace-row' : ''}>
                        <td>{item.mes}</td>
                        <td>
                          {item.tipo === 'INICIAL'
                            ? 'Saldo inicial'
                            : item.tipo === 'CARENCIA'
                              ? 'Carência'
                              : `Prestação ${item.numero_parcela}`}
                        </td>
                        <td>{formatarData(item.data_vencimento)}</td>
                        <td className="memory-number-cell">{formatarMoeda(item.prestacao)}</td>
                        <td className="memory-number-cell">{formatarMoeda(item.juros)}</td>
                        <td className="memory-number-cell">{formatarMoeda(item.amortizacao)}</td>
                        <td className="memory-number-cell"><strong>{formatarMoeda(item.saldo_devedor)}</strong></td>

                        {item.tipo === 'PARCELA' ? (
                          <>
                            <td>
                              {editavel ? (
                                <input
                                  type="date"
                                  className="payment-date-input"
                                  value={pagamento.data_pagamento || ''}
                                  onChange={(event) => atualizarPagamento(item.id, 'data_pagamento', event.target.value)}
                                  disabled={!podeEditar || salvandoPagamento === item.id}
                                />
                              ) : formatarData(item.data_pagamento)}
                            </td>
                            <td>
                              {editavel ? (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="payment-money-input"
                                  value={pagamento.valor_pago || ''}
                                  onChange={(event) => atualizarPagamento(item.id, 'valor_pago', event.target.value)}
                                  placeholder="0,00"
                                  disabled={!podeEditar || salvandoPagamento === item.id}
                                />
                              ) : formatarMoeda(item.valor_pago)}
                            </td>
                            <td>
                              {editavel ? (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="payment-money-input"
                                  value={pagamento.multa || ''}
                                  onChange={(event) => atualizarPagamento(item.id, 'multa', event.target.value)}
                                  placeholder="0,00"
                                  disabled={!podeEditar || salvandoPagamento === item.id}
                                />
                              ) : formatarMoeda(item.multa)}
                            </td>
                            <td>
                              {editavel ? (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="payment-money-input"
                                  value={pagamento.juros_mora || ''}
                                  onChange={(event) => atualizarPagamento(item.id, 'juros_mora', event.target.value)}
                                  placeholder="0,00"
                                  disabled={!podeEditar || salvandoPagamento === item.id}
                                />
                              ) : formatarMoeda(item.juros_mora)}
                            </td>
                            <td className="memory-number-cell"><strong>{formatarMoeda(totalRecebido)}</strong></td>
                            <td className="users-actions-cell">
                              {editavel ? (
                                <StandardActionButtons
                                  actions={[
                                    {
                                      key: 'salvar-pagamento',
                                      title: 'Salvar pagamento',
                                      ariaLabel: `Salvar pagamento da prestação ${item.numero_parcela}`,
                                      icon: Check,
                                      onClick: () => salvarPagamento(item),
                                      disabled: !podeEditar || salvandoPagamento === item.id,
                                    },
                                  ]}
                                />
                              ) : '—'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {mostrarFloatingScroll ? (
            <div className="payment-floating-scroll-shell" aria-label="Rolagem horizontal do Financeiro">
              <div className="payment-floating-scroll" ref={floatingScrollRef}>
                <div className="payment-floating-scroll-spacer" style={{ width: `${floatingScrollWidth}px` }} />
              </div>
            </div>
          ) : null}

          <div className="memory-footer-actions">
            <button type="button" className="user-form-cancel-link" onClick={() => navigate('/financeiro')} disabled={processando}>
              Voltar
            </button>

            {!finalizada ? (
              <>
                <button type="button" className="memory-secondary-button" onClick={gerar} disabled={processando || !podeEditar}>
                  <RefreshCcw size={14} /> Recalcular
                </button>
                <button type="button" className="standard-button" onClick={finalizar} disabled={processando || !podeEditar}>
                  Confirmar Financeiro
                </button>
              </>
            ) : (
              <div className="memory-contract-message">
                <FileSignature size={16} />
                <span>Financeiro confirmado. Os valores originais do cálculo ficam preservados e o acompanhamento dos pagamentos permanece disponível aqui.</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
