import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export default function ProtectedRoute({ children, masterOnly = false }) {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="screen-center"><div className="spinner" /><span>Carregando...</span></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const codigoPerfil = String(user?.perfilCodigo || '').toUpperCase();
  const master = codigoPerfil === 'MASTER' || codigoPerfil === 'ADMINISTRADOR';

  if (masterOnly && !master) {
    return <Navigate to="/" replace />;
  }

  return children;
}
