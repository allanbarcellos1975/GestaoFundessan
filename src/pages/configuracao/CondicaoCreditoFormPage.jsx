import { FileText, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const BUCKET = 'sgf-condicoes-credito';
const MAX_PDF_BYTES = 15 * 1024 * 1024;

const INICIAL = {
  instituicaoNome: '',
  bancoCodigo: '',
  agenciaReferencia: '',
  tipoInstrumento: 'CONTRATO_BANCARIO',
  instrumentoNome: '',
  instrumentoNumero: '',
  vigenciaInicio: '',
  vigenciaFim: '',
  situacao: 'VIGENTE',
  observacoes: '',
};

const CONDICOES_INICIAIS = {
  jurosRemuneratorios: '',
  jurosMora: '',
  sistemaAmortizacao: '',
  iofSituacao: '',
  multaInadimplencia: '',
  taxaAnalise: '',
  custoEmissaoServicos: '',
  taxaBoleto: '',
  aberturaConta: '',
  manutencaoConta: '',
  encerramentoConta: '',
  formaDisponibilizacao: '',
  meioPagamento: '',
  tipoGarantia: '',
  prazoMinimoConta: '',
  prazoSubstituicaoGarantia: '',
  prazoComprovacaoAplicacao: '',
  regraVencimentoDiaNaoUtil: '',
  correcaoMonetaria: '',
};

function numeroOuNull(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const numero = Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function textoOuNull(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

function montarItensIniciais(condicoes, instituicaoNome) {
  const itens = [];
  const banco = textoOuNull(instituicaoNome);

  function adicionar(item, preenchido = true) {
    if (preenchido) itens.push(item);
  }

  adicionar({
    codigo: 'JUROS_REMUNERATORIOS',
    nome: 'Taxa Efetiva de Juros Remuneratórios',
    categoria: 'JUROS',
    tipo_calculo: 'PERCENTUAL_ANUAL',
    valor: numeroOuNull(condicoes.jurosRemuneratorios),
    unidade: '% ao ano',
    base_calculo: 'Saldo devedor da operação',
    periodicidade: 'Capitalização mensal',
    cobrado_por: 'FUNDESSAN',
    origem_tipo: 'CONTRATO_BANCARIO',
    origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
    referencia_contratual: null,
    referencia_legal: null,
    observacoes: null,
  }, textoOuNull(condicoes.jurosRemuneratorios) !== null);

  adicionar({
    codigo: 'JUROS_MORA',
    nome: 'Juros de Mora',
    categoria: 'JUROS',
    tipo_calculo: 'PERCENTUAL_MENSAL',
    valor: numeroOuNull(condicoes.jurosMora),
    unidade: '% ao mês',
    base_calculo: 'Valor inadimplido',
    periodicidade: 'Durante a mora',
    cobrado_por: 'FUNDESSAN',
    origem_tipo: 'CONTRATO_BANCARIO',
    origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
    referencia_contratual: null,
    referencia_legal: null,
    observacoes: null,
  }, textoOuNull(condicoes.jurosMora) !== null);

  adicionar({
    codigo: 'SISTEMA_AMORTIZACAO',
    nome: 'Sistema de Amortização',
    categoria: 'OUTRO',
    tipo_calculo: 'TEXTO',
    valor: null,
    unidade: textoOuNull(condicoes.sistemaAmortizacao),
    base_calculo: null,
    periodicidade: null,
    cobrado_por: null,
    origem_tipo: 'CONTRATO_BANCARIO',
    origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
    referencia_contratual: null,
    referencia_legal: null,
    observacoes: null,
  }, textoOuNull(condicoes.sistemaAmortizacao) !== null);

  adicionar({
    codigo: 'IOF',
    nome: 'Imposto sobre Operações Financeiras - IOF',
    categoria: 'IMPOSTO',
    tipo_calculo: condicoes.iofSituacao === 'ISENTO' ? 'ISENTO' : 'TEXTO',
    valor: null,
    unidade: condicoes.iofSituacao === 'ISENTO' ? 'ISENTO' : textoOuNull(condicoes.iofSituacao),
    base_calculo: null,
    periodicidade: null,
    cobrado_por: null,
    origem_tipo: 'CONTRATO_BANCARIO',
    origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
    referencia_contratual: null,
    referencia_legal: null,
    observacoes: null,
  }, textoOuNull(condicoes.iofSituacao) !== null);

  adicionar({
    codigo: 'MULTA_INADIMPLENCIA_CONTRATUAL',
    nome: 'Multa Convencional por Inadimplência',
    categoria: 'MULTA',
    tipo_calculo: 'PERCENTUAL_UNICO',
    valor: numeroOuNull(condicoes.multaInadimplencia),
    unidade: '%',
    base_calculo: 'Valor inadimplido',
    periodicidade: 'Na ocorrência da inadimplência',
    cobrado_por: 'FUNDESSAN',
    origem_tipo: 'CONTRATO_BANCARIO',
    origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
    referencia_contratual: null,
    referencia_legal: null,
    observacoes: null,
  }, textoOuNull(condicoes.multaInadimplencia) !== null);

  const tarifas = [
    ['TAXA_ANALISE', 'Taxa de Análise', 'VALOR_FIXO', condicoes.taxaAnalise, 'R$', 'Uma única vez'],
    ['CUSTO_EMISSAO_SERVICOS', 'Custo de Emissão / Processamento por Parcela', 'POR_PARCELA', condicoes.custoEmissaoServicos, 'R$ por parcela contratada', 'Por parcela'],
    ['TAXA_BOLETO', 'Taxa de Boleto por Parcela', 'POR_PARCELA', condicoes.taxaBoleto, 'R$ por boleto/parcela', 'Por parcela'],
    ['ABERTURA_CONTA', 'Abertura da Conta Corrente', 'VALOR_FIXO', condicoes.aberturaConta, 'R$', 'Uma única vez'],
    ['MANUTENCAO_CONTA', 'Manutenção Mensal da Conta Corrente', 'MENSAL', condicoes.manutencaoConta, 'R$ por mês', 'Mensal'],
    ['ENCERRAMENTO_CONTA', 'Encerramento da Conta Corrente', 'VALOR_FIXO', condicoes.encerramentoConta, 'R$', 'No encerramento'],
  ];

  for (const [codigo, nome, tipo, valor, unidade, periodicidade] of tarifas) {
    adicionar({
      codigo,
      nome,
      categoria: codigo === 'TAXA_ANALISE' ? 'TAXA_ADMINISTRATIVA' : 'TARIFA_BANCARIA',
      tipo_calculo: tipo,
      valor: numeroOuNull(valor),
      unidade,
      base_calculo: tipo === 'POR_PARCELA' ? 'Quantidade de parcelas contratadas' : null,
      periodicidade,
      cobrado_por: banco,
      origem_tipo: 'CONTRATO_BANCARIO',
      origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
      referencia_contratual: null,
      referencia_legal: null,
      observacoes: null,
    }, textoOuNull(valor) !== null);
  }

  const textos = [
    ['FORMA_DISPONIBILIZACAO', 'Forma de Disponibilização do Crédito', condicoes.formaDisponibilizacao],
    ['MEIO_PAGAMENTO', 'Forma de Pagamento das Parcelas', condicoes.meioPagamento],
    ['TIPO_GARANTIA', 'Tipo de Garantia', condicoes.tipoGarantia],
    ['VENCIMENTO_DIA_NAO_UTIL', 'Regra de Vencimento em Dia Não Útil', condicoes.regraVencimentoDiaNaoUtil],
    ['CORRECAO_MONETARIA', 'Correção Monetária / Índice', condicoes.correcaoMonetaria],
  ];

  for (const [codigo, nome, valor] of textos) {
    adicionar({
      codigo,
      nome,
      categoria: 'OUTRO',
      tipo_calculo: 'TEXTO',
      valor: null,
      unidade: textoOuNull(valor),
      base_calculo: null,
      periodicidade: null,
      cobrado_por: null,
      origem_tipo: 'CONTRATO_BANCARIO',
      origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
      referencia_contratual: null,
      referencia_legal: null,
      observacoes: null,
    }, textoOuNull(valor) !== null);
  }

  const prazos = [
    ['PRAZO_MINIMO_CONTA_CORRENTE', 'Prazo Mínimo de Manutenção da Conta Corrente', condicoes.prazoMinimoConta],
    ['PRAZO_SUBSTITUICAO_GARANTIA', 'Prazo para Apresentação de Nova Garantia', condicoes.prazoSubstituicaoGarantia],
    ['PRAZO_COMPROVACAO_APLICACAO', 'Prazo para Comprovação da Aplicação do Recurso', condicoes.prazoComprovacaoAplicacao],
  ];

  for (const [codigo, nome, valor] of prazos) {
    adicionar({
      codigo,
      nome,
      categoria: 'OUTRO',
      tipo_calculo: 'TEXTO',
      valor: null,
      unidade: textoOuNull(valor) ? `${textoOuNull(valor)} DIAS` : null,
      base_calculo: null,
      periodicidade: null,
      cobrado_por: null,
      origem_tipo: 'CONTRATO_BANCARIO',
      origem_descricao: banco ? `Instrumento firmado com ${banco}` : 'Instrumento de condição de crédito',
      referencia_contratual: null,
      referencia_legal: null,
      observacoes: null,
    }, textoOuNull(valor) !== null);
  }

  return itens;
}

function paraForm(registro) {
  return {
    instituicaoNome: registro?.instituicao_nome || '',
    bancoCodigo: registro?.banco_codigo || '',
    agenciaReferencia: registro?.agencia_referencia || '',
    tipoInstrumento: registro?.tipo_instrumento || 'CONTRATO_BANCARIO',
    instrumentoNome: registro?.instrumento_nome || '',
    instrumentoNumero: registro?.instrumento_numero || '',
    vigenciaInicio: registro?.vigencia_inicio || '',
    vigenciaFim: registro?.vigencia_fim || '',
    situacao: registro?.situacao || 'VIGENTE',
    observacoes: registro?.observacoes || '',
  };
}


function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarNumero(valor, casas = 2) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarTextoApresentacao(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const texto = String(valor).trim();
  if (!texto) return '—';

  const apenasLetras = texto.replace(/[^A-Za-zÀ-ÿ]+/g, '');
  const pareceMaiusculo = apenasLetras && apenasLetras === apenasLetras.toUpperCase();
  if (!pareceMaiusculo) return texto;

  const excecoes = new Set(['IOF', 'FGTS', 'CNPJ', 'CPF', 'MEI', 'PIX', 'SICOOB']);

  return texto
    .toLowerCase()
    .split(/(\s+|\/|-)/)
    .map((parte) => {
      if (!parte.trim()) return parte;
      const original = parte.toUpperCase();
      if (excecoes.has(original)) return original;
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join('');
}

function formatarValorItem(item) {
  const tipo = String(item?.tipo_calculo || '').toUpperCase();

  if (tipo === 'ISENTO') return 'Isento';
  if (tipo === 'TEXTO') return formatarTextoApresentacao(item?.unidade || item?.valor_texto || '—');
  if (item?.valor === null || item?.valor === undefined || item?.valor === '') {
    return formatarTextoApresentacao(item?.unidade || '—');
  }

  if (tipo.startsWith('PERCENTUAL')) {
    const sufixo = tipo === 'PERCENTUAL_ANUAL' ? ' a.a.' : tipo === 'PERCENTUAL_MENSAL' ? ' a.m.' : '';
    return `${formatarNumero(item.valor, 2)}%${sufixo}`;
  }

  if (tipo === 'VALOR_FIXO') return formatarMoeda(item.valor);
  if (tipo === 'POR_PARCELA') return `${formatarMoeda(item.valor)} por parcela`;
  if (tipo === 'MENSAL') return `${formatarMoeda(item.valor)} por mês`;

  return item?.unidade
    ? `${formatarNumero(item.valor, 2)} ${formatarTextoApresentacao(item.unidade)}`
    : formatarNumero(item.valor, 2);
}

const ORDEM_ITENS = [
  'JUROS_REMUNERATORIOS',
  'SISTEMA_AMORTIZACAO',
  'IOF',
  'MULTA_INADIMPLENCIA_CONTRATUAL',
  'CUSTO_EMISSAO_SERVICOS',
  'ABERTURA_CONTA',
  'MANUTENCAO_CONTA',
  'ENCERRAMENTO_CONTA',
  'FORMA_DISPONIBILIZACAO',
  'MEIO_PAGAMENTO',
  'TIPO_GARANTIA',
  'PRAZO_MINIMO_CONTA_CORRENTE',
  'PRAZO_SUBSTITUICAO_GARANTIA',
  'PRAZO_COMPROVACAO_APLICACAO',
  'VENCIMENTO_DIA_NAO_UTIL',
];

export default function CondicaoCreditoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(INICIAL);
  const [condicoes, setCondicoes] = useState(CONDICOES_INICIAIS);
  const [arquivoAtual, setArquivoAtual] = useState(null);
  const [modalidades, setModalidades] = useState([]);
  const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState([]);
  const [itens, setItens] = useState([]);
  const [novoArquivo, setNovoArquivo] = useState(null);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarOpcoes() {
      const { data, error } = await supabase.rpc('sgf_condicao_credito_form_opcoes');
      if (!ativo) return;
      if (error) {
        setErro(error.message || 'Não foi possível carregar as modalidades.');
        return;
      }
      setModalidades(Array.isArray(data?.modalidades) ? data.modalidades : []);
    }

    carregarOpcoes();
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!editando) return;

    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const { data, error } = await supabase.rpc('sgf_obter_condicao_credito', { p_id: id });
      if (!ativo) return;

      if (error || !data?.condicao) {
        setErro(error?.message || 'Condição de crédito não encontrada.');
      } else {
        setForm(paraForm(data.condicao));
        setArquivoAtual({
          nome: data.condicao.arquivo_nome_original || '',
          bucket: data.condicao.arquivo_storage_bucket || '',
          path: data.condicao.arquivo_storage_path || '',
        });
        setModalidadesSelecionadas((Array.isArray(data.modalidades) ? data.modalidades : []).map((item) => item.id));
        setItens(Array.isArray(data.itens) ? data.itens : []);
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, id]);

  const podeSalvar = useMemo(() => (
    form.instituicaoNome.trim().length > 0
    && form.instrumentoNome.trim().length > 0
    && !salvando
    && !loading
  ), [form, salvando, loading]);

  function alterar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    setErro('');
  }

  function alterarCondicao(event) {
    const { name, value } = event.target;
    setCondicoes((atual) => ({ ...atual, [name]: value }));
    setErro('');
  }

  function alternarModalidade(modalidadeId) {
    setModalidadesSelecionadas((atuais) => (
      atuais.includes(modalidadeId)
        ? atuais.filter((idAtual) => idAtual !== modalidadeId)
        : [...atuais, modalidadeId]
    ));
  }

  function selecionarPdf(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) {
      setErro('O contrato deve estar em PDF.');
      return;
    }

    if (arquivo.size > MAX_PDF_BYTES) {
      setErro('O PDF deve possuir no máximo 15 MB.');
      return;
    }

    setNovoArquivo(arquivo);
    setErro('');
  }

  async function anexarPdf(condicaoId, arquivo) {
    const path = `condicoes/${condicaoId}/contrato.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arquivo, {
        upsert: true,
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    const { error: vinculoError } = await supabase.rpc('sgf_salvar_arquivo_condicao_credito', {
      p_id: condicaoId,
      p_bucket: BUCKET,
      p_path: path,
      p_nome_original: arquivo.name,
    });

    if (vinculoError) throw vinculoError;
  }

  async function salvar(event) {
    event.preventDefault();
    if (!podeSalvar) return;

    setSalvando(true);
    setErro('');

    if (!editando && !form.vigenciaInicio) {
      setErro('Informe o início da vigência para cadastrar as condições financeiras iniciais.');
      setSalvando(false);
      return;
    }

    const itensIniciais = editando ? [] : montarItensIniciais(condicoes, form.instituicaoNome);

    const { data, error } = await supabase.rpc('sgf_salvar_condicao_credito_completa', {
      p_id: id || null,
      p_instituicao_nome: form.instituicaoNome.trim(),
      p_banco_codigo: form.bancoCodigo.trim() || null,
      p_agencia_referencia: form.agenciaReferencia.trim() || null,
      p_tipo_instrumento: form.tipoInstrumento,
      p_instrumento_nome: form.instrumentoNome.trim(),
      p_instrumento_numero: form.instrumentoNumero.trim() || null,
      p_vigencia_inicio: form.vigenciaInicio || null,
      p_vigencia_fim: form.vigenciaFim || null,
      p_situacao: form.situacao,
      p_observacoes: form.observacoes.trim() || null,
      p_modalidade_ids: modalidadesSelecionadas,
      p_itens: itensIniciais,
    });

    if (error || !data?.id) {
      setErro(error?.message || 'Não foi possível salvar a condição de crédito.');
      setSalvando(false);
      return;
    }

    if (novoArquivo) {
      try {
        await anexarPdf(data.id, novoArquivo);
      } catch (uploadError) {
        setErro(uploadError?.message || 'A condição foi salva, mas o contrato não pôde ser anexado.');
        setSalvando(false);
        return;
      }
    }

    navigate(`/configuracao/normas-credito/condicoes/${data.id}`);
  }

  const itensAtuais = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const porCodigo = new Map();

    for (const item of itens) {
      if (!item?.ativo) continue;
      const inicio = item.vigencia_inicio || '0000-01-01';
      const fim = item.vigencia_fim || '9999-12-31';
      if (inicio > hoje || fim < hoje) continue;

      const codigo = String(item.codigo || '').toUpperCase();
      const anterior = porCodigo.get(codigo);
      if (!anterior || Number(item.versao || 1) > Number(anterior.versao || 1)) {
        porCodigo.set(codigo, item);
      }
    }

    return [...porCodigo.values()].sort((a, b) => {
      const ai = ORDEM_ITENS.indexOf(String(a.codigo || '').toUpperCase());
      const bi = ORDEM_ITENS.indexOf(String(b.codigo || '').toUpperCase());
      const ao = ai === -1 ? 999 : ai;
      const bo = bi === -1 ? 999 : bi;
      if (ao !== bo) return ao - bo;
      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });
  }, [itens]);

  const nomeArquivo = novoArquivo?.name || arquivoAtual?.nome || '';

  return (
    <div className="page-content norm-form-page">
      <div className="users-page-title-row">
        <h1>{editando ? 'Editar Condição de Crédito' : 'Nova Condição de Crédito'}</h1>
      </div>

      <button
        type="button"
        className="configuration-back-link"
        onClick={() => navigate(editando ? `/configuracao/normas-credito/condicoes/${id}` : '/configuracao/normas-credito/condicoes')}
      >
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      <form className="norm-form-card" onSubmit={salvar}>
        <section className="norm-form-section">
          <div className="institutional-section-header">
            <h2>Instituição e instrumento</h2>
          </div>

          <div className="norm-form-grid">
            <label className="user-form-field norm-span-4">
              <span>Instituição financeira</span>
              <input className="standard-input" name="instituicaoNome" value={form.instituicaoNome} onChange={alterar} placeholder="Ex.: SICOOB" required />
            </label>

            <label className="user-form-field norm-span-2">
              <span>Código do banco</span>
              <input className="standard-input" name="bancoCodigo" value={form.bancoCodigo} onChange={alterar} placeholder="Ex.: 756" />
            </label>

            <label className="user-form-field norm-span-2">
              <span>Agência de referência</span>
              <input className="standard-input" name="agenciaReferencia" value={form.agenciaReferencia} onChange={alterar} placeholder="Ex.: 4222" />
            </label>

            <label className="user-form-field norm-span-4">
              <span>Tipo do instrumento</span>
              <select className="standard-select" name="tipoInstrumento" value={form.tipoInstrumento} onChange={alterar}>
                <option value="CONTRATO_BANCARIO">Contrato bancário</option>
                <option value="CONVENIO">Convênio</option>
                <option value="TERMO">Termo</option>
                <option value="OUTRO">Outro</option>
              </select>
            </label>

            <label className="user-form-field norm-span-8">
              <span>Nome do instrumento</span>
              <input className="standard-input" name="instrumentoNome" value={form.instrumentoNome} onChange={alterar} placeholder="Ex.: Contrato de Crédito - SICOOB" required />
            </label>

            <label className="user-form-field norm-span-4">
              <span>Número do instrumento</span>
              <input className="standard-input" name="instrumentoNumero" value={form.instrumentoNumero} onChange={alterar} />
            </label>
          </div>
        </section>

        <section className="norm-form-section">
          <div className="institutional-section-header">
            <h2>Modalidades atendidas</h2>
          </div>

          <div className="credit-modalities-options">
            {modalidades.length === 0 ? (
              <span className="credit-modalities-empty">Nenhuma modalidade disponível.</span>
            ) : modalidades.map((modalidade) => (
              <label className="credit-modality-option" key={modalidade.id}>
                <input
                  type="checkbox"
                  checked={modalidadesSelecionadas.includes(modalidade.id)}
                  onChange={() => alternarModalidade(modalidade.id)}
                />
                <span>{modalidade.nome}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="norm-form-section">
          <div className="institutional-section-header">
            <h2>Vigência</h2>
          </div>

          <div className="norm-form-grid">
            <label className="user-form-field norm-span-4">
              <span>Início</span>
              <input className="standard-input" type="date" name="vigenciaInicio" value={form.vigenciaInicio} onChange={alterar} />
            </label>

            <label className="user-form-field norm-span-4">
              <span>Fim</span>
              <input className="standard-input" type="date" name="vigenciaFim" value={form.vigenciaFim} onChange={alterar} />
            </label>

            <label className="user-form-field norm-span-4">
              <span>Situação</span>
              <select className="standard-select" name="situacao" value={form.situacao} onChange={alterar}>
                <option value="VIGENTE">Vigente</option>
                <option value="FUTURA">Futura</option>
                <option value="ENCERRADA">Encerrada</option>
                <option value="INATIVA">Inativa</option>
              </select>
            </label>
          </div>
        </section>

        {!editando ? (
          <>
            <section className="norm-form-section">
              <div className="institutional-section-header">
                <h2>Encargos financeiros</h2>
                <p className="credit-condition-form-note">Preencha as condições iniciais do instrumento. Campos que não se aplicarem podem ficar em branco.</p>
              </div>

              <div className="norm-form-grid">
                <label className="user-form-field norm-span-3">
                  <span>Taxa de juros remuneratórios (% a.a.)</span>
                  <input className="standard-input" type="number" min="0" step="0.0001" name="jurosRemuneratorios" value={condicoes.jurosRemuneratorios} onChange={alterarCondicao} placeholder="Ex.: 6" />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Juros de mora (% a.m.)</span>
                  <input className="standard-input" type="number" min="0" step="0.0001" name="jurosMora" value={condicoes.jurosMora} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Multa por inadimplência (%)</span>
                  <input className="standard-input" type="number" min="0" step="0.0001" name="multaInadimplencia" value={condicoes.multaInadimplencia} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Sistema de amortização</span>
                  <select className="standard-select" name="sistemaAmortizacao" value={condicoes.sistemaAmortizacao} onChange={alterarCondicao}>
                    <option value="">Selecione</option>
                    <option value="TABELA PRICE">Tabela Price</option>
                    <option value="SAC">SAC</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </label>

                <label className="user-form-field norm-span-3">
                  <span>IOF</span>
                  <select className="standard-select" name="iofSituacao" value={condicoes.iofSituacao} onChange={alterarCondicao}>
                    <option value="">Selecione</option>
                    <option value="ISENTO">Isento</option>
                    <option value="COBRADO">Cobrado</option>
                    <option value="CONFORME LEGISLAÇÃO">Conforme legislação</option>
                  </select>
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Correção monetária / índice</span>
                  <input className="standard-input" name="correcaoMonetaria" value={condicoes.correcaoMonetaria} onChange={alterarCondicao} placeholder="Ex.: IPCA, sem correção" />
                </label>
              </div>
            </section>

            <section className="norm-form-section">
              <div className="institutional-section-header">
                <h2>Tarifas e custos</h2>
                <p className="credit-condition-form-note">Cadastre os valores cobrados pelo banco ou pela operação. Cada valor ficará versionado a partir da vigência informada acima.</p>
              </div>

              <div className="norm-form-grid">
                <label className="user-form-field norm-span-3">
                  <span>Taxa de análise (R$)</span>
                  <input className="standard-input" type="number" min="0" step="0.01" name="taxaAnalise" value={condicoes.taxaAnalise} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Custo de emissão / processamento por parcela (R$)</span>
                  <input className="standard-input" type="number" min="0" step="0.01" name="custoEmissaoServicos" value={condicoes.custoEmissaoServicos} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Taxa de boleto por parcela (R$)</span>
                  <input className="standard-input" type="number" min="0" step="0.01" name="taxaBoleto" value={condicoes.taxaBoleto} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Abertura de conta (R$)</span>
                  <input className="standard-input" type="number" min="0" step="0.01" name="aberturaConta" value={condicoes.aberturaConta} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Manutenção mensal da conta (R$)</span>
                  <input className="standard-input" type="number" min="0" step="0.01" name="manutencaoConta" value={condicoes.manutencaoConta} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-3">
                  <span>Encerramento da conta (R$)</span>
                  <input className="standard-input" type="number" min="0" step="0.01" name="encerramentoConta" value={condicoes.encerramentoConta} onChange={alterarCondicao} />
                </label>
              </div>
            </section>

            <section className="norm-form-section">
              <div className="institutional-section-header">
                <h2>Pagamento, garantia e demais condições</h2>
              </div>

              <div className="norm-form-grid">
                <label className="user-form-field norm-span-4">
                  <span>Forma de disponibilização do crédito</span>
                  <input className="standard-input" name="formaDisponibilizacao" value={condicoes.formaDisponibilizacao} onChange={alterarCondicao} placeholder="Ex.: Crédito em conta corrente" />
                </label>

                <label className="user-form-field norm-span-4">
                  <span>Forma de pagamento</span>
                  <input className="standard-input" name="meioPagamento" value={condicoes.meioPagamento} onChange={alterarCondicao} placeholder="Ex.: Boleto" />
                </label>

                <label className="user-form-field norm-span-4">
                  <span>Tipo de garantia</span>
                  <input className="standard-input" name="tipoGarantia" value={condicoes.tipoGarantia} onChange={alterarCondicao} placeholder="Ex.: Garantia fidejussória pessoa física" />
                </label>

                <label className="user-form-field norm-span-4">
                  <span>Prazo mínimo de manutenção da conta (dias)</span>
                  <input className="standard-input" type="number" min="0" step="1" name="prazoMinimoConta" value={condicoes.prazoMinimoConta} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-4">
                  <span>Prazo para substituição da garantia (dias)</span>
                  <input className="standard-input" type="number" min="0" step="1" name="prazoSubstituicaoGarantia" value={condicoes.prazoSubstituicaoGarantia} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-4">
                  <span>Prazo para comprovação da aplicação (dias)</span>
                  <input className="standard-input" type="number" min="0" step="1" name="prazoComprovacaoAplicacao" value={condicoes.prazoComprovacaoAplicacao} onChange={alterarCondicao} />
                </label>

                <label className="user-form-field norm-span-12">
                  <span>Regra de vencimento em dia não útil</span>
                  <input className="standard-input" name="regraVencimentoDiaNaoUtil" value={condicoes.regraVencimentoDiaNaoUtil} onChange={alterarCondicao} placeholder="Ex.: Primeiro dia útil subsequente" />
                </label>
              </div>
            </section>
          </>
        ) : (
          <section className="norm-form-section">
            <div className="institutional-section-header">
              <h2>Condições financeiras, tarifas e demais regras</h2>
              <p className="credit-condition-form-note">Valores atualmente vigentes. Eles não são sobrescritos para preservar o histórico dos contratos.</p>
            </div>

            {itensAtuais.length === 0 ? (
              <div className="norm-empty-block credit-condition-form-empty">Nenhuma condição financeira ou tarifa cadastrada.</div>
            ) : (
              <div className="credit-condition-form-grid">
                {itensAtuais.map((item) => (
                  <div className="credit-condition-form-item" key={item.id}>
                    <span className="credit-condition-form-label">{item.nome}</span>
                    <strong className="credit-condition-form-value">{formatarValorItem(item)}</strong>
                    <span className="credit-condition-form-reference">{item.referencia_contratual || item.referencia_legal || item.origem_descricao || 'Sem referência informada'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="norm-form-section">
          <div className="institutional-section-header">
            <h2>Contrato / documento de referência</h2>
          </div>

          <div className="norm-file-box">
            <div className="norm-file-icon"><FileText size={21} strokeWidth={1.9} /></div>
            <div className="norm-file-copy">
              <strong>{nomeArquivo || 'Nenhum PDF anexado'}</strong>
              <span>PDF de até 15 MB. O arquivo fica vinculado a esta condição de crédito.</span>
            </div>
            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="institutional-logo-file-input" onChange={selecionarPdf} />
            <button type="button" className="standard-button button-outline-blue norm-file-button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} strokeWidth={2} />
              {nomeArquivo ? 'Trocar PDF' : 'Selecionar PDF'}
            </button>
          </div>
        </section>

        <section className="norm-form-section">
          <div className="institutional-section-header">
            <h2>Observações</h2>
          </div>

          <div className="norm-form-grid">
            <label className="user-form-field norm-span-12">
              <span>Observações gerais</span>
              <textarea
                className="standard-textarea norm-textarea norm-textarea-large"
                name="observacoes"
                value={form.observacoes}
                onChange={alterar}
                placeholder="Informações complementares sobre o instrumento ou a condição de crédito"
              />
            </label>
          </div>
        </section>

        <div className="user-form-actions norm-form-actions">
          <button type="button" className="user-form-cancel-link" onClick={() => navigate(editando ? `/configuracao/normas-credito/condicoes/${id}` : '/configuracao/normas-credito/condicoes')} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="standard-button" disabled={!podeSalvar}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
