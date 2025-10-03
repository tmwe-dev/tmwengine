import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setApiConfigToDB } from '@/lib/tmwe-api-integrated';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const TMWEAuthCallbackIntegrated = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.group('🔐 OAuth2 Callback - Integrated');
      console.log('code:', code);
      console.log('state:', state);
      console.log('error:', errorParam);
      console.groupEnd();

      // Check for errors
      if (errorParam) {
        const errorMsg = errorDescription || errorParam;
        setError(errorMsg);
        toast.error(`Authorization failed: ${errorMsg}`);
        setTimeout(() => navigate('/email-manager'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        toast.error('No authorization code received');
        setTimeout(() => navigate('/email-manager'), 3000);
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
        setTimeout(() => navigate('/email-manager'), 3000);
        return;
      }

      // Verify state to prevent CSRF
      if (state !== storedState) {
        setError('State mismatch - possible CSRF attack');
        toast.error('Security validation failed');
        setTimeout(() => navigate('/email-manager'), 3000);
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

        console.group('📤 OAuth2 Token Exchange');
        console.log('Request to:', 'https://findair.it/erp/tmwe_json/token');
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
          console.error('❌ Token exchange error:', errorData);
          throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
        }

        const tokenData = await response.json();
        
        console.group('✅ OAuth2 Token Received');
        console.log('Token expires in:', tokenData.expires_in, 'seconds');
        console.groupEnd();
        
        const expiresAt = Date.now() + (tokenData.expires_in * 1000);

        // Get user email from TMWE API
        let userEmail = null;
        try {
          const accountResponse = await fetch('https://findair.it/erp/tmwe_json/email/v1/account', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            userEmail = accountData.email || accountData.username;
          }
        } catch (err) {
          console.error('Failed to get user email:', err);
        }

        // Sign in or sign up user in Supabase using the email from TMWE
        if (userEmail) {
          const { supabase } = await import('@/integrations/supabase/client');
          
          // Try to sign in first
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: tokenData.access_token,
          });

          // If sign in fails, create new account
          if (signInError) {
            const { error: signUpError } = await supabase.auth.signUp({
              email: userEmail,
              password: tokenData.access_token,
              options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: {
                  tmwe_authenticated: true,
                }
              }
            });

            if (signUpError) {
              console.error('Supabase signup error:', signUpError);
            }
          }
        }
        
        // Save TMWE credentials to Supabase database
        await setApiConfigToDB({
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

        toast.success('Accesso effettuato con successo!');
        navigate('/');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Token exchange failed';
        setError(errorMsg);
        toast.error(errorMsg);
        setTimeout(() => navigate('/email-manager'), 3000);
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
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Connecting TMWE account...</p>
      </div>
    </div>
  );
};

export default TMWEAuthCallbackIntegrated;
