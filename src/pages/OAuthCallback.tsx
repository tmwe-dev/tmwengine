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

        // ✅ CORRECCIÓN: Extraer token_hash del magic link
        const { magicLink, email, profile, tmwe_access_token } = data;

        if (!magicLink) {
          throw new Error('Magic link not received');
        }

        console.log('🔗 Magic link received:', magicLink);

        // Extraer token_hash del magic link
        const magicLinkUrl = new URL(magicLink);
        const token_hash = magicLinkUrl.hash.split('token_hash=')[1]?.split('&')[0];
        const type = magicLinkUrl.hash.split('type=')[1]?.split('&')[0] || 'magiclink';

        if (!token_hash) {
          console.error('❌ Failed to extract token_hash from magic link');
          console.error('   Magic link:', magicLink);
          throw new Error('Failed to extract token_hash from magic link');
        }

        console.log('🔑 Extracted token_hash:', token_hash.substring(0, 20) + '...');
        console.log('🔑 Type:', type);
        console.log('🔑 Verifying OTP with Supabase...');

        // ✅ Verificar el OTP con Supabase (como en el proyecto de Luca)
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (sessionError) {
          console.error('❌ OTP verification error:', sessionError);
          throw sessionError;
        }

        console.log('✅ OTP verified, session established:', sessionData);

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
