import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export default function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="screen-center"><div className="spinner" /><span>Carregando...</span></div>;
  }

  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
