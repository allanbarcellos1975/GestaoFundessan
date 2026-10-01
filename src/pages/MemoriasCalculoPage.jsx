import { Calculator } from 'lucide-react';
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

function formatarCarencia(meses) {
  const numero = Number(meses);
  if (!Number.isInteger(numero) || numero < 0) return '—';
  if (numero === 0) return 'Sem carência';
  return `${numero} ${numero === 1 ? 'mês' : 'meses'}`;
}

export default function MemoriasCalculoPage() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase.rpc('sgf_listar_memorias_calculo');
    if (error) {
      setErro(error.message || 'Não foi possível carregar o Financeiro.');
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
      item.memoria_status,
    ].some((valor) => String(valor || '').toLowerCase().includes(termo)));
  }, [busca, registros]);

  return (
    <div className="page-content admin-page">
      <div className="users-page-title-row">
        <div>
          <h1>Financeiro</h1>
          <p className="requerentes-page-subtitle">
            Cronograma financeiro dos contratos, com carência, prestações e acompanhamento dos pagamentos.
          </p>
        </div>
      </div>

      {erro ? <div className="users-error">{erro}</div> : null}

      <div className="requerentes-filters-row memory-filter-row">
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
          <table className="users-table memory-table">
            <thead>
              <tr>
                <th className="users-actions-col">Ações</th>
                <th>Nº do Processo</th>
                <th>Requerente</th>
                <th>CPF / CNPJ</th>
                <th>Valor</th>
                <th>Situação da Proposta</th>
                <th>Financeiro</th>
                <th>Carência</th>
                <th>Qtd. Prestações</th>
                <th>Prestação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="users-empty-cell">Carregando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan="10" className="users-empty-cell">Nenhum registro disponível no Financeiro.</td></tr>
              ) : (
                filtrados.map((item) => (
                  <tr key={item.proposta_id}>
                    <td className="users-actions-cell">
                      <StandardActionButtons
                        actions={[
                          {
                            key: 'calculo',
                            title: item.memoria_id ? 'Abrir Financeiro' : 'Gerar Financeiro',
                            ariaLabel: `Financeiro do processo ${item.numero_processo || ''}`,
                            icon: Calculator,
                            onClick: () => navigate(`/financeiro/${item.proposta_id}`),
                            disabled: !item.apta_memoria && !item.memoria_id,
                          },

                        ].filter(Boolean)}
                      />
                    </td>
                    <td><strong>{item.numero_processo || '—'}</strong></td>
                    <td>{item.requerente_nome || '—'}</td>
                    <td>{formatarDocumento(item.requerente_documento)}</td>
                    <td className="memory-number-cell">{formatarMoeda(item.valor_proposta)}</td>
                    <td><span className="proposal-status-badge is-success">{item.status_proposta_nome || item.status_proposta_codigo || '—'}</span></td>
                    <td>
                      <span className={`status-badge ${item.memoria_status === 'FINALIZADA' ? 'is-active' : 'is-inactive'}`}>
                        {item.memoria_status === 'FINALIZADA' ? 'Confirmada' : item.memoria_status === 'RASCUNHO' ? 'Rascunho' : 'Pendente'}
                      </span>
                    </td>
                    <td>{formatarCarencia(item.carencia_meses)}</td>
                    <td className="memory-number-cell">{item.quantidade_parcelas ?? '—'}</td>
                    <td className="memory-number-cell">{item.valor_parcela ? formatarMoeda(item.valor_parcela) : '—'}</td>
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
