import { FileText } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StandardActionButtons from '../components/standard/StandardActionButtons';
import { supabase } from '../lib/supabase';

function formatarMoeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDocumento(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor || '—';
}

function formatarData(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data);
}

function formatarCarencia(valor) {
  const meses = Number(valor);
  if (!Number.isInteger(meses) || meses < 0) return '—';
  if (meses === 0) return 'Sem carência';
  return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

export default function ContratosPage() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    const { data, error } = await supabase.rpc('sgf_listar_fila_contratos');

    if (error) {
      setErro(error.message || 'Não foi possível carregar as Propostas liberadas para Contratos.');
      setRegistros([]);
    } else {
      setRegistros(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return registros;

    return registros.filter((item) => [
      item.numero_processo,
      item.requerente_nome,
      item.requerente_documento,
    ].some((valor) => String(valor || '').toLowerCase().includes(termo)));
  }, [busca, registros]);

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row">
        <div>
          <h1>Contratos</h1>
          <p className="requerentes-page-subtitle">
            Propostas aprovadas pelo Banco e pelo Conselho, liberadas diretamente para elaboração do Contrato.
          </p>
        </div>
      </div>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="requerentes-filters-row contract-filter-row">
        <label className="user-form-field">
          <span>Pesquisar</span>
          <input
            className="standard-input"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Processo, requerente ou CPF/CNPJ"
          />
        </label>
      </div>

      <div className="users-table-card">
        <div className="users-table-scroll">
          <table className="users-table contract-queue-table">
            <thead>
              <tr>
                <th className="users-actions-col">Ações</th>
                <th>Nº do Processo</th>
                <th>Requerente</th>
                <th>CPF / CNPJ</th>
                <th>Valor</th>
                <th>Carência</th>
                <th>Aprovada Conselho em</th>
                <th>Etapa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="users-empty-cell">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan="8" className="users-empty-cell">Nenhuma Proposta aguardando elaboração de Contrato.</td></tr>
              ) : (
                filtrados.map((item) => (
                  <tr key={item.proposta_id}>
                    <td className="users-actions-cell">
                      <StandardActionButtons
                        actions={[
                          {
                            key: 'abrir-proposta',
                            title: 'Abrir Proposta',
                            ariaLabel: `Abrir Proposta do processo ${item.numero_processo || ''}`,
                            icon: FileText,
                            onClick: () => navigate(`/propostas/${item.proposta_id}/editar`),
                          },
                        ]}
                      />
                    </td>
                    <td><strong>{item.numero_processo || '—'}</strong></td>
                    <td>{item.requerente_nome || '—'}</td>
                    <td>{formatarDocumento(item.requerente_documento)}</td>
                    <td className="contract-number-cell">{formatarMoeda(item.valor_proposta)}</td>
                    <td>{formatarCarencia(item.carencia_meses)}</td>
                    <td>{formatarData(item.aprovada_conselho_em)}</td>
                    <td><span className="status-badge is-active">Aguardando elaboração</span></td>
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
