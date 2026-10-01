import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { getLogo, getLogoAlt } from '../../assets/marca/Logos';

const REMEMBER_KEY = 'fundessan_remember_email';
const EMAIL_KEY = 'fundessan_saved_email';

function getLoginErrorMessage(error) {
  const message = String(error?.message || '').trim();

  if (!message) {
    return 'Não foi possível concluir o login. O sistema não recebeu detalhes do erro.';
  }

  if (message.startsWith('SUPABASE_AUTH:')) {
    return `Falha na autenticação do Supabase — ${message.replace('SUPABASE_AUTH:', '').trim()}`;
  }

  if (message.startsWith('SGF_ME:')) {
    return `O Supabase aceitou o login, mas o Sistema Gestão Fundessan falhou ao carregar o usuário — ${message.replace('SGF_ME:', '').trim()}`;
  }

  if (message.startsWith('SGF_AUTORIZACAO:')) {
    return `O Supabase aceitou o login, mas o usuário não foi autorizado pelo Sistema Gestão Fundessan — ${message.replace('SGF_AUTORIZACAO:', '').trim()}`;
  }

  if (message.startsWith('SGF_REGISTRAR_ACESSO:')) {
    return `O Supabase aceitou o login e o usuário foi autorizado, mas houve falha ao registrar o acesso — ${message.replace('SGF_REGISTRAR_ACESSO:', '').trim()}`;
  }

  return `Falha no login — ${message}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY) === 'true';
    setRemember(saved);
    if (saved) setEmail(localStorage.getItem(EMAIL_KEY) || '');
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError('Preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);

    try {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, 'true');
        localStorage.setItem(EMAIL_KEY, normalizedEmail);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(EMAIL_KEY);
      }

      await signIn({ email: normalizedEmail, password });
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      console.error('Diagnóstico do login Fundessan:', err);
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="login-card">
        <div className="login-header">
          <img src={getLogo('login')} alt={getLogoAlt('login')} className="login-logo" />
          <h1>Acesso ao Sistema</h1>
          <p>Insira suas credenciais para continuar</p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>E-mail</span>
            <div className="field-with-icon">
              <Mail size={19} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </label>

          <label>
            <span>Senha</span>
            <div className="field-with-icon password-field">
              <Lock size={19} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label="Mostrar ou ocultar senha"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="login-options">
            <label className="check-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              <span>Lembrar-me</span>
            </label>
            <Link to="/recuperar-senha">Esqueci minha senha</Link>
          </div>

          <button className="primary-button login-button" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  );
}
