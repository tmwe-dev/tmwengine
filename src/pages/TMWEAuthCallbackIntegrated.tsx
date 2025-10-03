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
        console.log('  - expires_in:', tokenData.expires_in, 'segundos');
        console.log('  - access_token presente:', !!tokenData.access_token);
        console.log('  - refresh_token presente:', !!tokenData.refresh_token);
        
        const expiresAt = Date.now() + (tokenData.expires_in * 1000);

        // Get user email from TMWE API usando el endpoint correcto
        console.log('═══════════════════════════════════════════════════════');
        console.log('📧 OBTENIENDO EMAIL DEL USUARIO');
        console.log('═══════════════════════════════════════════════════════');
        
        let userEmail = null;
        try {
          // Usar el endpoint correcto para obtener información de la cuenta
          const accountUrl = 'https://findair.it/erp/tmwe_json/email_account';
          const accountBody = JSON.stringify({ handler: 'get_account_info' });
          
          console.log('📤 Request para obtener email:');
          console.log('  - URL:', accountUrl);
          console.log('  - Body:', accountBody);
          
          const accountResponse = await fetch(accountUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: accountBody,
          });

          console.log('📥 Respuesta del servidor:');
          console.log('  - Status:', accountResponse.status);
          console.log('  - OK:', accountResponse.ok);

          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            console.log('📦 Datos de cuenta recibidos:', accountData);
            userEmail = accountData.email || accountData.username || accountData.account_email;
            console.log('✅ Email del usuario:', userEmail);
          } else {
            const errorText = await accountResponse.text();
            console.error('❌ Error obteniendo email:', errorText);
          }
        } catch (err) {
          console.error('🔥 Excepción obteniendo email:', err);
        }

        // Si no se pudo obtener el email, usar un email genérico basado en el clientId
        if (!userEmail) {
          console.warn('⚠️ No se pudo obtener email del API, usando email genérico');
          userEmail = `tmwe_${clientId.substring(0, 8)}@tmwe-auth.local`;
          console.log('📧 Email generado:', userEmail);
        }

        // Sign in or sign up user in Supabase using the email from TMWE
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔐 AUTENTICACIÓN CON SUPABASE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📧 Email a usar:', userEmail);
        
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Try to sign in first
        console.log('🔑 Intentando sign in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: tokenData.access_token,
        });

        console.log('📊 Resultado del sign in:');
        console.log('  - Tiene datos:', !!signInData);
        console.log('  - Tiene error:', !!signInError);
        if (signInError) console.log('  - Error:', signInError.message);

        // If sign in fails, create new account
        if (signInError) {
          console.log('🆕 Sign in falló, intentando sign up...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: userEmail,
            password: tokenData.access_token,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                tmwe_authenticated: true,
              }
            }
          });

          console.log('📊 Resultado del sign up:');
          console.log('  - Tiene datos:', !!signUpData);
          console.log('  - Tiene usuario:', !!signUpData?.user);
          console.log('  - Tiene sesión:', !!signUpData?.session);
          console.log('  - Tiene error:', !!signUpError);
          if (signUpError) console.log('  - Error:', signUpError.message);

          if (signUpError) {
            console.error('❌ Error en Supabase signup:', signUpError);
            throw new Error(`Errore registrazione: ${signUpError.message}`);
          }

          // Check if email confirmation is required
          if (signUpData.user && !signUpData.session) {
            console.warn('⚠️ Se requiere confirmación de email');
            setError('È richiesta la conferma email. Controlla la tua casella di posta.');
            toast.error('Conferma la tua email per completare la registrazione');
            return;
          }
        }

        // Verify user is authenticated
        console.log('🔍 Verificando sesión activa...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('📊 Sesión actual:');
        console.log('  - Tiene sesión:', !!session);
        console.log('  - Usuario:', session?.user?.email);
        
        if (!session) {
          console.error('❌ No hay sesión activa después de autenticación');
          throw new Error('Autenticazione fallita: nessuna sessione attiva');
        }

        console.log('✅ Usuario autenticado exitosamente');
        
        // Save TMWE credentials to Supabase database
        console.log('═══════════════════════════════════════════════════════');
        console.log('💾 GUARDANDO CREDENCIALES TMWE');
        console.log('═══════════════════════════════════════════════════════');
        
        await setApiConfigToDB({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          clientId,
          clientSecret,
        });

        console.log('✅ Credenciales guardadas');

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
