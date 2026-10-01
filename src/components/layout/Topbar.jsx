import { ChevronDown, KeyRound, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { getLogo, getLogoAlt } from '../../assets/marca/Logos';

export default function Topbar({ onMenu }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <button className="mobile-menu-button" onClick={onMenu} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
        <button className="brand-logo-button" onClick={() => navigate('/')} title="Dashboard">
          <img src={getLogo('interna')} alt={getLogoAlt('interna')} className="topbar-logo" />
        </button>
        <div className="system-name">Gestão Fundessan</div>
      </div>

      <div className="user-menu-wrap">
        <button className="user-menu-button" onClick={() => setOpen((value) => !value)}>
          <div className="user-menu-text">
            <strong>{user?.nome || user?.email || 'Usuário'}</strong>
            <span>{user?.perfil || 'Administrador'}</span>
          </div>
          <ChevronDown size={17} />
        </button>

        {open && (
          <div className="user-dropdown">
            <div className="user-dropdown-head">
              <strong>{user?.nome || 'Usuário'}</strong>
              <span>{user?.email}</span>
            </div>
            <button onClick={() => { setOpen(false); navigate('/alterar-senha'); }}>
              <KeyRound size={17} /> Alterar senha
            </button>
            <button className="danger" onClick={handleLogout}>
              <LogOut size={17} /> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
