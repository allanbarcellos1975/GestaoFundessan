import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { getLogo, getLogoAlt } from '../../assets/marca/Logos';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { requestPasswordReset } = useAuth();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await requestPasswordReset(email.trim());
      setMessage('Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.');
    } catch {
      setError('Não foi possível solicitar a recuperação agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="login-card">
        <div className="login-header">
          <img src={getLogo('login')} alt={getLogoAlt('login')} className="login-logo" />
          <h1>Recuperar senha</h1>
          <p>Informe o e-mail do seu acesso</p>
        </div>
        {message && <div className="alert-success">{message}</div>}
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>E-mail</span>
            <div className="field-with-icon">
              <Mail size={19} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
          </label>
          <button className="primary-button login-button" disabled={loading}>{loading ? 'Enviando...' : 'Enviar instruções'}</button>
          <Link to="/login" className="back-link"><ArrowLeft size={17} /> Voltar para o login</Link>
        </form>
      </section>
    </div>
  );
}
