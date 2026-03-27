import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDemoSession,
  sendDemoPasswordReset,
  setDemoSessionByEmail,
  signInDemo,
  signOutDemo,
  signUpDemo,
  updateDemoPassword,
  updateDemoPasswordForCurrentUser,
  verifyDemoOtp,
} from './demoAuth';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { AuthContext } from './AuthHooks';

async function getLiveUserRole(user) {
  if (!user || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.role || user.user_metadata?.role || null;
}

function mapSupabaseUser(user, role) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: role || user.user_metadata?.role || null,
    source: 'live',
  };
}

export function AuthProvider({ children }) {
  const authMode = isSupabaseConfigured && supabase ? 'live' : 'demo';
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState('');

  const applyUserState = useCallback((nextUser) => {
    setUser(nextUser);
    setRole(nextUser?.role || null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        setError('');

        if (authMode === 'demo') {
          const session = getDemoSession();
          if (isMounted) {
            applyUserState(session);
            setAuthReady(true);
          }
          return;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const currentUser = data.session?.user || null;

        if (!currentUser) {
          if (isMounted) {
            applyUserState(null);
            setAuthReady(true);
          }
          return;
        }

        const profileRole = await getLiveUserRole(currentUser);

        if (isMounted) {
          applyUserState(mapSupabaseUser(currentUser, profileRole));
          setAuthReady(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to initialize authentication session.');
          applyUserState(null);
          setAuthReady(true);
        }
      }
    };

    bootstrap();

    if (authMode !== 'live') {
      return () => {
        isMounted = false;
      };
    }

    const { data: authListener } = supabase.auth.onAuthStateChanged(async (_event, session) => {
      try {
        if (!session?.user) {
          applyUserState(null);
          return;
        }

        const profileRole = await getLiveUserRole(session.user);
        applyUserState(mapSupabaseUser(session.user, profileRole));
      } catch (err) {
        setError(err.message || 'Unable to refresh authentication state.');
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [applyUserState, authMode]);

  const signIn = useCallback(
    async ({ email, password }) => {
      setError('');

      if (authMode === 'demo') {
        const result = signInDemo({ email, password });
        applyUserState(result.user);
        return result;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const profileRole = await getLiveUserRole(data.user);
      const mappedUser = mapSupabaseUser(data.user, profileRole);
      applyUserState(mappedUser);

      return {
        user: mappedUser,
        role: mappedUser.role,
      };
    },
    [applyUserState, authMode]
  );

  const signUp = useCallback(
    async ({ email, password, role: requestedRole }) => {
      setError('');

      if (authMode === 'demo') {
        return signUpDemo({ email, password, role: requestedRole });
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: requestedRole,
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-otp`,
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (data.user?.id) {
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email,
            role: requestedRole,
            full_name: email.split('@')[0],
            is_active: true,
          },
          { onConflict: 'id' }
        );
      }

      return {
        email,
        requiresOtp: true,
      };
    },
    [authMode]
  );

  const verifyOtp = useCallback(
    async ({ email, token, type = 'email', tokenHash }) => {
      setError('');

      if (authMode === 'demo') {
        const result = verifyDemoOtp({ email, token });
        applyUserState(result.user);
        return result;
      }

      const payload = tokenHash
        ? { token_hash: tokenHash, type }
        : { email, token, type };

      const { data, error: verifyError } = await supabase.auth.verifyOtp(payload);

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      const sessionUser = data.user || data.session?.user || null;
      if (sessionUser) {
        const profileRole = await getLiveUserRole(sessionUser);
        applyUserState(mapSupabaseUser(sessionUser, profileRole));
      }

      return data;
    },
    [applyUserState, authMode]
  );

  const sendPasswordReset = useCallback(
    async ({ email }) => {
      setError('');

      if (authMode === 'demo') {
        return sendDemoPasswordReset({ email });
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        throw new Error(resetError.message);
      }

      return {
        email,
      };
    },
    [authMode]
  );

  const updatePassword = useCallback(
    async ({ password, email, token }) => {
      setError('');

      if (authMode === 'demo') {
        if (email && token) {
          return updateDemoPassword({ email, token, password });
        }

        return updateDemoPasswordForCurrentUser({ password });
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      return {
        ok: true,
      };
    },
    [authMode]
  );

  const signOut = useCallback(async () => {
    setError('');

    if (authMode === 'demo') {
      signOutDemo();
      applyUserState(null);
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      throw new Error(signOutError.message);
    }

    applyUserState(null);
  }, [applyUserState, authMode]);

  const signInAsDemoSession = useCallback(
    async (email) => {
      const session = setDemoSessionByEmail(email);
      applyUserState(session);
      return session;
    },
    [applyUserState]
  );

  const value = useMemo(
    () => ({
      authReady,
      isAuthenticated: Boolean(user),
      authMode,
      user,
      role,
      email: user?.email || null,
      error,
      signIn,
      signUp,
      signOut,
      verifyOtp,
      sendPasswordReset,
      updatePassword,
      signInAsDemoSession,
    }),
    [
      authMode,
      authReady,
      error,
      role,
      sendPasswordReset,
      signIn,
      signInAsDemoSession,
      signOut,
      signUp,
      updatePassword,
      user,
      verifyOtp,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
