import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SOCIO_VAZIO = {
  nome: '',
  cpf: '',
  endereco: '',
};

const INICIAL = {
  tipo_pessoa: 'PJ',
  nome_razao_social: '',
  nome_fantasia: '',
  cpf_cnpj: '',
  consulta_cnpj_id: '',
  receita_consultado_em: '',
  situacao_cadastral_receita: '',
  data_abertura: '',
  cnae_principal_codigo: '',
  cnae_principal_descricao: '',
  cnaes_secundarios: [],
  natureza_juridica_codigo: '',
  natureza_juridica_descricao: '',
  porte_receita: '',
  simples_nacional: null,
  simei: null,
  qsa_receita: [],
  identidade: '',
  socios: [{ ...SOCIO_VAZIO }],
  categorias: [],
  categoria_outros_descricao: '',
  rgp: '',
  dap: '',
  caf: '',
  outro_registro: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  distrito_id: '',
  bairro: '',
  municipio: 'São João da Barra',
  uf: 'RJ',
  telefone: '',
  whatsapp: '',
  email: '',
  situacao: 'ATIVO',
  observacoes: '',
};

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function todosDigitosIguais(valor) {
  return /^(\d)\1+$/.test(valor);
}

function cpfValido(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || todosDigitosIguais(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i += 1) soma += Number(cpf[i]) * (10 - i);
  let digito1 = 11 - (soma % 11);
  if (digito1 >= 10) digito1 = 0;

  soma = 0;
  for (let i = 0; i < 10; i += 1) soma += Number(cpf[i]) * (11 - i);
  let digito2 = 11 - (soma % 11);
  if (digito2 >= 10) digito2 = 0;

  return Number(cpf[9]) === digito1 && Number(cpf[10]) === digito2;
}

function normalizarCNPJ(valor) {
  const bruto = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const base = bruto.slice(0, 12);
  const dv = bruto.slice(12).replace(/\D/g, '').slice(0, 2);
  return `${base}${dv}`.slice(0, 14);
}

