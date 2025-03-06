import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { ErrorBanner } from './components/ErrorBanner';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/LoadingSpinner';

function App() {
  const { auth, login, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Simulate initial load to check auth status
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!auth.isAuthenticated ? (
        <div className="min-h-screen">
          {error && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
              <ErrorBanner message={error} />
            </div>
          )}
          <LoginForm onLogin={handleLogin} />
        </div>
      ) : (
        <AuthenticatedApp auth={auth} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;