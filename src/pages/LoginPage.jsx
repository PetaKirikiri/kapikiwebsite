import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/clients');
    } catch (error) {
      setError('Failed to sign in: ' + error.message);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>Login</h2>
        
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                outline: 'none'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                outline: 'none'
              }}
              required
            />
          </div>
          
          <button
            type="submit"
            style={{
              width: '100%',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
} 