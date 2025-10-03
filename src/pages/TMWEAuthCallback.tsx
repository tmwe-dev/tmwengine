import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setApiConfig } from '@/lib/tmwe-api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // 📋 LOG: Parámetros recibidos en callback
      console.group('🔐 OAuth2 Callback - Parámetros recibidos');
      console.log('code:', code);
      console.log('state:', state);
      console.log('error:', errorParam);
      console.log('error_description:', errorDescription);
      console.log('URL completa:', window.location.href);
      console.groupEnd();

      // Check for errors from authorization server
      if (errorParam) {
        const errorMsg = errorDescription || errorParam;
        setError(errorMsg);
        toast.error(`Authorization failed: ${errorMsg}`);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        toast.error('No authorization code received');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Retrieve stored OAuth state
      const storedState = sessionStorage.getItem('oauth_state');
      const clientId = sessionStorage.getItem('oauth_client_id');
      const clientSecret = sessionStorage.getItem('oauth_client_secret');
      const redirectUri = sessionStorage.getItem('oauth_redirect_uri');

      if (!storedState || !clientId || !clientSecret || !redirectUri) {
        setError('Missing OAuth configuration');
        toast.error('Missing OAuth configuration');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Verify state to prevent CSRF
      if (state !== storedState) {
        setError('State mismatch - possible CSRF attack');
        toast.error('Security validation failed');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Exchange authorization code for access token
      try {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'authorization_code');
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        formData.append('code', code);
        formData.append('redirect_uri', redirectUri);

        // 📤 LOG: Request de token exchange
        console.group('📤 OAuth2 Token Exchange - Request');
        console.log('URL:', 'https://findair.it/erp/tmwe_json/token');
        console.log('grant_type:', 'authorization_code');
        console.log('client_id:', clientId);
        console.log('code:', code);
        console.log('redirect_uri:', redirectUri);
        console.log('Body completo:', formData.toString());
        console.groupEnd();

        const response = await fetch('https://findair.it/erp/tmwe_json/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          // ❌ LOG: Error response
          console.group('❌ OAuth2 Token Exchange - Error Response');
          console.log('Status:', response.status);
          console.log('Error data:', errorData);
          console.groupEnd();
          
          throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
        }

        const tokenData = await response.json();
        
        // ✅ LOG: Token response exitosa
        console.group('✅ OAuth2 Token Exchange - Response exitosa');
        console.log('Token completo:', tokenData);
        console.log('access_token:', tokenData.access_token);
        console.log('refresh_token:', tokenData.refresh_token);
        console.log('expires_in:', tokenData.expires_in);
        console.log('token_type:', tokenData.token_type);
        console.log('scope:', tokenData.scope);
        console.groupEnd();
        
        const expiresAt = Date.now() + (tokenData.expires_in * 1000);
        
        setApiConfig({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          clientId,
          clientSecret,
        });

        // Clear OAuth session data
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_client_id');
        sessionStorage.removeItem('oauth_client_secret');
        sessionStorage.removeItem('oauth_redirect_uri');

        toast.success('Successfully authenticated!');
        navigate('/email-manager');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Token exchange failed';
        setError(errorMsg);
        toast.error(errorMsg);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="mb-4 text-destructive">
            <p className="text-lg font-semibold">Authentication Error</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
