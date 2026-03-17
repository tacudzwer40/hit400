import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

const PublicRoute = ({ children }) => {
  const { user, loading } = useAppContext();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTop: '3px solid transparent', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }}></div>
          <h3 style={{ color: 'var(--primary)' }}>Loading...</h3>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/user'} replace />;
  }

  return children;
};

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAppContext();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTop: '3px solid transparent', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }}></div>
          <h3 style={{ color: 'var(--primary)' }}>Authenticating...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Verifying your credentials</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard or show unauthorized message
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#F87171', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            You don't have permission to access this area. Your current role is: <strong>{user.role}</strong>
          </p>
          <button
            onClick={() => window.location.href = user.role === 'admin' ? '/admin' : '/user'}
            className="btn btn-primary"
          >
            Go to Your Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
};

const AppContent = () => {
  const { user } = useAppContext();

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user"
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <div className="app-container">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </div>
  );
};

export default App;
