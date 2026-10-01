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

function tituloNorma(norma) {
  const tipo = String(norma?.tipo_norma || 'Norma').toLowerCase();
  const tipoFormatado = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  return `${tipoFormatado} nº ${norma?.numero || '—'}/${norma?.ano || '—'}`;
}

function rotuloSituacao(valor) {
  const mapa = {
    VIGENTE: 'Vigente',
    FUTURA: 'Futura',
    REVOGADA: 'Revogada',
    PARCIALMENTE_REVOGADA: 'Parcialmente revogada',
  };
  return mapa[String(valor || '').toUpperCase()] || valor || '—';
}

function formatarTextoApresentacao(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';

  const texto = String(valor).trim();
  if (!texto) return '—';

  const apenasLetras = texto.replace(/[^A-Za-zÀ-ÿ]+/g, '');
  const pareceMaiusculo = apenasLetras && apenasLetras === apenasLetras.toUpperCase();

  if (!pareceMaiusculo) return texto;

  const excecoes = new Set(['IOF', 'FGTS', 'CNPJ', 'CPF', 'MEI', 'PIX']);

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

function rotuloUnidadeCarencia(valor) {
  const unidade = String(valor || '').toUpperCase();
  if (unidade === 'DIAS') return 'dias';
  if (unidade === 'MESES') return 'meses';
  return unidade.toLowerCase() || '';
}

function formatarValorEncargo(encargo) {
  const tipo = String(encargo.tipo_calculo || '').toUpperCase();

  if (tipo === 'ISENTO') return 'Isento';
  if (tipo === 'TEXTO') return formatarTextoApresentacao(encargo.unidade || encargo.valor_texto || '—');
  if (encargo.valor === null || encargo.valor === undefined) return formatarTextoApresentacao(encargo.unidade || '—');

  if (tipo.startsWith('PERCENTUAL')) {
    const sufixo = tipo === 'PERCENTUAL_ANUAL' ? ' a.a.' : tipo === 'PERCENTUAL_MENSAL' ? ' a.m.' : '';
    return `${formatarNumero(encargo.valor, 2)}%${sufixo}`;
  }

  if (['VALOR_FIXO', 'POR_PARCELA', 'MENSAL'].includes(tipo)) {
    const sufixo = encargo.unidade ? ` · ${encargo.unidade}` : '';
    return `${formatarMoeda(encargo.valor)}${sufixo}`;
  }

  return encargo.unidade ? `${formatarNumero(encargo.valor, 2)} ${formatarTextoApresentacao(encargo.unidade)}` : formatarNumero(encargo.valor, 2);
}

function formatarRegra(regra) {
  if (regra.valor_booleano !== null && regra.valor_booleano !== undefined) return regra.valor_booleano ? 'Sim' : 'Não';
  if (regra.valor_numerico !== null && regra.valor_numerico !== undefined) {
    return `${formatarNumero(regra.valor_numerico, 2)}${regra.unidade ? ` ${regra.unidade}` : ''}`;
  }
  return regra.valor_texto || '—';
}

function LinhaInfo({ label, value, wide = false }) {
  return (
    <div className={`norm-info-item${wide ? ' is-wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

export default function NormaCreditoDetalhePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const { data, error } = await supabase.rpc('sgf_obter_norma_credito', { p_id: id });
      if (!ativo) return;

      if (error || !data?.norma) {
        setErro(error?.message || 'Não foi possível carregar a norma.');
        setDados(null);
      } else {
        setDados(data);
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [id]);

  const urlPdf = useMemo(() => {
    const bucket = dados?.norma?.arquivo_storage_bucket;
    const path = dados?.norma?.arquivo_storage_path;
    if (!bucket || !path) return '';
    return supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl || '';
  }, [dados]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="user-form-card users-empty-cell">Carregando...</div>
      </div>
    );
  }

  if (erro || !dados?.norma) {
    return (
      <div className="page-content">
        <div className="users-error">{erro || 'Norma não encontrada.'}</div>
        <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/normas-credito/normas')}>
          <span aria-hidden="true">←</span><span>Voltar</span>
        </button>
      </div>
    );
  }

  const { norma } = dados;
  const parametros = Array.isArray(dados.parametros) ? dados.parametros : [];
  const prazos = Array.isArray(dados.prazos) ? dados.prazos : [];
  const regras = Array.isArray(dados.regras) ? dados.regras : [];

  return (
    <div className="page-content norm-detail-page">
      <div className="users-page-title-row norm-detail-title-row">
        <div>
          <h1>{tituloNorma(norma)}</h1>
          <p className="norms-page-subtitle">Dados da norma, modalidades, limites, faixas, carência, cronograma e regras normativas.</p>
        </div>

        <button
          type="button"
          className="standard-button button-outline-blue norm-edit-button"
          onClick={() => navigate(`/configuracao/normas-credito/normas/${id}/editar`)}
        >
          <Pencil size={16} strokeWidth={2} />
          Editar dados
        </button>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/normas-credito/normas')}>
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      <section className="norm-detail-card">
        <div className="norm-detail-card-header">
          <div>
            <h2>Dados da norma</h2>
            <p>Identificação, publicação, vigência e documento oficial.</p>
          </div>
          <span className={`status-badge ${String(norma.situacao).toUpperCase() === 'VIGENTE' ? 'is-active' : String(norma.situacao).toUpperCase() === 'FUTURA' ? 'is-future' : 'is-inactive'}`}>
            {rotuloSituacao(norma.situacao)}
          </span>
        </div>

        <div className="norm-info-grid">
          <LinhaInfo label="Tipo" value={norma.tipo_norma} />
          <LinhaInfo label="Número/Ano" value={`${norma.numero}/${norma.ano}`} />
          <LinhaInfo label="Assinatura" value={formatarData(norma.data_assinatura)} />
          <LinhaInfo label="Publicação" value={formatarData(norma.data_publicacao)} />
          <LinhaInfo label="Início da vigência" value={formatarData(norma.inicio_vigencia)} />
          <LinhaInfo label="Fim da vigência" value={formatarData(norma.fim_vigencia)} />
          <LinhaInfo label="Veículo" value={norma.veiculo_publicacao} />
          <LinhaInfo label="Edição" value={norma.edicao_publicacao} />
          <LinhaInfo label="Ente emissor" value={norma.ente_emissor} wide />
          <LinhaInfo label="Ementa" value={norma.ementa} wide />
        </div>

        <div className="norm-document-row">
          <div>
            <span>Arquivo oficial</span>
            <strong>{norma.arquivo_nome_original || 'PDF ainda não anexado'}</strong>
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
            <h2>Modalidades e limites</h2>
            <p>Enquadramento e limites definidos para cada modalidade vinculada à norma.</p>
          </div>
        </div>

        {parametros.length === 0 ? (
          <div className="norm-empty-block">Nenhuma modalidade vinculada a esta norma.</div>
        ) : (
          <div className="norm-modalities-grid">
            {parametros.map((parametro) => (
              <article className="norm-modality-card" key={parametro.id}>
                <div className="norm-modality-title">
                  <h3>{parametro.modalidade_nome || parametro.nome}</h3>
                  <span>{parametro.referencia_legal || 'Sem referência legal informada'}</span>
                </div>

                <div className="norm-mini-grid">
                  <LinhaInfo label="Crédito mínimo" value={formatarMoeda(parametro.valor_financiamento_minimo)} />
                  <LinhaInfo label="Crédito máximo" value={formatarMoeda(parametro.valor_financiamento_maximo)} />
                  <LinhaInfo label="Faturamento mínimo" value={formatarMoeda(parametro.faturamento_anual_minimo)} />
                  <LinhaInfo label="Faturamento máximo" value={formatarMoeda(parametro.faturamento_anual_maximo)} />
                </div>

                {parametro.criterio_enquadramento ? (
                  <div className="norm-note"><strong>Enquadramento:</strong> {parametro.criterio_enquadramento}</div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="norm-detail-card">
        <div className="norm-detail-card-header">
          <div>
            <h2>Prazos e cronograma</h2>
            <p>Regras de carência e quantidade de parcelas. Os valores das parcelas serão calculados em outro módulo.</p>
          </div>
        </div>

        {parametros.every((parametro) => !Array.isArray(parametro.faixas) || parametro.faixas.length === 0) ? (
          <div className="norm-empty-block">Nenhuma faixa de cronograma cadastrada.</div>
        ) : (
          parametros.map((parametro) => (
            Array.isArray(parametro.faixas) && parametro.faixas.length > 0 ? (
              <div className="norm-schedule-group" key={parametro.id}>
                <h3>{parametro.modalidade_nome || parametro.nome}</h3>
                <div className="users-table-card norm-inner-table-card">
                  <div className="users-table-scroll">
                    <table className="users-table norm-schedule-table">
                      <thead>
                        <tr>
                          <th>Faixa</th>
                          <th>Valor mínimo</th>
                          <th>Valor máximo</th>
                          <th>Carência</th>
                          <th>Parcelas</th>
                          <th>Periodicidade</th>
                          <th>Primeiro vencimento</th>
                          <th>Base legal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parametro.faixas.map((faixa) => (
                          <tr key={faixa.id}>
                            <td>{faixa.nome || `Faixa ${faixa.ordem}`}</td>
                            <td>{formatarMoeda(faixa.valor_minimo)}</td>
                            <td>{formatarMoeda(faixa.valor_maximo)}</td>
                            <td>{faixa.carencia_quantidade} {rotuloUnidadeCarencia(faixa.carencia_unidade)}</td>
                            <td>{faixa.numero_parcelas}</td>
                            <td>{faixa.periodicidade_parcelas || 'Mensal'}</td>
                            <td>{faixa.regra_primeiro_vencimento || 'Após a carência'}</td>
                            <td>{faixa.referencia_legal || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null
          ))
        )}
      </section>

      <section className="norm-detail-card">
        <div className="norm-detail-card-header">
          <div>
            <h2>Prazos normativos e regras gerais</h2>
            <p>Prazos e regras registrados diretamente a partir da norma.</p>
          </div>
        </div>

        <div className="norm-two-columns">
          <div>
            <h3 className="norm-subsection-title">Prazos</h3>
            {prazos.length === 0 ? (
              <div className="norm-empty-block">Nenhum prazo normativo cadastrado.</div>
            ) : (
              <div className="norm-list-stack">
                {prazos.map((prazo) => (
                  <div className="norm-list-row" key={prazo.id}>
                    <div>
                      <strong>{prazo.nome}</strong>
                      <span>{prazo.referencia_legal}</span>
                    </div>
                    <b>{prazo.prazo_quantidade} {rotuloUnidadeCarencia(prazo.prazo_unidade)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="norm-subsection-title">Regras</h3>
            {regras.length === 0 ? (
              <div className="norm-empty-block">Nenhuma regra normativa cadastrada.</div>
            ) : (
              <div className="norm-list-stack">
                {regras.map((regra) => (
                  <div className="norm-list-row" key={regra.id}>
                    <div>
                      <strong>{regra.nome}</strong>
                      <span>{regra.referencia_legal}</span>
                    </div>
                    <b>{formatarRegra(regra)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