function cnpjValido(valor) {
  const cnpj = normalizarCNPJ(valor);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const valorDV = (caractere) => caractere.charCodeAt(0) - 48;
  const calcular = (base, pesos) => {
    const soma = [...base].reduce((total, caractere, indice) => total + valorDV(caractere) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const base = cnpj.slice(0, 12);
  const d1 = calcular(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcular(`${base}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return Number(cnpj[12]) === d1 && Number(cnpj[13]) === d2;
}

function mascararCPF(valor) {
  return somenteDigitos(valor).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function mascararCNPJ(valor) {
  const cnpj = normalizarCNPJ(valor);
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
}

function mascararCEP(valor) {
  return somenteDigitos(valor).slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

function mascararTelefone(valor) {
  const digitos = somenteDigitos(valor).slice(0, 11);
  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function registroAtual(registros, tipo) {
  return registros.find((item) => item.ativo && item.tipo_registro === tipo)?.numero_registro || '';
}

function socioPreenchido(socio) {
  return Boolean(socio.nome.trim() || somenteDigitos(socio.cpf) || socio.endereco.trim());
}

export default function RequerenteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);

  const [form, setForm] = useState(INICIAL);
  const [categorias, setCategorias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro('');

      const [opcoesResult, requerenteResult] = await Promise.all([
        supabase.rpc('sgf_requerente_form_opcoes'),
        editando ? supabase.rpc('sgf_obter_requerente', { p_id: id }) : Promise.resolve({ data: null, error: null }),
      ]);

      if (!ativo) return;

      if (opcoesResult.error) {
        setErro(opcoesResult.error.message || 'Não foi possível carregar as categorias.');
        setLoading(false);
        return;
      }

      setCategorias(Array.isArray(opcoesResult.data?.categorias) ? opcoesResult.data.categorias : []);
      setDistritos(Array.isArray(opcoesResult.data?.distritos) ? opcoesResult.data.distritos : []);

      if (editando) {
        if (requerenteResult.error || !requerenteResult.data?.requerente) {
          setErro(requerenteResult.error?.message || 'Requerente não encontrado.');
          setLoading(false);
          return;
        }

        const r = requerenteResult.data.requerente;
        const categoriasAtuais = Array.isArray(requerenteResult.data.categorias) ? requerenteResult.data.categorias : [];
        const registros = Array.isArray(requerenteResult.data.registros) ? requerenteResult.data.registros : [];
        const sociosAtuais = Array.isArray(requerenteResult.data.socios) ? requerenteResult.data.socios : [];
        const outros = categoriasAtuais.find((item) => ['OUTRO', 'OUTROS'].includes(String(item.codigo || '').toUpperCase()));

        setForm({
          tipo_pessoa: r.tipo_pessoa || 'PJ',
          nome_razao_social: r.nome_razao_social || '',
          nome_fantasia: r.nome_fantasia || '',
          cpf_cnpj: r.tipo_pessoa === 'PJ' ? mascararCNPJ(r.cpf_cnpj) : mascararCPF(r.cpf_cnpj),
          consulta_cnpj_id: r.consulta_cnpj_id || '',
          receita_consultado_em: r.receita_consultado_em || '',
          situacao_cadastral_receita: r.situacao_cadastral_receita || '',
          data_abertura: r.data_abertura || '',
          cnae_principal_codigo: r.cnae_principal_codigo || '',
          cnae_principal_descricao: r.cnae_principal_descricao || '',
          cnaes_secundarios: Array.isArray(r.cnaes_secundarios) ? r.cnaes_secundarios : [],
          natureza_juridica_codigo: r.natureza_juridica_codigo || '',
          natureza_juridica_descricao: r.natureza_juridica_descricao || '',
          porte_receita: r.porte_receita || '',
          simples_nacional: typeof r.simples_nacional === 'boolean' ? r.simples_nacional : null,
          simei: typeof r.simei === 'boolean' ? r.simei : null,
          qsa_receita: Array.isArray(r.qsa_receita) ? r.qsa_receita : [],
          identidade: r.identidade || '',
          socios: r.tipo_pessoa === 'PJ'
            ? (sociosAtuais.length > 0
              ? sociosAtuais.map((socio) => ({
                nome: socio.nome || '',
                cpf: mascararCPF(socio.cpf),
                endereco: socio.endereco || '',
              }))
              : [{ ...SOCIO_VAZIO }])
            : [],
          categorias: categoriasAtuais.map((item) => item.categoria_id),
          categoria_outros_descricao: outros?.descricao_complementar || '',
          rgp: registroAtual(registros, 'RGP'),
          dap: registroAtual(registros, 'DAP'),
          caf: registroAtual(registros, 'CAF'),
          outro_registro: registroAtual(registros, 'OUTRO'),
          cep: mascararCEP(r.cep),
          logradouro: r.logradouro || '',
          numero: r.numero || '',
          complemento: r.complemento || '',
          distrito_id: r.distrito_id || '',
          bairro: r.bairro || '',
          municipio: r.municipio || 'São João da Barra',
          uf: r.uf || 'RJ',
          telefone: mascararTelefone(r.telefone),
          whatsapp: mascararTelefone(r.whatsapp),
          email: r.email || '',
          situacao: r.situacao || 'ATIVO',
          observacoes: r.observacoes || '',
        });
      }

      setLoading(false);
    }

    carregar();
    return () => { ativo = false; };
  }, [editando, id]);

  const categoriaOutros = useMemo(
    () => categorias.find((item) => ['OUTRO', 'OUTROS'].includes(String(item.codigo || '').toUpperCase())),
    [categorias],
  );

  const categoriaMei = useMemo(
    () => categorias.find((item) => {
      const codigo = String(item.codigo || '').toUpperCase();
      const nome = String(item.nome || '').toUpperCase();
      return codigo === 'MEI' || nome.includes('MICRO EMPREENDEDOR INDIVIDUAL');
    }),
    [categorias],
  );

  const documentoValido = form.tipo_pessoa === 'PJ'
    ? cnpjValido(form.cpf_cnpj)
    : cpfValido(form.cpf_cnpj);

  const sociosInformados = form.tipo_pessoa === 'PJ'
    ? form.socios.filter(socioPreenchido)
    : [];

  const sociosValidos = sociosInformados.every((socio) => (
    socio.nome.trim().length >= 2
    && cpfValido(socio.cpf)
    && socio.endereco.trim().length >= 3
  ));

  const cpfsSocios = sociosInformados.map((socio) => somenteDigitos(socio.cpf));
  const sociosSemDuplicidade = new Set(cpfsSocios).size === cpfsSocios.length;

  const podeSalvar = !loading
    && !salvando
    && form.nome_razao_social.trim().length >= 2
    && documentoValido
    && form.categorias.length > 0
    && sociosValidos
    && sociosSemDuplicidade;

  function alterar(event) {
    const { name, value } = event.target;

    setForm((atual) => {
      if (name === 'tipo_pessoa') {
        return {
          ...atual,
          tipo_pessoa: value,
          cpf_cnpj: value === 'PJ' ? mascararCNPJ(atual.cpf_cnpj) : mascararCPF(atual.cpf_cnpj),
          consulta_cnpj_id: '',
          receita_consultado_em: '',
          situacao_cadastral_receita: '',
          data_abertura: '',
          cnae_principal_codigo: '',
          cnae_principal_descricao: '',
          cnaes_secundarios: [],
          natureza_juridica_codigo: '',
          natureza_juridica_descricao: '',
          porte_receita: '',
          simples_nacional: null,
          simei: null,
          qsa_receita: [],
          socios: value === 'PJ'
            ? (atual.socios.length > 0 ? atual.socios : [{ ...SOCIO_VAZIO }])
            : [],
        };
      }

      if (name === 'cpf_cnpj') {
        const novoDocumento = atual.tipo_pessoa === 'PJ' ? mascararCNPJ(value) : mascararCPF(value);
        const documentoAlterado = atual.tipo_pessoa === 'PJ'
          ? normalizarCNPJ(novoDocumento) !== normalizarCNPJ(atual.cpf_cnpj)
          : somenteDigitos(novoDocumento) !== somenteDigitos(atual.cpf_cnpj);

        return {
          ...atual,
          cpf_cnpj: novoDocumento,
          ...(documentoAlterado ? {
            consulta_cnpj_id: '',
            receita_consultado_em: '',
            situacao_cadastral_receita: '',
            data_abertura: '',
            cnae_principal_codigo: '',
            cnae_principal_descricao: '',
            cnaes_secundarios: [],
            natureza_juridica_codigo: '',
            natureza_juridica_descricao: '',
            porte_receita: '',
            simples_nacional: null,
            simei: null,
            qsa_receita: [],
          } : {}),
        };
      }

      if (name === 'cep') return { ...atual, cep: mascararCEP(value) };
      if (name === 'telefone' || name === 'whatsapp') return { ...atual, [name]: mascararTelefone(value) };
      if (name === 'uf') return { ...atual, uf: value.toUpperCase().slice(0, 2) };
      return { ...atual, [name]: value };
    });

    setErro('');
    setAviso('');
  }

  function alterarSocio(indice, campo, valor) {
    setForm((atual) => ({
      ...atual,
      socios: atual.socios.map((socio, indiceAtual) => (
        indiceAtual === indice
          ? { ...socio, [campo]: campo === 'cpf' ? mascararCPF(valor) : valor }
          : socio
      )),
    }));
    setErro('');
  }

  function adicionarSocio() {
    setForm((atual) => ({ ...atual, socios: [...atual.socios, { ...SOCIO_VAZIO }] }));
  }

  function removerSocio(indice) {
    setForm((atual) => {
      const socios = atual.socios.filter((_, indiceAtual) => indiceAtual !== indice);
      return { ...atual, socios: socios.length > 0 ? socios : [{ ...SOCIO_VAZIO }] };
    });
    setErro('');
  }

  function alternarCategoria(categoriaId) {
    setForm((atual) => ({
      ...atual,
      categorias: atual.categorias.includes(categoriaId)
        ? atual.categorias.filter((idAtual) => idAtual !== categoriaId)
        : [...atual.categorias, categoriaId],
    }));
    setErro('');
  }

  async function consultarReceita() {
    if (form.tipo_pessoa !== 'PJ') return;

    const cnpj = normalizarCNPJ(form.cpf_cnpj);
    if (!cnpjValido(cnpj)) {
      setErro('Informe um CNPJ válido antes de consultar os dados cadastrais.');
      return;
    }

    setConsultandoCnpj(true);
    setErro('');
    setAviso('');

    const { data, error } = await supabase.functions.invoke('consultar-cnpj', {
      body: { cnpj },
    });

    if (error || !data?.ok || !data?.dados) {
      let mensagemErro = data?.message || error?.message || 'Não foi possível consultar os dados do CNPJ.';
      if (error?.context && typeof error.context.json === 'function') {
        try {
          const detalhe = await error.context.json();
          mensagemErro = detalhe?.message || mensagemErro;
        } catch {
          // Mantém a mensagem original quando a resposta não contém JSON.
        }
      }
      setErro(mensagemErro);
      setConsultandoCnpj(false);
      return;
    }

    const dados = data.dados;
    const sociosReceita = Array.isArray(dados.qsa) ? dados.qsa : [];
    const sociosComCpfValido = sociosReceita
      .map((socio) => ({
        nome: String(socio.nome || '').trim(),
        cpf: somenteDigitos(socio.cpf_cnpj),
        endereco: '',
      }))
      .filter((socio) => socio.nome && socio.cpf.length === 11 && cpfValido(socio.cpf));

    setForm((atual) => {
      const sociosAtuais = atual.socios.filter(socioPreenchido);
      const sociosPorCpf = new Map(sociosAtuais.map((socio) => [somenteDigitos(socio.cpf), socio]));

      sociosComCpfValido.forEach((socio) => {
        const existente = sociosPorCpf.get(socio.cpf);
        sociosPorCpf.set(socio.cpf, existente
          ? { ...existente, nome: socio.nome || existente.nome }
          : { ...socio, cpf: mascararCPF(socio.cpf) });
      });

      const sociosMesclados = [...sociosPorCpf.values()];
      const categoriasAtualizadas = [...atual.categorias];
      if (dados.simei === true && categoriaMei && !categoriasAtualizadas.includes(categoriaMei.id)) {
        categoriasAtualizadas.push(categoriaMei.id);
      }

      return {
        ...atual,
        cpf_cnpj: mascararCNPJ(dados.cnpj || cnpj),
        consulta_cnpj_id: data.consulta_id || '',
        receita_consultado_em: data.consultado_em || new Date().toISOString(),
        nome_razao_social: dados.nome_razao_social || atual.nome_razao_social,
        nome_fantasia: dados.nome_fantasia || '',
        cep: mascararCEP(dados.endereco?.cep || atual.cep),
        logradouro: dados.endereco?.logradouro || atual.logradouro,
        numero: dados.endereco?.numero || atual.numero,
        complemento: dados.endereco?.complemento || atual.complemento,
        bairro: dados.endereco?.bairro || atual.bairro,
        municipio: dados.endereco?.municipio || atual.municipio,
        uf: dados.endereco?.uf || atual.uf,
        telefone: mascararTelefone(dados.telefone || atual.telefone),
        whatsapp: atual.whatsapp || mascararTelefone(dados.telefone || ''),
        email: dados.email || atual.email,
        situacao_cadastral_receita: dados.situacao_cadastral || '',
        data_abertura: dados.data_abertura || '',
        cnae_principal_codigo: dados.cnae_principal?.codigo || '',
        cnae_principal_descricao: dados.cnae_principal?.descricao || '',
        cnaes_secundarios: Array.isArray(dados.cnaes_secundarios) ? dados.cnaes_secundarios : [],
        natureza_juridica_codigo: dados.natureza_juridica?.codigo || '',
        natureza_juridica_descricao: dados.natureza_juridica?.descricao || '',
        porte_receita: dados.porte || '',
        simples_nacional: typeof dados.simples_nacional === 'boolean' ? dados.simples_nacional : null,
        simei: typeof dados.simei === 'boolean' ? dados.simei : null,
        qsa_receita: sociosReceita,
        categorias: categoriasAtualizadas,
        socios: sociosMesclados.length > 0 ? sociosMesclados : atual.socios,
      };
    });

    const avisoQsa = String(data?.aviso_qsa || '').trim();
    setAviso(
      sociosComCpfValido.length > 0
        ? 'Dados cadastrais carregados. Confira o Distrito e complete o endereço dos sócios antes de salvar.'
        : avisoQsa || 'Dados cadastrais carregados. Confira o Distrito e os demais dados antes de salvar.',
    );
    setConsultandoCnpj(false);
  }

  async function salvar(event) {
    event.preventDefault();
    if (!podeSalvar) {
      if (!documentoValido) {
        setErro(`${form.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'} inválido.`);
      } else if (!sociosValidos) {
        setErro('Preencha nome, CPF válido e endereço para cada sócio informado.');
      } else if (!sociosSemDuplicidade) {
        setErro('O mesmo CPF não pode ser informado duas vezes entre os sócios deste Requerente.');
      }
      return;
    }

    setSalvando(true);
    setErro('');

    const registros = [
      ['RGP', form.rgp],
      ['DAP', form.dap],
      ['CAF', form.caf],
      ['OUTRO', form.outro_registro],
    ]
      .filter(([, numero]) => numero.trim())
      .map(([tipo_registro, numero_registro]) => ({ tipo_registro, numero_registro: numero_registro.trim() }));

    const socios = sociosInformados.map((socio) => ({
      nome: socio.nome.trim(),
      cpf: somenteDigitos(socio.cpf),
      endereco: socio.endereco.trim(),
    }));

    const { error } = await supabase.rpc('sgf_salvar_requerente_completo', {
      p_id: id || null,
      p_tipo_pessoa: form.tipo_pessoa,
      p_nome_razao_social: form.nome_razao_social.trim(),
      p_nome_fantasia: form.tipo_pessoa === 'PJ' ? (form.nome_fantasia.trim() || null) : null,
      p_cpf_cnpj: form.tipo_pessoa === 'PJ' ? normalizarCNPJ(form.cpf_cnpj) : somenteDigitos(form.cpf_cnpj),
      p_consulta_cnpj_id: form.tipo_pessoa === 'PJ' ? (form.consulta_cnpj_id || null) : null,
      p_identidade: form.tipo_pessoa === 'PF' ? (form.identidade.trim() || null) : null,
      p_cep: somenteDigitos(form.cep) || null,
      p_logradouro: form.logradouro.trim() || null,
      p_numero: form.numero.trim() || null,
      p_complemento: form.complemento.trim() || null,
      p_bairro: form.bairro.trim() || null,
      p_municipio: form.municipio.trim() || null,
      p_uf: form.uf.trim() || null,
      p_distrito_id: form.distrito_id || null,
      p_telefone: somenteDigitos(form.telefone) || null,
      p_whatsapp: somenteDigitos(form.whatsapp) || null,
      p_email: form.email.trim() || null,
      p_observacoes: form.observacoes.trim() || null,
      p_situacao: form.situacao,
      p_categoria_ids: form.categorias,
      p_categoria_outros_descricao: categoriaOutros && form.categorias.includes(categoriaOutros.id)
        ? (form.categoria_outros_descricao.trim() || null)
        : null,
      p_registros: registros,
      p_socios: socios,
    });

    if (error) {
      setErro(error.message || 'Não foi possível salvar o Requerente.');
      setSalvando(false);
      return;
    }

    navigate('/requerentes');
  }

  return (
    <div className="page-content user-form-page requerente-form-page">
      <div className="users-page-title-row">
        <div>
          <h1>{editando ? 'Editar Requerente' : 'Novo Requerente'}</h1>
          <p className="requerentes-page-subtitle">Cadastre os dados permanentes do Requerente. Dados do financiamento serão preenchidos na Proposta de Crédito.</p>
        </div>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/requerentes')}>
        <span aria-hidden="true">←</span><span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}
      {aviso ? <div className="requerente-success-notice">{aviso}</div> : null}

      {loading ? (
        <div className="user-form-card users-empty-cell">Carregando...</div>
      ) : (
        <form className="requerente-form-card" onSubmit={salvar}>
          <section className="requerente-form-section">
            <div className="requerente-section-header">
              <h2>Dados cadastrais</h2>
              <p>Identificação principal do Requerente.</p>
            </div>

            <div className="requerente-grid">
              <label className="user-form-field req-span-3">
                <span>Tipo de pessoa</span>
                <select className="standard-select" name="tipo_pessoa" value={form.tipo_pessoa} onChange={alterar} disabled={salvando}>
                  <option value="PJ">Pessoa Jurídica</option>
                  <option value="PF">Pessoa Física</option>
                </select>
              </label>

              <label className={`user-form-field ${form.tipo_pessoa === 'PJ' ? 'req-span-5' : 'req-span-3'}`}>
                <span>{form.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'}</span>
                {form.tipo_pessoa === 'PJ' ? (
                  <div className="requerente-cnpj-consulta-row">
                    <input className="standard-input" name="cpf_cnpj" value={form.cpf_cnpj} onChange={alterar} required disabled={salvando || consultandoCnpj} />
                    <button
                      type="button"
                      className="standard-button button-outline-blue requerente-consultar-cnpj"
                      onClick={consultarReceita}
                      disabled={salvando || consultandoCnpj || !documentoValido}
                    >
                      {consultandoCnpj ? 'Consultando...' : 'Consultar CNPJ'}
                    </button>
                  </div>
                ) : (
                  <input className="standard-input" name="cpf_cnpj" value={form.cpf_cnpj} onChange={alterar} required disabled={salvando} />
                )}
                {((form.tipo_pessoa === 'PJ' ? normalizarCNPJ(form.cpf_cnpj).length : somenteDigitos(form.cpf_cnpj).length) === (form.tipo_pessoa === 'PJ' ? 14 : 11)) && !documentoValido ? (
                  <small className="requerente-field-error">{form.tipo_pessoa === 'PJ' ? 'CNPJ' : 'CPF'} inválido.</small>
                ) : null}
              </label>

              {form.tipo_pessoa === 'PF' ? (
                <label className="user-form-field req-span-6">
                  <span>Identidade</span>
                  <input className="standard-input" name="identidade" value={form.identidade} onChange={alterar} disabled={salvando} />
                </label>
              ) : (
                <label className="user-form-field req-span-4">
                  <span>Nome Fantasia</span>
                  <input className="standard-input" name="nome_fantasia" value={form.nome_fantasia} onChange={alterar} disabled={salvando} />
                </label>
              )}

              <label className="user-form-field req-span-12">
                <span>{form.tipo_pessoa === 'PJ' ? 'Razão Social' : 'Nome completo'}</span>
                <input className="standard-input" name="nome_razao_social" value={form.nome_razao_social} onChange={alterar} required disabled={salvando} />
              </label>
            </div>

            {form.tipo_pessoa === 'PJ' && form.consulta_cnpj_id ? (
              <div className="requerente-receita-subcard">
                <div className="requerente-receita-header">
                  <div>
                    <h3>Dados cadastrais do CNPJ</h3>
                    <p>Consulta pela API pública CNPJ.ws{form.receita_consultado_em ? ` em ${new Date(form.receita_consultado_em).toLocaleString('pt-BR')}` : ''}. Os dados podem ter defasagem em relação à Receita Federal.</p>
                  </div>
                  <span className="requerente-receita-badge">Fonte: CNPJ.ws</span>
                </div>

                <div className="requerente-receita-grid">
                  <div><strong>Situação cadastral</strong><span>{form.situacao_cadastral_receita || '—'}</span></div>
                  <div><strong>Data de abertura</strong><span>{form.data_abertura ? new Date(`${form.data_abertura}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</span></div>
                  <div><strong>Porte</strong><span>{form.porte_receita || '—'}</span></div>
                  <div><strong>Simples Nacional</strong><span>{form.simples_nacional === null ? '—' : (form.simples_nacional ? 'Sim' : 'Não')}</span></div>
                  <div><strong>MEI / SIMEI</strong><span>{form.simei === null ? '—' : (form.simei ? 'Sim' : 'Não')}</span></div>
                  <div className="requerente-receita-wide"><strong>Natureza jurídica</strong><span>{[form.natureza_juridica_codigo, form.natureza_juridica_descricao].filter(Boolean).join(' - ') || '—'}</span></div>
                  <div className="requerente-receita-wide"><strong>Ramo de atividade (CNAE principal)</strong><span>{[form.cnae_principal_codigo, form.cnae_principal_descricao].filter(Boolean).join(' - ') || '—'}</span></div>
                </div>

                {form.cnaes_secundarios.length > 0 ? (
                  <details className="requerente-cnaes-secundarios">
                    <summary>Atividades secundárias ({form.cnaes_secundarios.length})</summary>
                    <div>
                      {form.cnaes_secundarios.map((cnae, indice) => (
                        <p key={`${cnae.codigo || 'cnae'}-${indice}`}>{[cnae.codigo, cnae.descricao].filter(Boolean).join(' - ')}</p>
                      ))}
                    </div>
                  </details>
                ) : null}

                {form.qsa_receita.length > 0 ? (
                  <details className="requerente-cnaes-secundarios">
                    <summary>Quadro de Sócios e Administradores retornado ({form.qsa_receita.length})</summary>
                    <div>
                      {form.qsa_receita.map((socio, indice) => (
                        <p key={`${socio.cpf_cnpj || socio.nome || 'qsa'}-${indice}`}>{[socio.nome, socio.qualificacao, socio.cpf_cnpj].filter(Boolean).join(' · ')}</p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}

            {form.tipo_pessoa === 'PJ' ? (
              <div className="requerente-socios-subcard">
                <div className="requerente-section-header requerente-socios-header">
                  <div>
                    <h3>Sócios</h3>
                    <p>Informe nome, CPF e endereço dos sócios da Pessoa Jurídica.</p>
                  </div>
                  <button type="button" className="standard-button button-outline-blue requerente-add-socio" onClick={adicionarSocio} disabled={salvando}>
                    + Adicionar sócio
                  </button>
                </div>

                <div className="requerente-socios-list">
                  {form.socios.map((socio, indice) => {
                    const temCpfCompleto = somenteDigitos(socio.cpf).length === 11;
                    const cpfSocioValido = !temCpfCompleto || cpfValido(socio.cpf);

                    return (
                      <div className="requerente-socio-row" key={`socio-${indice}`}>
                        <label className="user-form-field requerente-socio-nome">
                          <span>Nome do sócio</span>
                          <input className="standard-input" value={socio.nome} onChange={(event) => alterarSocio(indice, 'nome', event.target.value)} disabled={salvando} />
                        </label>

                        <label className="user-form-field requerente-socio-cpf">
                          <span>CPF</span>
                          <input className="standard-input" value={socio.cpf} onChange={(event) => alterarSocio(indice, 'cpf', event.target.value)} disabled={salvando} />
                          {!cpfSocioValido ? <small className="requerente-field-error">CPF inválido.</small> : null}
                        </label>

                        <label className="user-form-field requerente-socio-endereco">
                          <span>Endereço</span>
                          <input className="standard-input" value={socio.endereco} onChange={(event) => alterarSocio(indice, 'endereco', event.target.value)} disabled={salvando} />
                        </label>

                        <button type="button" className="requerente-remove-socio" onClick={() => removerSocio(indice)} disabled={salvando}>
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section className="requerente-form-section">
            <div className="requerente-section-header">
              <h2>Categoria do Requerente</h2>
              <p>Selecione uma ou mais categorias aplicáveis.</p>
            </div>

            <div className="requerente-category-grid">
              {categorias.map((categoria) => (
                <label className={`requerente-category-option${form.categorias.includes(categoria.id) ? ' is-selected' : ''}`} key={categoria.id}>
                  <input
                    type="checkbox"
                    checked={form.categorias.includes(categoria.id)}
                    onChange={() => alternarCategoria(categoria.id)}
                    disabled={salvando}
                  />
                  <span>{categoria.nome}</span>
                </label>
              ))}
            </div>

            {categoriaOutros && form.categorias.includes(categoriaOutros.id) ? (
              <label className="user-form-field requerente-outros-field">
                <span>Descrição da categoria Outros</span>
                <input className="standard-input" name="categoria_outros_descricao" value={form.categoria_outros_descricao} onChange={alterar} disabled={salvando} />
              </label>
            ) : null}
          </section>

          <section className="requerente-form-section">
            <div className="requerente-section-header">
              <h2>Registros e cadastros</h2>
              <p>Preencha somente os registros que se aplicarem ao Requerente.</p>
            </div>

            <div className="requerente-grid">
              <label className="user-form-field req-span-3"><span>RGP</span><input className="standard-input" name="rgp" value={form.rgp} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-3"><span>DAP</span><input className="standard-input" name="dap" value={form.dap} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-3"><span>CAF</span><input className="standard-input" name="caf" value={form.caf} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-3"><span>Outro registro</span><input className="standard-input" name="outro_registro" value={form.outro_registro} onChange={alterar} disabled={salvando} /></label>
            </div>
          </section>

          <section className="requerente-form-section">
            <div className="requerente-section-header"><h2>Endereço</h2><p>Endereço principal do Requerente.</p></div>
            <div className="requerente-grid">
              <label className="user-form-field req-span-2"><span>CEP</span><input className="standard-input" name="cep" value={form.cep} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-6"><span>Logradouro</span><input className="standard-input" name="logradouro" value={form.logradouro} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-2"><span>Número</span><input className="standard-input" name="numero" value={form.numero} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-2"><span>Complemento</span><input className="standard-input" name="complemento" value={form.complemento} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-3">
                <span>Distrito</span>
                <select className="standard-select" name="distrito_id" value={form.distrito_id} onChange={alterar} disabled={salvando}>
                  <option value="">Selecione...</option>
                  {distritos.map((distrito) => (
                    <option value={distrito.id} key={distrito.id}>
                      {distrito.numero}º Distrito - {distrito.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="user-form-field req-span-4"><span>Bairro / Localidade</span><input className="standard-input" name="bairro" value={form.bairro} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-3"><span>Município</span><input className="standard-input" name="municipio" value={form.municipio} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-2"><span>UF</span><input className="standard-input" name="uf" value={form.uf} onChange={alterar} maxLength={2} disabled={salvando} /></label>
            </div>
          </section>

          <section className="requerente-form-section">
            <div className="requerente-section-header"><h2>Contato e situação</h2><p>Dados de contato e situação atual do cadastro.</p></div>
            <div className="requerente-grid">
              <label className="user-form-field req-span-3"><span>Telefone</span><input className="standard-input" name="telefone" value={form.telefone} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-3"><span>WhatsApp</span><input className="standard-input" name="whatsapp" value={form.whatsapp} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-4"><span>E-mail</span><input className="standard-input" type="email" name="email" value={form.email} onChange={alterar} disabled={salvando} /></label>
              <label className="user-form-field req-span-2">
                <span>Situação</span>
                <select className="standard-select" name="situacao" value={form.situacao} onChange={alterar} disabled={salvando}>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </label>
            </div>
          </section>

          <section className="requerente-form-section requerente-last-section">
            <div className="requerente-section-header"><h2>Observações</h2><p>Informações complementares do cadastro.</p></div>
            <label className="user-form-field requerente-observacoes-full">
              <textarea className="standard-input requerente-textarea requerente-textarea-full" name="observacoes" value={form.observacoes} onChange={alterar} disabled={salvando} />
            </label>
          </section>

          <div className="user-form-actions requerente-form-actions">
            <button type="button" className="user-form-cancel-link" onClick={() => navigate('/requerentes')} disabled={salvando}>Cancelar</button>
            <button type="submit" className="standard-button" disabled={!podeSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
