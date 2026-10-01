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

export default function CondicoesCreditoPage() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    const { data, error } = await supabase.rpc('sgf_listar_condicoes_credito');

    if (error) {
      setErro(error.message || 'Não foi possível carregar as condições de crédito.');
      setRegistros([]);
    } else {
      setRegistros(Array.isArray(data) ? data : []);
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
          <h1>Condições de Crédito</h1>
          <p className="norms-page-subtitle">Contratos e condições vigentes com instituições financeiras, preservando o histórico de cada versão.</p>
        </div>

        <button
          type="button"
          className="standard-button users-new-button norms-new-button"
          onClick={() => navigate('/configuracao/normas-credito/condicoes/novo')}
        >
          + Nova Condição
        </button>
      </div>

      <button type="button" className="configuration-back-link" onClick={() => navigate('/configuracao/normas-credito')}>
        <span aria-hidden="true">←</span>
        <span>Voltar</span>
      </button>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table credit-conditions-table">
            <thead>
              <tr>
                <th className="norms-actions-col">Ações</th>
                <th>Instituição</th>
                <th>Instrumento</th>
                <th>Vigência</th>
                <th>Modalidades</th>
                <th>Arquivo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="users-empty-cell">Carregando...</td></tr>
              ) : registros.length === 0 ? (
                <tr><td colSpan="7" className="users-empty-cell">Nenhuma condição de crédito cadastrada.</td></tr>
              ) : (
                registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="users-actions-cell norms-actions-cell">
                      <StandardActionButtons
                        actions={[
                          {
                            key: 'view',
                            title: 'Visualizar',
                            ariaLabel: `Visualizar ${registro.instituicao_nome}`,
                            icon: Eye,
                            onClick: () => navigate(`/configuracao/normas-credito/condicoes/${registro.id}`),
                          },
                          {
                            key: 'edit',
                            title: 'Editar',
                            ariaLabel: `Editar ${registro.instituicao_nome}`,
                            icon: Pencil,
                            onClick: () => navigate(`/configuracao/normas-credito/condicoes/${registro.id}/editar`),
                          },
                        ]}
                      />
                    </td>
                    <td>
                      <strong className="norms-table-title">{registro.instituicao_nome}</strong>
                      <span className="norms-table-secondary">{registro.banco_codigo ? `Banco ${registro.banco_codigo}` : 'Instituição financeira'}</span>
                    </td>
                    <td>
                      <strong className="norms-table-title">{registro.instrumento_nome}</strong>
                      <span className="norms-table-secondary">{registro.instrumento_numero || 'Sem número informado'}</span>
                    </td>
                    <td>
                      {registro.vigencia_inicio || registro.vigencia_fim
                        ? `${formatarData(registro.vigencia_inicio)} até ${formatarData(registro.vigencia_fim)}`
                        : 'Não definida'}
                    </td>
                    <td>{registro.modalidades || '—'}</td>
                    <td>{registro.arquivo_nome_original || 'Não anexado'}</td>
                    <td>
                      <span className={`status-badge ${classeSituacao(registro.situacao)}`}>
                        {rotuloSituacao(registro.situacao)}
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
