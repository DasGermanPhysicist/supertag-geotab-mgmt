import { useEffect } from 'react';
import { AuthState } from '../types';
import { usePersistedState } from './usePersistedState';

const API_BASE_URL = 'https://networkasset-conductor.link-labs.com';

export function useAuth() {
  const [auth, setAuth] = usePersistedState<AuthState>('auth', {
    username: '',
    isAuthenticated: false,
  });

  const login = async (username: string, password: string) => {
    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/networkAsset/airfinder/organizations`, {
        headers: {
          'Authorization': authHeader
        }
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
        error: err instanceof Error ? err.message : 'Authentication failed' 
      };
    }
  };

  const logout = () => {
    setAuth({ username: '', isAuthenticated: false });
  };

  return {
    auth,
    login,
    logout
  };
}