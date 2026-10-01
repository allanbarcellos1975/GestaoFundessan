import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StandardActionButtons from '../components/standard/StandardActionButtons';

function hojeISO() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

const INICIAL = {
  exercicio_id: '',
  status_codigo: 'PROTOCOLADA',
  status_nome: 'Protocolada',
  numero_processo: '',
  data_proposta: hojeISO(),
  data_abertura_processo: hojeISO(),
  requerente_id: '',
  categoria_requerente_id: '',
  modalidade_id: '',
  valor_financiamento_solicitado: '',
  parcelas_solicitadas: '',
  carencia_meses: '',
  resumo_objetivo_emprestimo: '',
  observacoes: '',
};

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarNumeroProcesso(valor) {
  const digitos = somenteDigitos(valor).slice(0, 8);
  if (digitos.length <= 4) return digitos;
  return `${digitos.slice(0, 4)}/${digitos.slice(4)}`;
}

const STATUS_NOMES = {
  PROTOCOLADA: 'Protocolada',
  EM_ANALISE: 'Em Análise',
  CUMPRINDO_RESSALVA: 'Cumprindo Ressalva',
  APROVADA_BANCO: 'Aprovada Banco',
  APROVADA_CONSELHO: 'Aprovada Conselho',
  APROVADA: 'Aprovada',
  NAO_APROVADA: 'Não Aprovada',
  CANCELADA: 'Cancelada',
};

function nomeStatus(codigo, nome) {
  if (nome) return nome;
  return STATUS_NOMES[String(codigo || '').toUpperCase()] || codigo || 'Protocolada';
}

const STATUS_COM_JUSTIFICATIVA_OBRIGATORIA = new Set([
  'CUMPRINDO_RESSALVA',
  'NAO_APROVADA',
  'CANCELADA',
]);

function exigeJustificativaStatus(codigo) {
  return STATUS_COM_JUSTIFICATIVA_OBRIGATORIA.has(String(codigo || '').toUpperCase());
}

function formatarData(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(data);
}


