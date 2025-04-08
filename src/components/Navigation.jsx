import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/navigation.css';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="navigation">
      <button
        className={`nav-button ${location.pathname === '/form' ? 'active' : ''}`}
        onClick={() => navigate('/form')}
      >
        Form
      </button>
      <button
        className={`nav-button ${location.pathname === '/clients' ? 'active' : ''}`}
        onClick={() => navigate('/clients')}
      >
        Clients
      </button>
    </nav>
  );
};

export default Navigation; 