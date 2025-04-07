import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';
import FormPage from './pages/FormPage';
import OAuthCallback from './pages/OAuthCallback';

// Get the base path from the current URL
const getBasePath = () => {
  const path = window.location.pathname;
  return path.startsWith('/kapikiwebsite') ? '/kapikiwebsite' : '';
};

function App() {
  const basePath = getBasePath();
  console.log('App: Base Path:', basePath);
  console.log('App: Current URL:', window.location.href);
  console.log('App: Pathname:', window.location.pathname);

  return (
    <AuthProvider>
      <Router basename={basePath}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route
            path="/clients"
            element={
              <PrivateRoute>
                <ClientsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/form"
            element={
              <PrivateRoute>
                <FormPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 