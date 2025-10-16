import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useTMWEAuth();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const storedState = sessionStorage.getItem('oauth_state');
        const redirectUri = sessionStorage.getItem('oauth_redirect_uri');

        console.log('🔐 OAuth Callback iniciado');
        console.log('  - Code:', code?.substring(0, 20) + '...');
        console.log('  - State:', state);
        console.log('  - Stored State:', storedState);

        // Validar state parameter
        if (!code) {
          throw new Error('Authorization code not found');
        }

        if (state !== storedState) {
          throw new Error('State mismatch - possible CSRF attack');
        }

        if (!redirectUri) {
          throw new Error('Redirect URI not found in session');
        }

        console.log('✅ State validated');
        console.log('📤 Calling tmwe-oauth-auth edge function...');

        // Llamar al edge function para intercambiar el código por tokens
        const { data, error } = await supabase.functions.invoke('tmwe-oauth-auth', {
          body: { code, redirectUri },
        });

        if (error) {
          console.error('❌ Edge function error:', error);
          throw error;
        }

        console.log('✅ Edge function response:', data);

        // ✅ CORRECCIÓN: Extraer tokens de Supabase del magic link
        const { access_token, refresh_token, email, profile, tmwe_access_token } = data;

        if (!access_token || !refresh_token) {
          throw new Error('Supabase tokens not received');
        }

        console.log('🔑 Setting Supabase session...');

        // Establecer la sesión de Supabase
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        console.log('✅ Supabase session established');

        // ✅ MEJORA OPCIONAL: Guardar TMWE access token en localStorage
        if (tmwe_access_token) {
          localStorage.setItem('tmwe_access_token', tmwe_access_token);
          sessionStorage.setItem('tmwe_access_token', tmwe_access_token);
          console.log('✅ TMWE access token stored in localStorage');
        }

        // Login con TMWE Auth context
        await login(email, profile);

        // Limpiar session storage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_redirect_uri');

        console.log('✅ Authentication complete');
        toast.success('Autenticazione completata con successo!');

        // Redirigir a la página principal
        navigate('/');
      } catch (error: any) {
        console.error('❌ OAuth callback error:', error);
        toast.error(error.message || 'Errore durante l\'autenticazione');
        setIsProcessing(false);
        
        // Redirigir al login después de un breve delay
        setTimeout(() => navigate('/auth'), 2000);
      }
    };

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">
          {isProcessing ? 'Autenticazione in corso...' : 'Reindirizzamento...'}
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
