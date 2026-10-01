import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const FORM_INICIAL = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  representanteNome: '',
  representanteCargo: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  uf: 'RJ',
  telefone: '',
  whatsapp: '',
  email: '',
  cabecalhoDocumento: '',
  rodapeDocumento: '',
  ativo: 'true',
};

const LOGO_BUCKET = 'sgf-institucional';
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_MIMES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function urlPublicaLogo(bucket, path) {
  if (!bucket || !path) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
}

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarCnpj(valor) {
  const numeros = somenteDigitos(valor).slice(0, 14);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
  if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
  if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
}

function formatarCep(valor) {
  const numeros = somenteDigitos(valor).slice(0, 8);
  if (numeros.length <= 5) return numeros;
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
}

function formatarTelefone(valor) {
  const numeros = somenteDigitos(valor).slice(0, 11);
  if (!numeros) return '';
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function normalizarResposta(data) {
  if (!data) return FORM_INICIAL;

  return {
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    cnpj: formatarCnpj(data.cnpj || ''),
    representanteNome: data.representante_nome || '',
    representanteCargo: data.representante_cargo || '',
    cep: formatarCep(data.cep || ''),
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: String(data.uf || 'RJ').toUpperCase(),
    telefone: formatarTelefone(data.telefone || ''),
    whatsapp: formatarTelefone(data.whatsapp || ''),
    email: data.email || '',
    cabecalhoDocumento: data.cabecalho_documento || '',
    rodapeDocumento: data.rodape_documento || '',
    ativo: data.ativo === false ? 'false' : 'true',
  };
}

export default function CadastroInstitucionalPage() {
  const navigate = useNavigate();
  const logoEsquerdaInputRef = useRef(null);
  const logoDireitaInputRef = useRef(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [logoEsquerda, setLogoEsquerda] = useState({ bucket: '', path: '', url: '' });
  const [logoDireita, setLogoDireita] = useState({ bucket: '', path: '', url: '' });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoLogo, setSalvandoLogo] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const [cadastroResult, logoDireitaResult] = await Promise.all([
        supabase.rpc('sgf_obter_configuracao_institucional'),
        supabase.rpc('sgf_obter_logo_institucional_direita'),
      ]);

      if (!ativo) return;

      if (cadastroResult.error) {
        setErro(cadastroResult.error.message || 'Não foi possível carregar o Cadastro Institucional.');
      } else {
        const data = cadastroResult.data;
        setForm(normalizarResposta(data));
        setLogoEsquerda({
          bucket: data?.logo_bucket || '',
          path: data?.logo_path || '',
          url: urlPublicaLogo(data?.logo_bucket, data?.logo_path),
        });
      }

      if (logoDireitaResult.error) {
        setErro((atual) => atual || logoDireitaResult.error.message || 'Não foi possível carregar a logo direita.');
      } else {
        const dataDireita = logoDireitaResult.data;
        setLogoDireita({
          bucket: dataDireita?.logo_direita_bucket || '',
          path: dataDireita?.logo_direita_path || '',
          url: urlPublicaLogo(dataDireita?.logo_direita_bucket, dataDireita?.logo_direita_path),
        });
      }

      setLoading(false);
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  const podeSalvar = useMemo(() => (
    form.razaoSocial.trim().length >= 3
    && somenteDigitos(form.cnpj).length === 14
    && form.logradouro.trim().length >= 2
    && form.numero.trim().length > 0
    && form.bairro.trim().length >= 2
    && form.municipio.trim().length >= 2
    && form.uf.trim().length === 2
    && somenteDigitos(form.cep).length === 8
    && !salvando
    && !loading
  ), [form, salvando, loading]);

  function alterarCampo(event) {
    const { name, value } = event.target;
    let proximoValor = value;

    if (name === 'cnpj') proximoValor = formatarCnpj(value);
    if (name === 'cep') proximoValor = formatarCep(value);
    if (name === 'telefone' || name === 'whatsapp') proximoValor = formatarTelefone(value);
    if (name === 'uf') proximoValor = value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();

    setForm((atual) => ({ ...atual, [name]: proximoValor }));
    setErro('');
    setSucesso('');
  }

  async function salvar(event) {
    event.preventDefault();
    if (!podeSalvar) return;

    setSalvando(true);
    setErro('');
    setSucesso('');

    const { data, error } = await supabase.rpc('sgf_salvar_configuracao_institucional', {
      p_razao_social: form.razaoSocial.trim(),
      p_nome_fantasia: form.nomeFantasia.trim() || null,
      p_cnpj: somenteDigitos(form.cnpj),
      p_representante_nome: form.representanteNome.trim() || null,
      p_representante_cargo: form.representanteCargo.trim() || null,
      p_cep: somenteDigitos(form.cep),
      p_logradouro: form.logradouro.trim(),
      p_numero: form.numero.trim(),
      p_complemento: form.complemento.trim() || null,
      p_bairro: form.bairro.trim(),
      p_municipio: form.municipio.trim(),
      p_uf: form.uf.trim().toUpperCase(),
      p_telefone: somenteDigitos(form.telefone) || null,
      p_whatsapp: somenteDigitos(form.whatsapp) || null,
      p_email: form.email.trim().toLowerCase() || null,
      p_cabecalho_documento: form.cabecalhoDocumento.trim() || null,
      p_rodape_documento: form.rodapeDocumento.trim() || null,
      p_ativo: form.ativo === 'true',
    });

    if (error) {
      setErro(error.message || 'Não foi possível salvar o Cadastro Institucional.');
      setSalvando(false);
      return;
    }

    setForm(normalizarResposta(data));
    setSucesso('Cadastro Institucional salvo com sucesso.');
    setSalvando(false);
  }

  async function enviarLogo(event, lado) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    const extensao = LOGO_MIMES[arquivo.type];
    if (!extensao) {
      setErro('Formato da logo inválido. Utilize PNG, JPG ou WebP.');
      return;
    }

    if (arquivo.size > LOGO_MAX_BYTES) {
      setErro('A logo deve possuir no máximo 2 MB.');
      return;
    }

    setSalvandoLogo(true);
    setErro('');
    setSucesso('');

    const direita = lado === 'DIREITA';
    const logoAtual = direita ? logoDireita : logoEsquerda;
    const novoPath = direita
      ? `fundessan/logo-institucional-direita.${extensao}`
      : `fundessan/logo-institucional-esquerda.${extensao}`;

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(novoPath, arquivo, {
        upsert: true,
        contentType: arquivo.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      setErro(uploadError.message || 'Não foi possível enviar a logo.');
      setSalvandoLogo(false);
      return;
    }

    const rpcNome = direita
      ? 'sgf_salvar_logo_institucional_direita'
      : 'sgf_salvar_logo_institucional';

    const rpcParametros = direita
      ? { p_logo_direita_bucket: LOGO_BUCKET, p_logo_direita_path: novoPath }
      : { p_logo_bucket: LOGO_BUCKET, p_logo_path: novoPath };

    const { data, error: rpcError } = await supabase.rpc(rpcNome, rpcParametros);

    if (rpcError) {
      await supabase.storage.from(LOGO_BUCKET).remove([novoPath]);
      setErro(rpcError.message || 'A logo foi enviada, mas não pôde ser vinculada ao Cadastro Institucional.');
      setSalvandoLogo(false);
      return;
    }

    if (logoAtual.bucket === LOGO_BUCKET && logoAtual.path && logoAtual.path !== novoPath) {
      await supabase.storage.from(LOGO_BUCKET).remove([logoAtual.path]);
    }

    if (direita) {
      setLogoDireita({
        bucket: data?.logo_direita_bucket || LOGO_BUCKET,
        path: data?.logo_direita_path || novoPath,
        url: urlPublicaLogo(data?.logo_direita_bucket || LOGO_BUCKET, data?.logo_direita_path || novoPath),
      });
      setSucesso('Logo direita das impressões salva com sucesso.');
    } else {
      setLogoEsquerda({
        bucket: data?.logo_bucket || LOGO_BUCKET,
        path: data?.logo_path || novoPath,
        url: urlPublicaLogo(data?.logo_bucket || LOGO_BUCKET, data?.logo_path || novoPath),
      });
      setSucesso('Logo esquerda das impressões salva com sucesso.');
    }

    setSalvandoLogo(false);
  }

  async function removerLogo(lado) {
    if (salvandoLogo) return;

    const direita = lado === 'DIREITA';
    const logoAtual = direita ? logoDireita : logoEsquerda;
    if (!logoAtual.path) return;

    setSalvandoLogo(true);
    setErro('');
    setSucesso('');

    const rpcNome = direita
      ? 'sgf_salvar_logo_institucional_direita'
      : 'sgf_salvar_logo_institucional';

    const rpcParametros = direita
      ? { p_logo_direita_bucket: null, p_logo_direita_path: null }
      : { p_logo_bucket: null, p_logo_path: null };

    const { data, error } = await supabase.rpc(rpcNome, rpcParametros);

    if (error) {
      setErro(error.message || 'Não foi possível remover a logo institucional.');
      setSalvandoLogo(false);
      return;
    }

    if (logoAtual.bucket && logoAtual.path) {
      await supabase.storage.from(logoAtual.bucket).remove([logoAtual.path]);
    }

    if (direita) {
      setLogoDireita({
        bucket: data?.logo_direita_bucket || '',
        path: data?.logo_direita_path || '',
        url: '',
      });
      setSucesso('Logo direita das impressões removida.');
    } else {
      setLogoEsquerda({
        bucket: data?.logo_bucket || '',
        path: data?.logo_path || '',
        url: '',
      });
      setSucesso('Logo esquerda das impressões removida.');
    }

    setSalvandoLogo(false);
  }

  return (
    <div className="page-content institutional-page">
      <div className="users-page-title-row">
        <h1>Cadastro Institucional</h1>
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
      {sucesso ? <div className="institutional-success">{sucesso}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="institutional-form-card" onSubmit={salvar}>
          <section className="institutional-section">
            <div className="institutional-section-header">
              <h2>Dados institucionais</h2>
            </div>

            <div className="institutional-grid">
              <label className="user-form-field institutional-span-8">
                <span>Razão Social</span>
                <input
                  className="standard-input"
                  name="razaoSocial"
                  value={form.razaoSocial}
                  onChange={alterarCampo}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-4">
                <span>Nome Fantasia</span>
                <input
                  className="standard-input"
                  name="nomeFantasia"
                  value={form.nomeFantasia}
                  onChange={alterarCampo}
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-4">
                <span>CNPJ</span>
                <input
                  className="standard-input"
                  name="cnpj"
                  value={form.cnpj}
                  onChange={alterarCampo}
                  inputMode="numeric"
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-4">
                <span>Representante</span>
                <input
                  className="standard-input"
                  name="representanteNome"
                  value={form.representanteNome}
                  onChange={alterarCampo}
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-4">
                <span>Cargo do Representante</span>
                <input
                  className="standard-input"
                  name="representanteCargo"
                  value={form.representanteCargo}
                  onChange={alterarCampo}
                  disabled={salvando}
                />
              </label>
            </div>
          </section>

          <section className="institutional-section">
            <div className="institutional-section-header">
              <h2>Endereço</h2>
            </div>

            <div className="institutional-grid">
              <label className="user-form-field institutional-span-3">
                <span>CEP</span>
                <input
                  className="standard-input"
                  name="cep"
                  value={form.cep}
                  onChange={alterarCampo}
                  inputMode="numeric"
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-6">
                <span>Logradouro</span>
                <input
                  className="standard-input"
                  name="logradouro"
                  value={form.logradouro}
                  onChange={alterarCampo}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-3">
                <span>Número</span>
                <input
                  className="standard-input"
                  name="numero"
                  value={form.numero}
                  onChange={alterarCampo}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-4">
                <span>Complemento</span>
                <input
                  className="standard-input"
                  name="complemento"
                  value={form.complemento}
                  onChange={alterarCampo}
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-3">
                <span>Bairro</span>
                <input
                  className="standard-input"
                  name="bairro"
                  value={form.bairro}
                  onChange={alterarCampo}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-4">
                <span>Município</span>
                <input
                  className="standard-input"
                  name="municipio"
                  value={form.municipio}
                  onChange={alterarCampo}
                  required
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-1">
                <span>UF</span>
                <input
                  className="standard-input institutional-uf-input"
                  name="uf"
                  value={form.uf}
                  onChange={alterarCampo}
                  maxLength={2}
                  required
                  disabled={salvando}
                />
              </label>
            </div>
          </section>

          <section className="institutional-section">
            <div className="institutional-section-header">
              <h2>Contato</h2>
            </div>

            <div className="institutional-grid">
              <label className="user-form-field institutional-span-3">
                <span>Telefone</span>
                <input
                  className="standard-input"
                  name="telefone"
                  value={form.telefone}
                  onChange={alterarCampo}
                  inputMode="tel"
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-3">
                <span>WhatsApp</span>
                <input
                  className="standard-input"
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={alterarCampo}
                  inputMode="tel"
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-4">
                <span>E-mail</span>
                <input
                  className="standard-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={alterarCampo}
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-2">
                <span>Situação</span>
                <select
                  className="standard-select"
                  name="ativo"
                  value={form.ativo}
                  onChange={alterarCampo}
                  disabled={salvando}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
            </div>
          </section>

          <section className="institutional-section">
            <div className="institutional-section-header">
              <h2>Logos das impressões</h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 20,
                alignItems: 'stretch',
              }}
            >
              <div
                className="institutional-logo-row"
                style={{
                  margin: 0,
                  padding: 18,
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <div className="institutional-logo-preview">
                  {logoEsquerda.url ? (
                    <img src={logoEsquerda.url} alt="Logo esquerda das impressões" />
                  ) : (
                    <div className="institutional-logo-empty">Nenhuma logo cadastrada</div>
                  )}
                </div>

                <div className="institutional-logo-content">
                  <strong>Logo esquerda</strong>
                  <p>Será posicionada no extremo esquerdo do cabeçalho das impressões. Utilize PNG, JPG ou WebP com até 2 MB.</p>

                  <input
                    ref={logoEsquerdaInputRef}
                    className="institutional-logo-file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => enviarLogo(event, 'ESQUERDA')}
                    disabled={salvandoLogo || salvando}
                  />

                  <div className="institutional-logo-actions">
                    <button
                      type="button"
                      className="standard-button"
                      onClick={() => logoEsquerdaInputRef.current?.click()}
                      disabled={salvandoLogo || salvando}
                    >
                      {salvandoLogo ? 'Enviando...' : logoEsquerda.url ? 'Trocar logo' : 'Selecionar logo'}
                    </button>

                    {logoEsquerda.url ? (
                      <button
                        type="button"
                        className="user-form-cancel-link"
                        onClick={() => removerLogo('ESQUERDA')}
                        disabled={salvandoLogo || salvando}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                className="institutional-logo-row"
                style={{
                  margin: 0,
                  padding: 18,
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <div className="institutional-logo-preview">
                  {logoDireita.url ? (
                    <img src={logoDireita.url} alt="Logo direita das impressões" />
                  ) : (
                    <div className="institutional-logo-empty">Nenhuma logo cadastrada</div>
                  )}
                </div>

                <div className="institutional-logo-content">
                  <strong>Logo direita</strong>
                  <p>Será posicionada no extremo direito do cabeçalho das impressões. Utilize PNG, JPG ou WebP com até 2 MB.</p>

                  <input
                    ref={logoDireitaInputRef}
                    className="institutional-logo-file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => enviarLogo(event, 'DIREITA')}
                    disabled={salvandoLogo || salvando}
                  />

                  <div className="institutional-logo-actions">
                    <button
                      type="button"
                      className="standard-button"
                      onClick={() => logoDireitaInputRef.current?.click()}
                      disabled={salvandoLogo || salvando}
                    >
                      {salvandoLogo ? 'Enviando...' : logoDireita.url ? 'Trocar logo' : 'Selecionar logo'}
                    </button>

                    {logoDireita.url ? (
                      <button
                        type="button"
                        className="user-form-cancel-link"
                        onClick={() => removerLogo('DIREITA')}
                        disabled={salvandoLogo || salvando}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="institutional-section">
            <div className="institutional-section-header">
              <h2>Documentos emitidos pelo sistema</h2>
            </div>

            <div className="institutional-grid">
              <label className="user-form-field institutional-span-6">
                <span>Cabeçalho adicional</span>
                <textarea
                  className="standard-textarea institutional-textarea"
                  name="cabecalhoDocumento"
                  value={form.cabecalhoDocumento}
                  onChange={alterarCampo}
                  rows={4}
                  disabled={salvando}
                />
              </label>

              <label className="user-form-field institutional-span-6">
                <span>Rodapé adicional</span>
                <textarea
                  className="standard-textarea institutional-textarea"
                  name="rodapeDocumento"
                  value={form.rodapeDocumento}
                  onChange={alterarCampo}
                  rows={4}
                  disabled={salvando}
                />
              </label>
            </div>
          </section>

          <div className="user-form-actions institutional-form-actions">
            <button
              type="button"
              className="user-form-cancel-link"
              onClick={() => navigate('/configuracao')}
              disabled={salvando}
            >
              Cancelar
            </button>

            <button type="submit" className="standard-button save" disabled={!podeSalvar}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
