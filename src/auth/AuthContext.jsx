import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

function normalizeProfile(payload, authUser) {
  const usuario = payload?.usuario ?? {};
  const perfil = payload?.perfil ?? {};

  return {
    id: usuario.id ?? null,
    authUserId: authUser?.id ?? usuario.auth_user_id ?? null,
    nome: usuario.nome ?? authUser?.user_metadata?.full_name ?? authUser?.email ?? 'Usuário',
    email: usuario.email ?? authUser?.email ?? '',
    cargo: usuario.cargo ?? '',
    perfil: perfil.nome ?? perfil.codigo ?? '',
    perfilCodigo: perfil.codigo ?? '',
    permissoes: Array.isArray(payload?.permissoes) ? payload.permissoes : [],
  };
}

function buildStageError(stage, error, fallbackMessage) {
  const originalMessage = String(error?.message || fallbackMessage || 'Erro desconhecido.');
  const code = error?.code ? ` | código: ${error.code}` : '';
  const status = error?.status ? ` | HTTP: ${error.status}` : '';
  const stagedError = new Error(`${stage}: ${originalMessage}${code}${status}`);
  stagedError.stage = stage;
  stagedError.originalError = error;
  return stagedError;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAuthorizedUser = useCallback(async (currentSession, registerAccess = false) => {
    if (!currentSession?.user) {
      setUser(null);
      return null;
    }

    const { data, error } = await supabase.rpc('sgf_me');
    if (error) {
      throw buildStageError('SGF_ME', error, 'Falha ao consultar o usuário autorizado.');
    }

    if (!data?.autorizado) {
      throw new Error(`SGF_AUTORIZACAO: ${data?.motivo || 'ACESSO_NAO_AUTORIZADO'}`);
    }

    if (registerAccess) {
      const { error: accessError } = await supabase.rpc('sgf_registrar_acesso', {
        p_user_agent: navigator.userAgent,
      });

      if (accessError) {
        throw buildStageError('SGF_REGISTRAR_ACESSO', accessError, 'Falha ao registrar o acesso.');
      }
    }

    const normalized = normalizeProfile(data, currentSession.user);
    setUser(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        setSession(data.session);

        if (data.session) {
          try {
            await loadAuthorizedUser(data.session, false);
          } catch (errorProfile) {
            console.error('Falha ao restaurar sessão autorizada:', errorProfile);
            await supabase.auth.signOut();
            if (mounted) {
              setSession(null);
              setUser(null);
            }
          }
        }
      } catch (errorSession) {
        console.error('Falha ao inicializar autenticação:', errorSession);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) setUser(null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAuthorizedUser]);

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw buildStageError('SUPABASE_AUTH', error, 'Falha na autenticação.');
    }

    if (!data?.session || !data?.user) {
      throw new Error('SUPABASE_AUTH: autenticação retornou sem sessão ou usuário.');
    }

    try {
      const authorizedUser = await loadAuthorizedUser(data.session, true);
      setSession(data.session);
      return authorizedUser;
    } catch (errorProfile) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      throw errorProfile;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
  }

  async function requestPasswordReset(email) {
    const redirectTo = `${window.location.origin}/alterar-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  const value = useMemo(() => ({
    session,
    user,
    loading,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    isAuthenticated: Boolean(session && user),
  }), [session, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