function formatarMoedaBR(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarMoedaDigitada(valor) {
  const digitos = somenteDigitos(valor).slice(0, 15);
  if (!digitos) return '';
  const numero = Number(digitos) / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moedaParaNumero(valor) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return NaN;
  return Number(digitos) / 100;
}

function carenciaMaximaPorValor(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  if (numero >= 5000 && numero <= 10000) return 1;
  if (numero > 10000 && numero <= 15000) return 2;
  if (numero > 15000 && numero <= 20000) return 3;
  if (numero > 20000 && numero <= 25000) return 4;
  if (numero > 25000 && numero <= 30000) return 6;
  return null;
}

function opcoesCarencia(maximo) {
  const max = Number(maximo);
  if (!Number.isInteger(max) || max < 0) return [];
  return Array.from({ length: max + 1 }, (_, indice) => indice);
}

function normalizarCnpj(valor) {
  const bruto = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return bruto.slice(0, 14);
}

function formatarDocumento(valor, tipoPessoa) {
  if (String(tipoPessoa || '').toUpperCase() === 'PF') {
    const digitos = somenteDigitos(valor);
    if (digitos.length === 11) {
      return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return valor || '—';
  }

  const cnpj = normalizarCnpj(valor);
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

function modalidadeFacil(lista) {
  return lista.find((item) => {
    if (item?.padrao === true) return true;
    const codigo = String(item?.codigo || '').toUpperCase();
    const nome = String(item?.nome || '').toUpperCase();
    return ['FACIL', 'EMPRESTIMO_FACIL'].includes(codigo)
      || nome.includes('EMPRÉSTIMO FÁCIL')
      || nome.includes('EMPRESTIMO FACIL');
  }) || null;
}

export default function PropostaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const editando = Boolean(id);

  const [form, setForm] = useState(INICIAL);
  const [requerentes, setRequerentes] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [statusDisponiveis, setStatusDisponiveis] = useState([]);
  const [statusInicialCodigo, setStatusInicialCodigo] = useState('PROTOCOLADA');
  const [justificativaStatus, setJustificativaStatus] = useState('');
  const [historicoStatus, setHistoricoStatus] = useState([]);
  const [historicoStatusErro, setHistoricoStatusErro] = useState('');
  const [historicoEditandoId, setHistoricoEditandoId] = useState(null);
  const [historicoTextoEdicao, setHistoricoTextoEdicao] = useState('');
  const [historicoAcaoId, setHistoricoAcaoId] = useState(null);
  const [exercicioAtual, setExercicioAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const [opcoesResult, propostaResult, statusResult, historicoResult] = await Promise.all([
        supabase.rpc('sgf_proposta_resumida_form_opcoes'),
        editando
          ? supabase.rpc('sgf_obter_proposta_resumida', { p_id: id })
          : Promise.resolve({ data: null, error: null }),
        supabase.rpc('sgf_listar_status_propostas'),
        editando
          ? supabase.rpc('sgf_listar_historico_status_proposta', { p_proposta_id: id })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!ativo) return;

      if (opcoesResult.error) {
        setErro(opcoesResult.error.message || 'Não foi possível carregar as opções da Proposta.');
        setLoading(false);
        return;
      }

      if (statusResult.error) {
        setErro(statusResult.error.message || 'Não foi possível carregar as situações da Proposta.');
        setLoading(false);
        return;
      }

      const listaRequerentes = Array.isArray(opcoesResult.data?.requerentes)
        ? opcoesResult.data.requerentes
        : [];
      const listaModalidades = Array.isArray(opcoesResult.data?.modalidades)
        ? opcoesResult.data.modalidades
        : [];
      const listaExercicios = Array.isArray(opcoesResult.data?.exercicios)
        ? opcoesResult.data.exercicios
        : [];

      const listaStatus = Array.isArray(statusResult.data) ? statusResult.data : [];

      setHistoricoStatus(Array.isArray(historicoResult.data) ? historicoResult.data : []);
      setHistoricoStatusErro(historicoResult.error?.message || '');

      setRequerentes(listaRequerentes);
      setModalidades(listaModalidades);
      setStatusDisponiveis(listaStatus);
      const exercicioAtualLista = listaExercicios.find((item) => item?.atual && item?.situacao === 'ABERTO') || null;
      setExercicioAtual(exercicioAtualLista);

      if (editando) {
        if (propostaResult.error || !propostaResult.data?.proposta) {
          setErro(propostaResult.error?.message || 'Proposta de Crédito não encontrada.');
          setLoading(false);
          return;
        }

        const proposta = propostaResult.data.proposta;
        const processo = propostaResult.data.processo || {};

        const exercicioDaProposta = listaExercicios.find(
          (item) => item.id === (proposta.exercicio_id || processo.exercicio_id),
        ) || null;

        setExercicioAtual(exercicioDaProposta || exercicioAtualLista);

        const codigoStatusAtual = proposta.status_codigo || 'PROTOCOLADA';
        setStatusInicialCodigo(codigoStatusAtual);
        setJustificativaStatus('');

        setForm({
          exercicio_id: proposta.exercicio_id || processo.exercicio_id || '',
          status_codigo: codigoStatusAtual,
          status_nome: nomeStatus(proposta.status_codigo, proposta.status_nome),
          numero_processo: formatarNumeroProcesso(processo.numero || ''),
          data_proposta: proposta.data_proposta || proposta.data_cadastro || hojeISO(),
          data_abertura_processo: processo.data_abertura || hojeISO(),
          requerente_id: proposta.requerente_id || '',
          categoria_requerente_id: proposta.categoria_requerente_id || '',
          modalidade_id: proposta.modalidade_id || '',
          valor_financiamento_solicitado: formatarMoedaBR(proposta.valor_financiamento_solicitado),
          parcelas_solicitadas: proposta.parcelas_solicitadas ?? '',
          carencia_meses: proposta.carencia_meses ?? carenciaMaximaPorValor(proposta.valor_financiamento_solicitado) ?? '',
          resumo_objetivo_emprestimo: proposta.objetivo_financiamento || '',
          observacoes: proposta.observacoes_internas || '',
        });
      } else {
        const requerenteParam = searchParams.get('requerente');
        const selecionado = requerenteParam
          ? listaRequerentes.find((item) => item.id === requerenteParam)
          : null;
        const categorias = Array.isArray(selecionado?.categorias) ? selecionado.categorias : [];
        const facil = modalidadeFacil(listaModalidades);

        setStatusInicialCodigo('PROTOCOLADA');
        setJustificativaStatus('');

        setForm((atual) => ({
          ...atual,
          exercicio_id: exercicioAtualLista?.id || '',
          status_codigo: 'PROTOCOLADA',
          status_nome: 'Protocolada',
          modalidade_id: facil?.id || atual.modalidade_id,
          requerente_id: selecionado?.id || atual.requerente_id,
          categoria_requerente_id: categorias.length === 1 ? categorias[0].id : atual.categoria_requerente_id,
        }));
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, id, searchParams]);

  const historicoStatusAgrupado = useMemo(() => {
    const grupos = [];
    const porData = new Map();

    historicoStatus.forEach((item) => {
      const data = formatarData(item.alterado_em);
      let grupo = porData.get(data);

      if (!grupo) {
        grupo = { data, itens: [] };
        porData.set(data, grupo);
        grupos.push(grupo);
      }

      grupo.itens.push(item);
    });

    return grupos;
  }, [historicoStatus]);

  const requerenteSelecionado = useMemo(
    () => requerentes.find((item) => item.id === form.requerente_id) || null,
    [requerentes, form.requerente_id],
  );

  const categoriasDisponiveis = useMemo(
    () => (Array.isArray(requerenteSelecionado?.categorias) ? requerenteSelecionado.categorias : []),
    [requerenteSelecionado],
  );

  useEffect(() => {
    if (!requerenteSelecionado) return;

    const existe = categoriasDisponiveis.some((item) => item.id === form.categoria_requerente_id);
    if (!existe && categoriasDisponiveis.length === 1) {
      setForm((atual) => ({ ...atual, categoria_requerente_id: categoriasDisponiveis[0].id }));
    }
  }, [requerenteSelecionado, categoriasDisponiveis, form.categoria_requerente_id]);

  function alterar(event) {
    const { name, value } = event.target;

    if (name === 'valor_financiamento_solicitado') {
      const valorFormatado = formatarMoedaDigitada(value);
      const valorNumerico = moedaParaNumero(valorFormatado);
      const carenciaMaxima = carenciaMaximaPorValor(valorNumerico);

      setForm((atual) => ({
        ...atual,
        valor_financiamento_solicitado: valorFormatado,
        carencia_meses: carenciaMaxima === null ? '' : String(carenciaMaxima),
      }));
      setErro('');
      return;
    }

    const proximoValor = name === 'numero_processo'
      ? formatarNumeroProcesso(value)
      : value;

    setForm((atual) => ({ ...atual, [name]: proximoValor }));
    setErro('');
  }

  function alterarStatus(event) {
    const codigo = event.target.value;
    const selecionado = statusDisponiveis.find((item) => item.codigo === codigo);

    setForm((atual) => ({
      ...atual,
      status_codigo: codigo,
      status_nome: selecionado?.nome || nomeStatus(codigo),
    }));
    setErro('');
  }

  function alterarRequerente(event) {
    const valor = event.target.value;
    const selecionado = requerentes.find((item) => item.id === valor);
    const categorias = Array.isArray(selecionado?.categorias) ? selecionado.categorias : [];

    setForm((atual) => ({
      ...atual,
      requerente_id: valor,
      categoria_requerente_id: categorias.length === 1 ? categorias[0].id : '',
    }));
    setErro('');
  }

  async function recarregarHistoricoStatus() {
    const historicoResult = await supabase.rpc('sgf_listar_historico_status_proposta', {
      p_proposta_id: id,
    });

    if (historicoResult.error) {
      setHistoricoStatusErro(historicoResult.error.message || 'Não foi possível atualizar o histórico.');
      return false;
    }

    setHistoricoStatus(Array.isArray(historicoResult.data) ? historicoResult.data : []);
    setHistoricoStatusErro('');
    return true;
  }

  function iniciarEdicaoHistorico(item) {
    setHistoricoEditandoId(item.id);
    setHistoricoTextoEdicao(item.justificativa || '');
    setErro('');
  }

  function cancelarEdicaoHistorico() {
    setHistoricoEditandoId(null);
    setHistoricoTextoEdicao('');
    setErro('');
  }

  async function salvarEdicaoHistorico(item) {
    const texto = historicoTextoEdicao.trim();

    if (!texto) {
      setErro('Informe o texto da justificativa/observação antes de salvar a correção.');
      return;
    }

    setHistoricoAcaoId(item.id);
    setErro('');

    const result = await supabase.rpc('sgf_editar_historico_status_proposta', {
      p_historico_id: item.id,
      p_justificativa: texto,
    });

    if (result.error) {
      setErro(result.error.message || 'Não foi possível editar o histórico.');
      setHistoricoAcaoId(null);
      return;
    }

    await recarregarHistoricoStatus();
    setHistoricoEditandoId(null);
    setHistoricoTextoEdicao('');
    setHistoricoAcaoId(null);
  }

  async function excluirHistorico(item) {
    const confirmar = window.confirm(
      `Excluir do histórico a movimentação "${item.status_novo_nome || item.status_novo_codigo || ''}"?`,
    );

    if (!confirmar) return;

    setHistoricoAcaoId(item.id);
    setErro('');

    const result = await supabase.rpc('sgf_excluir_historico_status_proposta', {
      p_historico_id: item.id,
    });

    if (result.error) {
      setErro(result.error.message || 'Não foi possível excluir a movimentação do histórico.');
      setHistoricoAcaoId(null);
      return;
    }

    const codigoAtual = result.data?.status_atual_codigo || 'PROTOCOLADA';
    const statusAtual = statusDisponiveis.find((status) => status.codigo === codigoAtual);

    setForm((atual) => ({
      ...atual,
      status_codigo: codigoAtual,
      status_nome: statusAtual?.nome || result.data?.status_atual_nome || nomeStatus(codigoAtual),
    }));
    setStatusInicialCodigo(codigoAtual);
    setJustificativaStatus('');

    await recarregarHistoricoStatus();
    setHistoricoEditandoId(null);
    setHistoricoTextoEdicao('');
    setHistoricoAcaoId(null);
  }

  async function registrarAlteracaoSituacao() {
    setErro('');

    if (!editando || !id) {
      setErro('Salve a Proposta como Protocolada antes de registrar outra situação.');
      return;
    }

    if (form.status_codigo === statusInicialCodigo) {
      setErro('Selecione uma situação diferente da situação atual.');
      return;
    }

    if (exigeJustificativaStatus(form.status_codigo) && !justificativaStatus.trim()) {
      setErro(`Informe a justificativa para alterar a situação para ${form.status_nome}.`);
      return;
    }

    setSalvando(true);

    const statusChangeResult = await supabase.rpc('sgf_alterar_status_proposta', {
      p_proposta_id: id,
      p_status_novo: form.status_codigo,
      p_justificativa: justificativaStatus.trim() || null,
    });

    if (statusChangeResult.error) {
      setErro(statusChangeResult.error.message || 'Não foi possível registrar a alteração de situação.');
      setSalvando(false);
      return;
    }

    await recarregarHistoricoStatus();

    setStatusInicialCodigo(form.status_codigo);
    setJustificativaStatus('');
    setSalvando(false);
  }

  async function salvar(event) {
    event.preventDefault();
    setErro('');

    if (!form.exercicio_id || !exercicioAtual) {
      setErro('Não há Exercício atual aberto configurado para registrar a Proposta.');
      return;
    }

    if (!/^\d{4}\/\d{4}$/.test(form.numero_processo.trim())) {
      setErro('Informe o Nº do Processo no formato 0000/AAAA.');
      return;
    }

    const anoProcesso = Number(form.numero_processo.slice(-4));
    if (Number.isFinite(Number(exercicioAtual?.ano)) && anoProcesso !== Number(exercicioAtual.ano)) {
      setErro(`O Nº do Processo deve pertencer ao exercício ${exercicioAtual.ano}.`);
      return;
    }

    if (!form.data_proposta) {
      setErro('Informe a data da Proposta.');
      return;
    }

    if (!form.requerente_id) {
      setErro('Selecione o Requerente.');
      return;
    }

    if (!form.categoria_requerente_id) {
      setErro('Selecione a categoria do Requerente.');
      return;
    }

    if (!form.modalidade_id) {
      setErro('Selecione a modalidade de crédito.');
      return;
    }

    const valor = moedaParaNumero(form.valor_financiamento_solicitado);
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor válido para a Proposta.');
      return;
    }

    const parcelas = Number(form.parcelas_solicitadas);
    if (!Number.isInteger(parcelas) || parcelas <= 0) {
      setErro('Informe uma quantidade válida de parcelas.');
      return;
    }

    const carenciaMaxima = carenciaMaximaPorValor(valor);
    const carencia = Number(form.carencia_meses);
    if (carenciaMaxima === null) {
      setErro('O valor da Proposta está fora das faixas configuradas para definição da carência.');
      return;
    }
    if (!Number.isInteger(carencia) || carencia < 0 || carencia > carenciaMaxima) {
      setErro(`Informe uma carência entre 0 e ${carenciaMaxima} mês(es).`);
      return;
    }

    if (!form.resumo_objetivo_emprestimo.trim()) {
      setErro('Informe o Resumo do Objeto do Empréstimo.');
      return;
    }

    if (form.status_codigo !== statusInicialCodigo
      && exigeJustificativaStatus(form.status_codigo)
      && !justificativaStatus.trim()) {
      setErro(`Informe a justificativa para alterar a situação para ${form.status_nome}.`);
      return;
    }

    setSalvando(true);

    const saveResult = await supabase.rpc('sgf_salvar_proposta_com_carencia', {
      p_id: editando ? id : null,
      p_exercicio_id: form.exercicio_id,
      p_numero_processo: form.numero_processo.trim(),
      p_data_proposta: form.data_proposta,
      p_data_abertura_processo: form.data_abertura_processo || null,
      p_requerente_id: form.requerente_id,
      p_categoria_requerente_id: form.categoria_requerente_id,
      p_modalidade_id: form.modalidade_id,
      p_valor_financiamento_solicitado: valor,
      p_parcelas_solicitadas: parcelas,
      p_carencia_meses: carencia,
      p_resumo_objetivo_emprestimo: form.resumo_objetivo_emprestimo.trim(),
      p_observacoes: form.observacoes.trim() || null,
    });

    if (saveResult.error) {
      setErro(saveResult.error.message || 'Não foi possível salvar a Proposta de Crédito.');
      setSalvando(false);
      return;
    }

    if (editando && form.status_codigo !== statusInicialCodigo) {
      const statusChangeResult = await supabase.rpc('sgf_alterar_status_proposta', {
        p_proposta_id: id,
        p_status_novo: form.status_codigo,
        p_justificativa: justificativaStatus.trim() || null,
      });

      if (statusChangeResult.error) {
        setErro(statusChangeResult.error.message || 'Os dados da Proposta foram salvos, mas não foi possível registrar a alteração de situação.');
        setSalvando(false);
        return;
      }

      await recarregarHistoricoStatus();
      setStatusInicialCodigo(form.status_codigo);
      setJustificativaStatus('');
    }

    navigate('/propostas');
  }

  return (
    <div className="page-content user-form-page requerente-form-page proposta-form-page">
      <div className="users-page-title-row">
        <div>
          <h1>{editando ? 'Editar Proposta de Crédito' : 'Nova Proposta de Crédito'}</h1>
          <p className="requerentes-page-subtitle">
            O Nº do Processo identifica a Proposta e deve seguir o formato 0000/AAAA.
          </p>
        </div>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/propostas')}>
        <span aria-hidden="true">←</span><span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="requerente-form-card" onSubmit={salvar}>
          <section className="requerente-form-section">
            <div className="requerente-section-header proposal-identification-header">
              <div>
                <h2>Identificação da Proposta</h2>
                <p>Número do Processo, modalidade, valor, parcelas, carência e andamento da Proposta.</p>
              </div>

              {editando && statusInicialCodigo === 'APROVADA_CONSELHO' ? (
                <span className="proposal-approved-capsule">Aprovada</span>
              ) : null}
            </div>

            <div className="requerente-grid">
              <label className="user-form-field req-span-4">
                <span>Nº do Processo *</span>
                <input
                  className="standard-input"
                  name="numero_processo"
                  value={form.numero_processo}
                  onChange={alterar}
                  placeholder={`0000/${exercicioAtual?.ano || 'AAAA'}`}
                  inputMode="numeric"
                  maxLength={9}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field req-span-4">
                <span>Data da Proposta *</span>
                <input
                  className="standard-input"
                  type="date"
                  name="data_proposta"
                  value={form.data_proposta}
                  onChange={alterar}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field req-span-4">
                <span>Data de abertura do Processo</span>
                <input
                  className="standard-input"
                  type="date"
                  name="data_abertura_processo"
                  value={form.data_abertura_processo}
                  onChange={alterar}
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field req-span-3">
                <span>Modalidade *</span>
                <select
                  className="standard-select"
                  name="modalidade_id"
                  value={form.modalidade_id}
                  onChange={alterar}
                  required
                  disabled={salvando}
                >
                  <option value="">Selecione</option>
                  {modalidades.map((modalidade) => (
                    <option key={modalidade.id} value={modalidade.id}>{modalidade.nome}</option>
                  ))}
                </select>
              </label>

              <label className="user-form-field req-span-3">
                <span>Valor da Proposta (R$) *</span>
                <input
                  className="standard-input proposal-number-input"
                  type="text"
                  inputMode="numeric"
                  name="valor_financiamento_solicitado"
                  value={form.valor_financiamento_solicitado}
                  onChange={alterar}
                  placeholder="R$ 0,00"
                  autoComplete="off"
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field req-span-3">
                <span>Quantidade de parcelas *</span>
                <input
                  className="standard-input proposal-number-input"
                  type="number"
                  min="1"
                  step="1"
                  name="parcelas_solicitadas"
                  value={form.parcelas_solicitadas}
                  onChange={alterar}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field req-span-3">
                <span>Carência *</span>
                <select
                  className="standard-select proposal-number-input"
                  name="carencia_meses"
                  value={form.carencia_meses}
                  onChange={alterar}
                  required
                  disabled={salvando || carenciaMaximaPorValor(moedaParaNumero(form.valor_financiamento_solicitado)) === null}
                >
                  {opcoesCarencia(carenciaMaximaPorValor(moedaParaNumero(form.valor_financiamento_solicitado))).map((meses) => (
                    <option key={meses} value={String(meses)}>
                      {meses === 0 ? 'Sem carência' : `${meses} ${meses === 1 ? 'mês' : 'meses'}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="user-form-field req-span-12">
                <span>Resumo do Objeto do Empréstimo *</span>
                <textarea
                  className="standard-input requerente-observacoes-textarea proposal-summary-textarea"
                  name="resumo_objetivo_emprestimo"
                  value={form.resumo_objetivo_emprestimo}
                  onChange={alterar}
                  rows="3"
                  maxLength="1000"
                  placeholder="Ex.: aquisição de equipamentos para ampliação da capacidade produtiva."
                  required
                  disabled={salvando}
                />
              </label>

              <div className="req-span-12 proposal-status-workflow">
                <div className="proposal-status-line">
                  <label className="user-form-field proposal-status-field">
                    <span>Situação *</span>
                    <select
                      className="standard-select"
                      name="status_codigo"
                      value={form.status_codigo}
                      onChange={alterarStatus}
                      required
                      disabled={salvando || !editando}
                    >
                      {statusDisponiveis.map((status) => (
                        <option key={status.codigo} value={status.codigo}>{status.nome}</option>
                      ))}
                    </select>
                  </label>

                  <label className="user-form-field proposal-status-justification-field">
                    <span>
                      Justificativa da Alteração
                      {form.status_codigo !== statusInicialCodigo && exigeJustificativaStatus(form.status_codigo) ? ' *' : ''}
                    </span>
                    <div className="proposal-status-justification-row">
                      <input
                        className="standard-input proposal-status-justification-input"
                        value={justificativaStatus}
                        onChange={(event) => { setJustificativaStatus(event.target.value); setErro(''); }}
                        maxLength="1000"
                        placeholder={form.status_codigo === statusInicialCodigo
                          ? 'Selecione uma nova situação para registrar uma alteração.'
                          : exigeJustificativaStatus(form.status_codigo)
                            ? `Informe o motivo da alteração para ${form.status_nome}.`
                            : 'Opcional. Ex.: requerente entregou a certidão pendente.'}
                        disabled={salvando || !editando || form.status_codigo === statusInicialCodigo}
                      />
                      <button
                        type="button"
                        className="proposal-status-add-button"
                        onClick={registrarAlteracaoSituacao}
                        title="Adicionar ao histórico"
                        aria-label="Adicionar alteração de situação ao histórico"
                        disabled={salvando || !editando || form.status_codigo === statusInicialCodigo}
                      >
                        <Plus size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </label>
                </div>

                {editando ? (
                  <div className="proposal-inline-history">
                    <div className="proposal-inline-history-header">
                      <strong>Histórico de situações e justificativas</strong>
                    </div>

                    {historicoStatusErro ? (
                      <div className="proposal-inline-history-empty">{historicoStatusErro}</div>
                    ) : historicoStatus.length === 0 ? (
                      <div className="proposal-inline-history-empty">Nenhum histórico registrado.</div>
                    ) : (
                      <div className="proposal-inline-history-list">
                        {historicoStatusAgrupado.map((grupo) => (
                          <div className="proposal-inline-history-day" key={grupo.data}>
                            {grupo.itens.map((item, index) => {
                              const registroInicial = !item.status_anterior_codigo;
                              const editandoHistorico = historicoEditandoId === item.id;
                              const processandoHistorico = historicoAcaoId === item.id;

                              return (
                                <div className="proposal-inline-history-row" key={item.id}>
                                  <div className="proposal-inline-history-date">
                                    {index === 0 ? grupo.data : ''}
                                  </div>

                                  <div className="proposal-inline-history-actions">
                                    <StandardActionButtons
                                      onEdit={() => iniciarEdicaoHistorico(item)}
                                      onDelete={registroInicial ? undefined : () => excluirHistorico(item)}
                                      canEdit={!editandoHistorico}
                                      canDelete={!registroInicial && !editandoHistorico}
                                      disabled={processandoHistorico || salvando}
                                    />
                                  </div>

                                  <div className="proposal-inline-history-entry">
                                    {editandoHistorico ? (
                                      <div className="proposal-history-edit-box">
                                        <strong>{item.status_novo_nome || item.status_novo_codigo || '—'}</strong>
                                        <input
                                          className="standard-input proposal-history-edit-input"
                                          value={historicoTextoEdicao}
                                          onChange={(event) => {
                                            setHistoricoTextoEdicao(event.target.value);
                                            setErro('');
                                          }}
                                          maxLength="1000"
                                          autoFocus
                                          disabled={processandoHistorico}
                                        />
                                        <div className="proposal-history-edit-controls">
                                          <button
                                            type="button"
                                            className="proposal-history-save-button"
                                            onClick={() => salvarEdicaoHistorico(item)}
                                            disabled={processandoHistorico}
                                          >
                                            {processandoHistorico ? 'Salvando...' : 'Salvar'}
                                          </button>
                                          <button
                                            type="button"
                                            className="proposal-history-cancel-link"
                                            onClick={cancelarEdicaoHistorico}
                                            disabled={processandoHistorico}
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <strong>{item.status_novo_nome || item.status_novo_codigo || '—'}</strong>
                                        {item.justificativa ? (
                                          <>
                                            <span className="proposal-inline-history-separator">—</span>
                                            <span>{item.justificativa}</span>
                                          </>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

            </div>
          </section>

          <section className="requerente-form-section">
            <div className="requerente-section-header">
              <h2>Requerente</h2>
              <p>Categoria e ramo de atividade são trazidos automaticamente do cadastro do Requerente.</p>
            </div>

            <div className="requerente-grid">
              <label className="user-form-field req-span-12">
                <span>Requerente *</span>
                <select
                  className="standard-select"
                  name="requerente_id"
                  value={form.requerente_id}
                  onChange={alterarRequerente}
                  required
                  disabled={salvando}
                >
                  <option value="">Selecione o Requerente</option>
                  {requerentes.map((requerente) => (
                    <option key={requerente.id} value={requerente.id}>
                      {requerente.nome_razao_social} — {formatarDocumento(requerente.cpf_cnpj, requerente.tipo_pessoa)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {requerenteSelecionado ? (
              <div className="requerente-receita-subcard">
                <div className="requerente-receita-header">
                  <div>
                    <h3>Dados do Requerente</h3>
                    <p>Dados apenas para conferência; não são digitados novamente na Proposta.</p>
                  </div>
                </div>

                <div className="requerente-receita-grid">
                  <div>
                    <strong>Nome / Razão Social</strong>
                    <span>{requerenteSelecionado.nome_razao_social || '—'}</span>
                  </div>

                  <div>
                    <strong>CPF / CNPJ</strong>
                    <span>{formatarDocumento(requerenteSelecionado.cpf_cnpj, requerenteSelecionado.tipo_pessoa)}</span>
                  </div>

                  <div>
                    <strong>Telefone</strong>
                    <span>{formatarTelefone(requerenteSelecionado.telefone || requerenteSelecionado.whatsapp)}</span>
                  </div>

                  <div>
                    <strong>Distrito</strong>
                    <span>{requerenteSelecionado.distrito_nome || '—'}</span>
                  </div>

                  <div className="requerente-receita-wide">
                    <strong>Bairro / Localidade</strong>
                    <span>{requerenteSelecionado.bairro_localidade || '—'}</span>
                  </div>

                  <div className="requerente-receita-wide">
                    <strong>Ramo de atividade</strong>
                    <span>
                      {[requerenteSelecionado.ramo_atividade_codigo, requerenteSelecionado.ramo_atividade]
                        .filter(Boolean)
                        .join(' - ') || 'Não informado — consulte e salve o CNPJ no cadastro do Requerente.'}
                    </span>
                  </div>
                </div>

                <div className="requerente-grid" style={{ marginTop: 16 }}>
                  <label className="user-form-field req-span-12">
                    <span>Categoria do Requerente *</span>
                    <select
                      className="standard-select"
                      name="categoria_requerente_id"
                      value={form.categoria_requerente_id}
                      onChange={alterar}
                      required
                      disabled={salvando}
                    >
                      <option value="">Selecione a categoria</option>
                      {categoriasDisponiveis.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}
          </section>

          <section className="requerente-form-section">
            <div className="requerente-section-header">
              <h2>Observações</h2>
              <p>Informações administrativas de controle da Proposta ou do Processo.</p>
            </div>

            <label className="user-form-field">
              <textarea
                className="standard-input requerente-observacoes-textarea"
                name="observacoes"
                value={form.observacoes}
                onChange={alterar}
                rows="5"
                disabled={salvando}
              />
            </label>
          </section>

          <div className="user-form-actions">
            <button type="button" className="user-form-cancel-link" onClick={() => navigate('/propostas')} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="standard-button user-form-save" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
