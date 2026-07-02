import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, supabaseConfigError } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(!supabaseConfigError);

  useEffect(() => {
    if (supabaseConfigError || !supabase) {
      setIsLoadingAuth(false);
      return;
    }

    let active = true;

    const finishLoading = () => {
      if (active) setIsLoadingAuth(false);
    };

    // Don't show a blank page forever if Supabase is unreachable.
    const timeout = setTimeout(finishLoading, 8000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setUser(session?.user ?? null);
        finishLoading();
      })
      .catch((err) => {
        console.error('Auth session error:', err);
        finishLoading();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      finishLoading();
    });

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: null,
        logout,
        navigateToLogin: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
