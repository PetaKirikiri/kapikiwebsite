import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { handleAuthCallback } from '../services/emailService';
import '../styles/spinner.css';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    async function handleAuth() {
      try {
        // Log everything about our current location
        console.log('OAuth Callback: Full URL:', window.location.href);
        console.log('OAuth Callback: Current pathname:', location.pathname);
        console.log('OAuth Callback: Search params:', Object.fromEntries(searchParams.entries()));
        
        const code = searchParams.get('code');
        if (!code) {
          console.error('OAuth Callback: No authorization code received');
          navigate('/clients', { replace: true });
          return;
        }

        console.log('OAuth Callback: Starting token exchange with code length:', code.length);
        
        try {
          // Exchange the code for tokens
          const accessToken = await handleAuthCallback(code);
          console.log('OAuth Callback: Token exchange successful:', !!accessToken);

          // Check if we got the refresh token
          const hasRefreshToken = !!localStorage.getItem('gmail_refresh_token');
          console.log('OAuth Callback: Refresh token stored:', hasRefreshToken);

          if (!hasRefreshToken) {
            console.error('OAuth Callback: No refresh token received after successful exchange');
          }
        } catch (error) {
          console.error('OAuth Callback: Token exchange failed:', error);
          // Even if token exchange fails, try to navigate back
        }

        // Always try to navigate back
        let returnTo = localStorage.getItem('emailAuthReturnTo');
        console.log('OAuth Callback: Stored return path:', returnTo);
        
        // Clean up
        localStorage.removeItem('emailAuthReturnTo');

        // Default to clients page if no return path or if it's the oauth page
        if (!returnTo || returnTo.includes('oauth-callback')) {
          returnTo = '/clients';
        }

        // Remove any duplicate slashes and ensure proper format
        returnTo = '/' + returnTo.split('/').filter(Boolean).join('/');
        
        console.log('OAuth Callback: Navigating to:', returnTo);
        navigate(returnTo, { replace: true });

      } catch (error) {
        console.error('OAuth Callback: Unexpected error:', error);
        // Always try to get back to a valid page
        navigate('/clients', { replace: true });
      }
    }

    // Start the auth handling process
    console.log('OAuth Callback: Component mounted, starting auth process');
    handleAuth();
  }, [navigate, searchParams, location]);

  // Show a loading state while we process
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>Setting Up Email Access</h2>
        <p style={{
          color: '#4b5563',
          marginBottom: '1rem'
        }}>Please wait while we complete the setup...</p>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          marginTop: '1rem'
        }}>This should only take a moment.</p>
      </div>
    </div>
  );
} 