import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();
  const codigoPerfil = String(user?.perfilCodigo || '').toUpperCase();
  const master = codigoPerfil === 'MASTER' || codigoPerfil === 'ADMINISTRADOR';
  const secretario = codigoPerfil === 'SECRETARIO';
  const permissoes = Array.isArray(user?.permissoes) ? user.permissoes.map((item) => String(item).toLowerCase()) : [];
  const podeConsultar = master || secretario || permissoes.includes('consultar');

  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" onClick={onClose} aria-label="Fechar menu" />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          <NavLink to="/" end onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span>Dashboard</span>
          </NavLink>

          {podeConsultar ? (
            <>
              <NavLink to="/requerentes" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span>Requerentes</span>
              </NavLink>
              <NavLink to="/propostas" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span>Propostas</span>
              </NavLink>
              <NavLink to="/contratos" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span>Contratos</span>
              </NavLink>
              <NavLink to="/financeiro" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span>Financeiro</span>
              </NavLink>
            </>
          ) : null}

          {master ? (
            <NavLink to="/configuracao" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>Configuração</span>
            </NavLink>
          ) : null}
        </nav>
      </aside>
    </>
  );
}
