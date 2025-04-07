import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmail, handleAuthCallback } from './emailService';

// Get the base URL considering the basename
const getBaseUrl = () => {
  const isLocal = window.location.hostname === "localhost";
  return isLocal ? "/kapikiwebsite" : "/Ka-Piki";
};

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        // Get the stored return path or default to /clients
        const returnPath = localStorage.getItem('emailAuthReturnTo') || '/clients';
        console.log('Returning to path:', returnPath);

        // Exchange the code for tokens
        await handleAuthCallback(code);
        
        // Clear the stored path
        localStorage.removeItem('emailAuthReturnTo');
        
        // Navigate to the return path, ensuring we don't duplicate the base path
        const finalPath = returnPath.startsWith(getBaseUrl()) 
          ? returnPath 
          : getBaseUrl() + returnPath;
        console.log('Final navigation path:', finalPath);
        navigate(finalPath);
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate(getBaseUrl() + '/clients');
      }
    };

    handleCallback();
  }, [navigate]);

  return null; // This component doesn't render anything
};

export default OAuthCallback; 