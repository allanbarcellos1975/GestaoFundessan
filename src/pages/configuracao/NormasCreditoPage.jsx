import { Eye, Pencil } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardActionButtons from '../../components/standard/StandardActionButtons';
import { supabase } from '../../lib/supabase';

function formatarData(valor) {
  if (!valor) return '—';
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
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

function classeSituacao(valor) {
  const situacao = String(valor || '').toUpperCase();
  if (situacao === 'VIGENTE') return 'is-active';
  if (situacao === 'FUTURA') return 'is-future';
  if (situacao === 'PARCIALMENTE_REVOGADA') return 'is-warning';
  return 'is-inactive';
}

function tituloNorma(norma) {
  const tipo = String(norma.tipo_norma || 'Norma').toLowerCase();
  const tipoFormatado = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  return `${tipoFormatado} nº ${norma.numero}/${norma.ano}`;
}

export default function NormasCreditoPage() {
  const navigate = useNavigate();
  const [normas, setNormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    const { data, error } = await supabase.rpc('sgf_listar_normas_credito');

    if (error) {
      setErro(error.message || 'Não foi possível carregar as normas de crédito.');
      setNormas([]);
    } else {
      setNormas(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row">
        <div>
          <h1>Normas</h1>
          <p className="norms-page-subtitle">Decretos, resoluções e demais atos que definem limites, faixas, carência, cronograma e regras do FUNDESSAN.</p>
        </div>

        <button
          type="button"
          className="standard-button users-new-button norms-new-button"
          onClick={() => navigate('/configuracao/normas-credito/normas/novo')}
        >
          + Novo Decreto
        </button>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/normas-credito')}>
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table norms-table">
            <thead>
              <tr>
                <th className="norms-actions-col">Ações</th>
                <th>Norma</th>
                <th>Publicação</th>
                <th>Vigência</th>
                <th>Modalidades</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="users-empty-cell">Carregando...</td></tr>
              ) : normas.length === 0 ? (
                <tr><td colSpan="6" className="users-empty-cell">Nenhuma norma cadastrada.</td></tr>
              ) : (
                normas.map((norma) => (
                  <tr key={norma.id}>
                    <td className="users-actions-cell norms-actions-cell">
                      <StandardActionButtons
                        actions={[
                          {
                            key: 'view',
                            title: 'Visualizar',
                            ariaLabel: `Visualizar ${tituloNorma(norma)}`,
                            icon: Eye,
                            onClick: () => navigate(`/configuracao/normas-credito/normas/${norma.id}`),
                          },
                          {
                            key: 'edit',
                            title: 'Editar',
                            ariaLabel: `Editar ${tituloNorma(norma)}`,
                            icon: Pencil,
                            onClick: () => navigate(`/configuracao/normas-credito/normas/${norma.id}/editar`),
                          },
                        ]}
                      />
                    </td>
                    <td>
                      <strong className="norms-table-title">{tituloNorma(norma)}</strong>
                      <span className="norms-table-secondary">{norma.ente_emissor || 'Município de São João da Barra'}</span>
                    </td>
                    <td>{formatarData(norma.data_publicacao)}</td>
                    <td>
                      {norma.inicio_vigencia || norma.fim_vigencia
                        ? `${formatarData(norma.inicio_vigencia)} até ${formatarData(norma.fim_vigencia)}`
                        : 'Não definida'}
                    </td>
                    <td>{norma.modalidades || '—'}</td>
                    <td>
                      <span className={`status-badge ${classeSituacao(norma.situacao)}`}>
                        {rotuloSituacao(norma.situacao)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
