import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useTMWEAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [extractedToken, setExtractedToken] = useState<string | null>(null);
  const [tmweToken, setTmweToken] = useState<string | null>(null);

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
        console.log('📤 Calling public tmwe-oauth-auth edge function...');

        // Llamar a la función pública OAuth para intercambiar el código por tokens
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
        
        // Guardar TMWE token para visualización
        if (tmwe_access_token) {
          setTmweToken(tmwe_access_token);
        }

        if (!magicLink) {
          throw new Error('Magic link not received');
        }

        console.log('🔗 Magic link received:', magicLink);

        // ✅ CORRECCIÓN: El magic link tiene formato query params, no hash
        // Formato: https://.../auth/v1/verify?token=XXX&type=magiclink&redirect_to=...
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');
        const type = magicLinkUrl.searchParams.get('type') || 'magiclink';

        if (!token) {
          console.error('❌ Failed to extract token from magic link');
          console.error('   Magic link:', magicLink);
          console.error('   URL params:', Array.from(magicLinkUrl.searchParams.entries()));
          throw new Error('Failed to extract token from magic link');
        }

        console.log('🔑 Extracted token:', token.substring(0, 20) + '...');
        console.log('🔑 Type:', type);
        console.log('🔑 Verifying OTP with Supabase...');
        
        // Guardar token estratto per visualizzazione
        setExtractedToken(token);

        // ✅ Verificar el OTP con Supabase usando el token
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: token,
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
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center">🔐 Autenticazione OAuth2 in corso...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Token Supabase */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Supabase Token:</p>
            {extractedToken ? (
              <p className="text-xs px-3">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <span className="text-green-600 font-medium">Connesso</span>
                </span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-red-600">
                ❌ Token non disponibile
              </p>
            )}
          </div>

          {/* Token TMWE */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">TMWE Access Token:</p>
            {tmweToken ? (
              <p className="text-xs px-3">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <span className="text-green-600 font-medium">Connesso</span>
                </span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-red-600">
                ❌ Token non disponibile
              </p>
            )}
          </div>

          {/* Status */}
          <div className="flex flex-col items-center gap-4 pt-4 border-t">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">
              {isProcessing ? 'Autenticazione in corso...' : 'Reindirizzamento...'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback;
