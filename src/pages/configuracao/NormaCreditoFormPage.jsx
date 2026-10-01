import { FileText, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const BUCKET_NORMAS = 'sgf-normas';
const MAX_PDF_BYTES = 15 * 1024 * 1024;

const INICIAL = {
  tipoNorma: 'DECRETO',
  numero: '',
  ano: String(new Date().getFullYear()),
  ementa: '',
  enteEmissor: 'Município de São João da Barra',
  dataAssinatura: '',
  dataPublicacao: '',
  tipoPublicacao: '',
  veiculoPublicacao: '',
  edicaoPublicacao: '',
  paginaInicial: '',
  paginaFinal: '',
  inicioVigencia: '',
  fimVigencia: '',
  situacao: 'VIGENTE',
  observacaoPublicacao: '',
  observacoes: '',
};

function numeroOuNull(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function normaParaForm(norma) {
  return {
    tipoNorma: norma?.tipo_norma || 'DECRETO',
    numero: norma?.numero || '',
    ano: norma?.ano ? String(norma.ano) : '',
    ementa: norma?.ementa || '',
    enteEmissor: norma?.ente_emissor || 'Município de São João da Barra',
    dataAssinatura: norma?.data_assinatura || '',
    dataPublicacao: norma?.data_publicacao || '',
    tipoPublicacao: norma?.tipo_publicacao || '',
    veiculoPublicacao: norma?.veiculo_publicacao || '',
    edicaoPublicacao: norma?.edicao_publicacao || '',
    paginaInicial: norma?.pagina_inicial ?? '',
    paginaFinal: norma?.pagina_final ?? '',
    inicioVigencia: norma?.inicio_vigencia || '',
    fimVigencia: norma?.fim_vigencia || '',
    situacao: norma?.situacao || 'VIGENTE',
    observacaoPublicacao: norma?.observacao_publicacao || '',
    observacoes: norma?.observacoes || '',
  };
}

export default function NormaCreditoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(INICIAL);
  const [arquivoAtual, setArquivoAtual] = useState(null);
  const [novoArquivo, setNovoArquivo] = useState(null);
  const [loading, setLoading] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!editando) return;

    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const { data, error } = await supabase.rpc('sgf_obter_norma_credito', { p_id: id });
      if (!ativo) return;

      if (error || !data?.norma) {
        setErro(error?.message || 'Norma não encontrada.');
      } else {
        setForm(normaParaForm(data.norma));
        setArquivoAtual({
          nome: data.norma.arquivo_nome_original || '',
          bucket: data.norma.arquivo_storage_bucket || '',
          path: data.norma.arquivo_storage_path || '',
        });
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, id]);

  const podeSalvar = useMemo(() => (
    form.numero.trim().length > 0
    && Number(form.ano) >= 1900
    && Number(form.ano) <= 2200
    && form.tipoNorma.trim().length > 0
    && !salvando
    && !loading
  ), [form, salvando, loading]);

  function alterar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
    setErro('');
  }

  function selecionarPdf(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) {
      setErro('O arquivo da norma deve estar em PDF.');
      return;
    }

    if (arquivo.size > MAX_PDF_BYTES) {
      setErro('O PDF deve possuir no máximo 15 MB.');
      return;
    }

    setNovoArquivo(arquivo);
    setErro('');
  }

  async function anexarPdf(normaId, arquivo) {
    const path = `normas/${normaId}/norma.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NORMAS)
      .upload(path, arquivo, {
        upsert: true,
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    const { error: vinculoError } = await supabase.rpc('sgf_salvar_arquivo_norma', {
      p_id: normaId,
      p_bucket: BUCKET_NORMAS,
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

    const { data, error } = await supabase.rpc('sgf_salvar_norma_credito', {
      p_id: id || null,
      p_tipo_norma: form.tipoNorma,
      p_numero: form.numero.trim(),
      p_ano: Number(form.ano),
      p_ementa: form.ementa.trim() || null,
      p_ente_emissor: form.enteEmissor.trim() || null,
      p_data_assinatura: form.dataAssinatura || null,
      p_data_publicacao: form.dataPublicacao || null,
      p_tipo_publicacao: form.tipoPublicacao.trim() || null,
      p_veiculo_publicacao: form.veiculoPublicacao.trim() || null,
      p_edicao_publicacao: form.edicaoPublicacao.trim() || null,
      p_pagina_inicial: numeroOuNull(form.paginaInicial),
      p_pagina_final: numeroOuNull(form.paginaFinal),
      p_inicio_vigencia: form.inicioVigencia || null,
      p_fim_vigencia: form.fimVigencia || null,
      p_situacao: form.situacao,
      p_observacao_publicacao: form.observacaoPublicacao.trim() || null,
      p_observacoes: form.observacoes.trim() || null,
    });

    if (error || !data?.id) {
      setErro(error?.message || 'Não foi possível salvar a norma.');
      setSalvando(false);
      return;
    }

    if (novoArquivo) {
      try {
        await anexarPdf(data.id, novoArquivo);
      } catch (uploadError) {
        setErro(uploadError?.message || 'A norma foi salva, mas o PDF não pôde ser anexado.');
        setSalvando(false);
        return;
      }
    }

    navigate(`/configuracao/normas-credito/normas/${data.id}`);
  }

  const nomeArquivo = novoArquivo?.name || arquivoAtual?.nome || '';

  return (
    <div className="page-content norm-form-page">
      <div className="users-page-title-row">
        <h1>{editando ? 'Editar Norma' : 'Novo Decreto'}</h1>
      </div>

      <button
        type="button"
        className="configuration-back-link"
        onClick={() => navigate(editando ? `/configuracao/normas-credito/normas/${id}` : '/configuracao/normas-credito/normas')}
      >
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="norm-form-card" onSubmit={salvar}>
          <section className="norm-form-section">
            <div className="institutional-section-header">
              <h2>Identificação da norma</h2>
            </div>

            <div className="norm-form-grid">
              <label className="user-form-field norm-span-3">
                <span>Tipo</span>
                <select className="standard-select" name="tipoNorma" value={form.tipoNorma} onChange={alterar} disabled={salvando}>
                  <option value="DECRETO">Decreto</option>
                  <option value="RESOLUCAO">Resolução</option>
                  <option value="PORTARIA">Portaria</option>
                  <option value="LEI">Lei</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>

              <label className="user-form-field norm-span-3">
                <span>Número</span>
                <input className="standard-input" name="numero" value={form.numero} onChange={alterar} disabled={salvando} required />
              </label>

              <label className="user-form-field norm-span-2">
                <span>Ano</span>
                <input className="standard-input" type="number" min="1900" max="2200" name="ano" value={form.ano} onChange={alterar} disabled={salvando} required />
              </label>

              <label className="user-form-field norm-span-4">
                <span>Situação</span>
                <select className="standard-select" name="situacao" value={form.situacao} onChange={alterar} disabled={salvando}>
                  <option value="VIGENTE">Vigente</option>
                  <option value="FUTURA">Futura</option>
                  <option value="REVOGADA">Revogada</option>
                  <option value="PARCIALMENTE_REVOGADA">Parcialmente revogada</option>
                </select>
              </label>

              <label className="user-form-field norm-span-12">
                <span>Ementa</span>
                <textarea className="standard-input norm-textarea" name="ementa" value={form.ementa} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-12">
                <span>Ente emissor</span>
                <input className="standard-input" name="enteEmissor" value={form.enteEmissor} onChange={alterar} disabled={salvando} />
              </label>
            </div>
          </section>

          <section className="norm-form-section">
            <div className="institutional-section-header">
              <h2>Publicação e vigência</h2>
            </div>

            <div className="norm-form-grid">
              <label className="user-form-field norm-span-3">
                <span>Data da assinatura</span>
                <input className="standard-input" type="date" name="dataAssinatura" value={form.dataAssinatura} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-3">
                <span>Data da publicação</span>
                <input className="standard-input" type="date" name="dataPublicacao" value={form.dataPublicacao} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-3">
                <span>Início da vigência</span>
                <input className="standard-input" type="date" name="inicioVigencia" value={form.inicioVigencia} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-3">
                <span>Fim da vigência</span>
                <input className="standard-input" type="date" name="fimVigencia" value={form.fimVigencia} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-3">
                <span>Tipo da publicação</span>
                <input className="standard-input" name="tipoPublicacao" value={form.tipoPublicacao} onChange={alterar} disabled={salvando} placeholder="Ex.: Republicação" />
              </label>

              <label className="user-form-field norm-span-3">
                <span>Veículo</span>
                <input className="standard-input" name="veiculoPublicacao" value={form.veiculoPublicacao} onChange={alterar} disabled={salvando} placeholder="Ex.: Diário Oficial" />
              </label>

              <label className="user-form-field norm-span-2">
                <span>Edição</span>
                <input className="standard-input" name="edicaoPublicacao" value={form.edicaoPublicacao} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-2">
                <span>Página inicial</span>
                <input className="standard-input" type="number" min="1" name="paginaInicial" value={form.paginaInicial} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-2">
                <span>Página final</span>
                <input className="standard-input" type="number" min="1" name="paginaFinal" value={form.paginaFinal} onChange={alterar} disabled={salvando} />
              </label>

              <label className="user-form-field norm-span-12">
                <span>Observação da publicação</span>
                <input className="standard-input" name="observacaoPublicacao" value={form.observacaoPublicacao} onChange={alterar} disabled={salvando} />
              </label>
            </div>
          </section>

          <section className="norm-form-section">
            <div className="institutional-section-header">
              <h2>Arquivo da norma</h2>
            </div>

            <div className="norm-file-box">
              <div className="norm-file-icon" aria-hidden="true"><FileText size={24} strokeWidth={1.8} /></div>
              <div className="norm-file-copy">
                <strong>{nomeArquivo || 'Nenhum PDF selecionado'}</strong>
                <span>PDF da norma que ficará vinculado a este registro.</span>
              </div>

              <input
                ref={fileInputRef}
                className="institutional-logo-file-input"
                type="file"
                accept="application/pdf,.pdf"
                onChange={selecionarPdf}
              />

              <button
                type="button"
                className="standard-button button-outline-blue norm-file-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={salvando}
              >
                <Upload size={16} strokeWidth={2} />
                {nomeArquivo ? 'Trocar PDF' : 'Selecionar PDF'}
              </button>
            </div>
          </section>

          <section className="norm-form-section">
            <div className="institutional-section-header">
              <h2>Observações</h2>
            </div>

            <label className="user-form-field">
              <span>Observações internas</span>
              <textarea className="standard-input norm-textarea norm-textarea-large" name="observacoes" value={form.observacoes} onChange={alterar} disabled={salvando} />
            </label>
          </section>

          <div className="user-form-actions norm-form-actions">
            <button
              type="button"
              className="user-form-cancel-link"
              onClick={() => navigate(editando ? `/configuracao/normas-credito/normas/${id}` : '/configuracao/normas-credito/normas')}
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
