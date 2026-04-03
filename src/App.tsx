import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { ErrorBanner } from './components/ErrorBanner';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { TagEventHistoryPage } from './components/TagEventHistory';
import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/LoadingSpinner';

// PrimeReact
import { PrimeReactProvider } from 'primereact/api';

function App() {
  const { auth, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Simulate initial load to check auth status
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setError(null);
    
    try {
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error ?? 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PrimeReactProvider>
      <Router>
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
            <Routes>
              <Route 
                path="/" 
                element={<AuthenticatedApp />} 
              />
              <Route 
                path="/event-history/:nodeAddress" 
                element={<TagEventHistoryPage />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
      </Router>
    </PrimeReactProvider>
  );
}

export default App;