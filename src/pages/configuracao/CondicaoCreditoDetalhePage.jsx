import { ExternalLink, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function formatarData(valor) {
  if (!valor) return '—';
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
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

function formatarValor(item) {
  const tipo = String(item.tipo_calculo || '').toUpperCase();

  if (tipo === 'ISENTO') return 'Isento';
  if (tipo === 'TEXTO') return formatarTextoApresentacao(item.unidade || item.valor_texto || '—');
  if (item.valor === null || item.valor === undefined) return formatarTextoApresentacao(item.unidade || '—');

  if (tipo.startsWith('PERCENTUAL')) {
    const sufixo = tipo === 'PERCENTUAL_ANUAL' ? ' a.a.' : tipo === 'PERCENTUAL_MENSAL' ? ' a.m.' : '';
    return `${formatarNumero(item.valor, 2)}%${sufixo}`;
  }

  if (['VALOR_FIXO', 'POR_PARCELA', 'MENSAL'].includes(tipo)) {
    const sufixo = item.unidade ? ` · ${item.unidade}` : '';
    return `${formatarMoeda(item.valor)}${sufixo}`;
  }

  return item.unidade ? `${formatarNumero(item.valor, 2)} ${formatarTextoApresentacao(item.unidade)}` : formatarNumero(item.valor, 2);
}

function rotuloSituacao(valor) {
  const mapa = {
    VIGENTE: 'Vigente',
    FUTURA: 'Futura',
    ENCERRADA: 'Encerrada',
    INATIVA: 'Inativa',
  };
  return mapa[String(valor || '').toUpperCase()] || valor || '—';
}

function classeSituacao(valor) {
  const situacao = String(valor || '').toUpperCase();
  if (situacao === 'VIGENTE') return 'is-active';
  if (situacao === 'FUTURA') return 'is-future';
  return 'is-inactive';
}

function LinhaInfo({ label, value, wide = false }) {
  return (
    <div className={`norm-info-item${wide ? ' is-wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function GrupoItens({ titulo, itens }) {
  if (!itens.length) return null;

  return (
    <div className="credit-condition-group">
      <h3>{titulo}</h3>
      <div className="norm-charges-grid">
        {itens.map((item) => (
          <article className={`norm-charge-card${item.ativo ? '' : ' is-inactive'}`} key={item.id}>
            <div className="norm-charge-topline">
              <span>{item.nome}</span>
              <small>v{item.versao || 1}</small>
            </div>
            <strong>{formatarValor(item)}</strong>
            <p>{item.referencia_contratual || item.referencia_legal || item.origem_descricao || 'Sem referência informada'}</p>
            <div className="norm-charge-meta">
              <span>Vigência: {formatarData(item.vigencia_inicio)} até {formatarData(item.vigencia_fim)}</span>
              {item.cobrado_por ? <span>Cobrado por: {item.cobrado_por}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function CondicaoCreditoDetalhePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dados, setDados] = useState(null);
  const [urlPdf, setUrlPdf] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');
      setUrlPdf('');

      const { data, error } = await supabase.rpc('sgf_obter_condicao_credito', { p_id: id });
      if (!ativo) return;

      if (error || !data?.condicao) {
        setErro(error?.message || 'Não foi possível carregar a condição de crédito.');
        setDados(null);
        setLoading(false);
        return;
      }

      setDados(data);

      const bucket = data.condicao.arquivo_storage_bucket;
      const path = data.condicao.arquivo_storage_path;
      if (bucket && path) {
        const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (ativo) setUrlPdf(signedData?.signedUrl || '');
      }

      if (ativo) setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [id]);

  const grupos = useMemo(() => {
    const itens = Array.isArray(dados?.itens) ? dados.itens : [];
    return {
      financeiros: itens.filter((item) => ['JUROS', 'MULTA', 'IMPOSTO'].includes(String(item.categoria).toUpperCase())),
      tarifas: itens.filter((item) => ['TARIFA_BANCARIA', 'TAXA_ADMINISTRATIVA', 'CUSTO_OPERACIONAL'].includes(String(item.categoria).toUpperCase())),
      demais: itens.filter((item) => !['JUROS', 'MULTA', 'IMPOSTO', 'TARIFA_BANCARIA', 'TAXA_ADMINISTRATIVA', 'CUSTO_OPERACIONAL'].includes(String(item.categoria).toUpperCase())),
    };
  }, [dados]);

  if (loading) {
    return <div className="page-content"><div className="user-form-card users-empty-cell">Carregando...</div></div>;
  }

  if (erro || !dados?.condicao) {
    return (
      <div className="page-content">
        <div className="users-error">{erro || 'Condição não encontrada.'}</div>
        <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/normas-credito/condicoes')}>
          <span aria-hidden="true">←</span><span>Voltar</span>
        </button>
      </div>
    );
  }

  const { condicao } = dados;
  const modalidades = Array.isArray(dados.modalidades) ? dados.modalidades : [];

  return (
    <div className="page-content norm-detail-page">
      <div className="users-page-title-row norm-detail-title-row">
        <div>
          <h1>{condicao.instituicao_nome}</h1>
          <p className="norms-page-subtitle">{condicao.instrumento_nome}</p>
        </div>

        <button
          type="button"
          className="standard-button button-outline-blue norm-edit-button"
          onClick={() => navigate(`/configuracao/normas-credito/condicoes/${id}/editar`)}
        >
          <Pencil size={16} strokeWidth={2} />
          Editar dados
        </button>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/normas-credito/condicoes')}>
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      <section className="norm-detail-card">
        <div className="norm-detail-card-header">
          <div>
            <h2>Contrato e instituição</h2>
            <p>Identificação da instituição financeira, instrumento, vigência e arquivo de referência.</p>
          </div>
          <span className={`status-badge ${classeSituacao(condicao.situacao)}`}>{rotuloSituacao(condicao.situacao)}</span>
        </div>

        <div className="norm-info-grid">
          <LinhaInfo label="Instituição" value={condicao.instituicao_nome} />
          <LinhaInfo label="Código do banco" value={condicao.banco_codigo} />
          <LinhaInfo label="Agência de referência" value={condicao.agencia_referencia} />
          <LinhaInfo label="Tipo do instrumento" value={formatarTextoApresentacao(condicao.tipo_instrumento)} />
          <LinhaInfo label="Instrumento" value={condicao.instrumento_nome} wide />
          <LinhaInfo label="Número" value={condicao.instrumento_numero} />
          <LinhaInfo label="Início da vigência" value={formatarData(condicao.vigencia_inicio)} />
          <LinhaInfo label="Fim da vigência" value={formatarData(condicao.vigencia_fim)} />
          <LinhaInfo label="Modalidades" value={modalidades.map((m) => m.nome).join(', ') || '—'} wide />
          <LinhaInfo label="Observações" value={condicao.observacoes} wide />
        </div>

        <div className="norm-document-row">
          <div>
            <span>Contrato / documento de referência</span>
            <strong>{condicao.arquivo_nome_original || 'PDF ainda não anexado'}</strong>
          </div>
          {urlPdf ? (
            <a className="norm-document-link" href={urlPdf} target="_blank" rel="noreferrer">
              Visualizar PDF <ExternalLink size={15} strokeWidth={2} />
            </a>
          ) : null}
        </div>
      </section>

      <section className="norm-detail-card">
        <div className="norm-detail-card-header">
          <div>
            <h2>Condições contratuais</h2>
            <p>Valores e regras vinculados ao contrato da instituição financeira, com histórico por vigência.</p>
          </div>
        </div>

        {(!grupos.financeiros.length && !grupos.tarifas.length && !grupos.demais.length) ? (
          <div className="norm-empty-block">Nenhuma condição contratual cadastrada.</div>
        ) : (
          <div className="credit-condition-groups">
            <GrupoItens titulo="Encargos financeiros" itens={grupos.financeiros} />
            <GrupoItens titulo="Tarifas e custos" itens={grupos.tarifas} />
            <GrupoItens titulo="Pagamento, garantias e demais condições" itens={grupos.demais} />
          </div>
        )}
      </section>
    </div>
  );
}
