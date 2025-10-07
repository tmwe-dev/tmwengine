import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';

const TMWEAuthCallbackIntegrated = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { login } = useTMWEAuth();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔐 INICIO DEL CALLBACK OAUTH2');
      console.log('═══════════════════════════════════════════════════════');
      
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('📋 Parámetros recibidos:');
      console.log('  - code:', code ? code.substring(0, 20) + '...' : 'null');
      console.log('  - state:', state);
      console.log('  - error:', errorParam);
      console.log('  - error_description:', errorDescription);

      // Check for errors
      if (errorParam) {
        const errorMsg = errorDescription || errorParam;
        console.error('❌ Error en autorización:', errorMsg);
        setError(errorMsg);
        toast.error(`Authorization failed: ${errorMsg}`);
        setTimeout(() => navigate('/email-manager'), 3000);
        return;
      }

      if (!code) {
        console.error('❌ No se recibió código de autorización');
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

      console.log('🔑 OAuth config desde sessionStorage:');
      console.log('  - storedState:', storedState);
      console.log('  - clientId:', clientId ? clientId.substring(0, 20) + '...' : 'null');
      console.log('  - clientSecret:', clientSecret ? 'presente' : 'null');
      console.log('  - redirectUri:', redirectUri);

      if (!storedState || !clientId || !clientSecret || !redirectUri) {
        console.error('❌ Falta configuración OAuth en sessionStorage');
        setError('Missing OAuth configuration');
        toast.error('Missing OAuth configuration');
        setTimeout(() => navigate('/email-manager'), 3000);
        return;
      }

      // Verify state to prevent CSRF
      if (state !== storedState) {
        console.error('❌ Estado no coincide - posible ataque CSRF');
        console.error('  - State recibido:', state);
        console.error('  - State almacenado:', storedState);
        setError('State mismatch - possible CSRF attack');
        toast.error('Security validation failed');
        setTimeout(() => navigate('/email-manager'), 3000);
        return;
      }

      console.log('✅ Validación de estado exitosa');

      // Exchange authorization code for access token
      try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📤 INTERCAMBIO DE CÓDIGO POR TOKEN');
        console.log('═══════════════════════════════════════════════════════');
        
        const formData = new URLSearchParams();
        formData.append('grant_type', 'authorization_code');
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        formData.append('code', code);
        formData.append('redirect_uri', redirectUri);

        console.log('📦 Datos del request:');
        console.log('  - URL:', 'https://findair.it/erp/tmwe_json/token');
        console.log('  - grant_type:', 'authorization_code');
        console.log('  - client_id:', clientId.substring(0, 20) + '...');
        console.log('  - redirect_uri:', redirectUri);

        const response = await fetch('https://findair.it/erp/tmwe_json/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        console.log('📥 Respuesta del servidor de tokens:');
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - OK:', response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Error en intercambio de token:', errorData);
          throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
        }

        const tokenData = await response.json();
        
        console.log('✅ Token recibido exitosamente');
        console.log('📦 RESPUESTA LITERAL DEL API:');
        console.log(JSON.stringify(tokenData, null, 2));
        console.log('  - expires_in:', tokenData.expires_in, 'segundos');
        console.log('  - access_token presente:', !!tokenData.access_token);
        console.log('  - refresh_token presente:', !!tokenData.refresh_token);
        console.log('  - email presente:', !!tokenData.email);
        
        const expiresAt = Date.now() + (tokenData.expires_in * 1000);

        // Get user email from token response
        console.log('═══════════════════════════════════════════════════════');
        console.log('📧 EXTRAYENDO EMAIL DE LA RESPUESTA DEL TOKEN');
        console.log('═══════════════════════════════════════════════════════');
        
        let userEmail = tokenData.email;
        
        // Si no viene el email en la respuesta, mostrar error
        if (!userEmail) {
          console.error('❌ No se recibió email en la respuesta del token');
          throw new Error('No se recibió email del API de TMWE');
        }
        
        console.log('✅ Email del usuario:', userEmail);

        // Save TMWE credentials to database
        console.log('═══════════════════════════════════════════════════════');
        console.log('💾 GUARDANDO CREDENCIALES TMWE');
        console.log('═══════════════════════════════════════════════════════');
        
        // Check if credentials already exist for this email
        const { data: existingCreds } = await supabase
          .from('user_tmwe_credentials')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        if (existingCreds) {
          // Update existing credentials
          console.log('🔄 Actualizando credenciales existentes para:', userEmail);
          const { error: updateError } = await supabase
            .from('user_tmwe_credentials')
            .update({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: expiresAt,
              client_id: clientId,
              client_secret: clientSecret,
              updated_at: new Date().toISOString(),
            })
            .eq('email', userEmail);

          if (updateError) {
            console.error('❌ Error actualizando credenciales:', updateError);
            throw updateError;
          }
        } else {
          // Insert new credentials
          console.log('🆕 Creando nuevas credenciales para:', userEmail);
          const { error: insertError } = await supabase
            .from('user_tmwe_credentials')
            .insert({
              email: userEmail,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: expiresAt,
              client_id: clientId,
              client_secret: clientSecret,
            });

          if (insertError) {
            console.error('❌ Error insertando credenciales:', insertError);
            throw insertError;
          }
        }

        console.log('✅ Credenciales guardadas exitosamente');

        // Save email to session storage for the app to use
        sessionStorage.setItem('tmwe_user_email', userEmail);
        sessionStorage.setItem('tmwe_access_token', tokenData.access_token);

        // Get user profile from TMWE API
        console.log('═══════════════════════════════════════════════════════');
        console.log('👤 OBTENIENDO PERFIL DEL USUARIO');
        console.log('═══════════════════════════════════════════════════════');
        
        let userProfile = null;
        try {
          const { profileApi } = await import('@/lib/tmwe-api-integrated');
          const profileResponse = await profileApi.getMyProfile();
          console.log('📦 Respuesta del perfil:', profileResponse);
          
          if (profileResponse && typeof profileResponse === 'object') {
            userProfile = {
              email: userEmail,
              ...profileResponse
            };
            console.log('✅ Perfil obtenido:', userProfile);
          }
        } catch (profileError) {
          console.error('⚠️ Error obteniendo perfil (no crítico):', profileError);
          // Continue even if profile fetch fails
        }
        console.log('═══════════════════════════════════════════════════════');

        // Update auth context with profile
        login(userEmail, userProfile);

        // Clear OAuth session data
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_client_id');
        sessionStorage.removeItem('oauth_client_secret');
        sessionStorage.removeItem('oauth_redirect_uri');

        console.log('🧹 SessionStorage limpiado');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ AUTENTICACIÓN COMPLETADA EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');

        toast.success('Accesso effettuato con successo!');
        navigate('/');
      } catch (err) {
        console.log('═══════════════════════════════════════════════════════');
        console.error('🔥 ERROR EN EL PROCESO DE CALLBACK');
        console.log('═══════════════════════════════════════════════════════');
        console.error('Error:', err);
        console.error('Message:', err instanceof Error ? err.message : 'Unknown error');
        console.error('Stack:', err instanceof Error ? err.stack : 'No stack trace');
        console.log('═══════════════════════════════════════════════════════');
        
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
