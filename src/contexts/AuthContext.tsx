import React, { createContext, useContext, useCallback } from 'react';
import { AuthState } from '../types';
import { usePersistedState } from '../hooks/usePersistedState';

const API_BASE_URL = 'https://networkasset-conductor.link-labs.com';

interface AuthContextValue {
  auth: AuthState;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; organizations?: any[] }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = usePersistedState<AuthState>('auth', {
    username: '',
    isAuthenticated: false,
  });

  const login = useCallback(async (username: string, password: string) => {
    const authHeader = 'Basic ' + btoa(`${username}:${password}`);

    try {
      const response = await fetch(`${API_BASE_URL}/networkAsset/airfinder/organizations`, {
        headers: { 'Authorization': authHeader },
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const orgsData = await response.json();
      setAuth({ username, isAuthenticated: true, token: authHeader });
      return { success: true, organizations: orgsData };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed',
      };
    }
  }, [setAuth]);

  const logout = useCallback(() => {
    setAuth({ username: '', isAuthenticated: false });
  }, [setAuth]);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
