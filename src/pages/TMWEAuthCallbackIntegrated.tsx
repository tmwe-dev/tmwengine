import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const TMWEAuthCallbackIntegrated = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useTMWEAuth();
  const [status, setStatus] = useState<'processing' | 'error' | 'success'>('processing');
  const [error, setError] = useState<string>('');
  const [details, setDetails] = useState<string[]>([]);

  const addDetail = (detail: string) => {
    console.log(detail);
    setDetails(prev => [...prev, detail]);
  };

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      console.log('📥 Procesando callback OAuth2...');
      addDetail('📥 Procesando callback OAuth2...');

      // 1. Obtener código de autorización de la URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        throw new Error(errorDescription || error);
      }

      if (!code) {
        throw new Error('Authorization code not received');
      }

      addDetail(`✅ Código de autorización recibido`);

      // 2. Validar state (CSRF protection)
      const savedState = sessionStorage.getItem('oauth_state');
      if (!savedState || savedState !== state) {
        throw new Error('Invalid state parameter (possible CSRF attack)');
      }
      addDetail(`✅ State validado correctamente`);

      // 3. Obtener redirect_uri del sessionStorage
      const redirectUri = sessionStorage.getItem('oauth_redirect_uri');

      if (!redirectUri) {
        throw new Error('Missing redirect URI');
      }

      addDetail('🔐 Enviando código a servidor para intercambio...');
      
      console.log('🔐 Calling tmwe-oauth-auth edge function with:', {
        code: code.substring(0, 20) + '...',
        redirectUri: redirectUri
      });

      // 4. Llamar a la edge function OAuth para completar el flujo OAuth2
      const { data, error: functionError } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          handler: 'oauth_auth',
          code: code,
          redirectUri: redirectUri,
        }
      });

      console.log('📥 Edge function response:', { data, error: functionError });

      if (functionError) {
        console.error('❌ Edge function error:', functionError);
        addDetail(`❌ Error en edge function: ${functionError.message}`);
        throw new Error(functionError.message || 'OAuth callback failed');
      }

      if (!data || !data.success) {
        console.error('❌ Invalid response from edge function:', data);
        addDetail(`❌ Respuesta inválida: ${data?.error || 'Sin datos'}`);
        throw new Error(data?.error || 'OAuth callback failed');
      }
      
      console.log('✅ Edge function success:', data);

      addDetail(`✅ Autenticación completada (email: ${data.email})`);
      addDetail(`👤 Perfil: ${data.profile?.name || data.profile?.username}`);
      addDetail(`🏢 Empresa: ${data.profile?.enterprise_name || 'N/A'}`);
      addDetail('✅ Credenciales guardadas en base de datos');

      // 5. Establecer sesión de Supabase con tokens (OAuth2-compliant)
      if (data.access_token && data.refresh_token) {
        addDetail('🔐 Estableciendo sesión de Supabase con TTL sincronizado...');
        
        console.log('🔐 Setting Supabase session with tokens:', {
          access_token: data.access_token.substring(0, 20) + '...',
          refresh_token: data.refresh_token.substring(0, 20) + '...'
        });
        
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          console.error('❌ Error estableciendo sesión:', sessionError);
          addDetail(`❌ Error sesión: ${sessionError.message}`);
          throw sessionError;
        }
        
        console.log('✅ Supabase session established successfully');
        console.log('⏱️ Session configured to expire 20% before TMWE token (safety margin)');
        addDetail('✅ Sesión de Supabase establecida correctamente');
        addDetail('⏱️ TTL sincronizado: sesión expira antes del token TMWE');
      } else {
        console.error('❌ Missing Supabase tokens in response:', {
          has_access_token: !!data.access_token,
          has_refresh_token: !!data.refresh_token
        });
        throw new Error('Missing Supabase tokens in response');
      }

      // 6. Actualizar contexto local de autenticación
      console.log('👤 Updating auth context with:', { email: data.email, profile: data.profile });
      await login(data.email, data.profile);
      console.log('✅ Auth context updated');

      // 7. Limpiar sessionStorage
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_client_id');
      sessionStorage.removeItem('oauth_client_secret');
      sessionStorage.removeItem('oauth_redirect_uri');
      console.log('🧹 Session storage cleaned');

      addDetail('✅ Proceso completado exitosamente');
      setStatus('success');

      // Redirigir al dashboard después de 2 segundos
      console.log('🔄 Redirecting to home in 2 seconds...');
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setError(error.message || 'Unknown error');
      addDetail(`❌ Error: ${error.message}`);
      setStatus('error');
      
      // Redirigir a la página de email senders después de 5 segundos en caso de error
      setTimeout(() => {
        navigate('/email-senders');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'processing' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Procesando autenticación...
              </>
            )}
            {status === 'success' && (
              <>
                <span className="text-2xl">✅</span>
                ¡Autenticación exitosa!
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error de autenticación
              </>
            )}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Validando credenciales y configurando sesión...'}
            {status === 'success' && 'Redirigiendo al dashboard...'}
            {status === 'error' && 'Ocurrió un error durante la autenticación'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'error' && error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Log de detalles */}
          <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
            <h4 className="text-sm font-semibold mb-2">Detalles del proceso:</h4>
            <div className="space-y-1 text-xs font-mono">
              {details.map((detail, index) => (
                <div key={index} className="text-muted-foreground">
                  {detail}
                </div>
              ))}
            </div>
          </div>

          {status === 'success' && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirigiendo...
            </div>
          )}

          {status === 'error' && (
            <div className="text-center text-sm text-muted-foreground">
              Serás redirigido al gestor de email en 5 segundos...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TMWEAuthCallbackIntegrated;
