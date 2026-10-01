import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function AlterarSenhaPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas informadas não são iguais.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setMessage('Senha alterada com sucesso.');
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content narrow-page">
      <div className="page-header-row">
        <div><h1>Alterar senha</h1><p>Atualize a senha utilizada para acessar o sistema.</p></div>
        <button className="secondary-button" onClick={() => navigate(-1)}>Voltar</button>
      </div>
      <section className="content-card form-card">
        {message && <div className="alert-success">{message}</div>}
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label><span>Nova senha</span><div className="field-with-icon password-field"><Lock size={19} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <label><span>Confirmar nova senha</span><div className="field-with-icon"><Lock size={19} /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div></label>
          <div className="form-actions"><button className="primary-button" disabled={loading}>{loading ? 'Salvando...' : 'Salvar nova senha'}</button></div>
        </form>
      </section>
    </div>
  );
}
