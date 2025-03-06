import React, { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { ErrorBanner } from './components/ErrorBanner';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { useAuth } from './hooks/useAuth';

function App() {
  const { auth, login, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!auth.isAuthenticated ? (
        <div className="min-h-screen bg-gray-50">
          {error && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2">
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