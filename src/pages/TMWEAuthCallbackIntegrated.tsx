import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTMWEAuth } from '@/hooks/useTMWEAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TMWEAuthCallbackIntegrated = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useTMWEAuth();
  const [status, setStatus] = useState<'processing' | 'error' | 'success'>('processing');
  const [error, setError] = useState<string>('');
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    const addDetail = (detail: string) => {
      console.log(detail);
      setDetails(prev => [...prev, detail]);
    };

    try {
      addDetail('📥 Procesando callback OAuth2...');

      // 1. Obtener parámetros de la URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Verificar errores de OAuth
      if (error) {
        throw new Error(`OAuth Error: ${error} - ${errorDescription || 'Unknown error'}`);
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

      // 3. Obtener credenciales OAuth del sessionStorage
      const clientId = sessionStorage.getItem('oauth_client_id');
      const clientSecret = sessionStorage.getItem('oauth_client_secret');
      const redirectUri = sessionStorage.getItem('oauth_redirect_uri');

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Missing OAuth credentials');
      }

      addDetail('🔐 Intercambiando código por token de acceso...');

      // 4. Intercambiar código por access_token (grant_type: authorization_code)
      const tokenResponse = await fetch('https://findair.it/erp/tmwe_json/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(`Token exchange failed: ${errorData.error || tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in, email } = tokenData;

      if (!access_token) {
        throw new Error('No access token received');
      }

      addDetail(`✅ Access token obtenido (email: ${email || 'unknown'})`);
      addDetail(`⏰ Token expira en: ${expires_in ? `${expires_in}s` : 'unknown'}`);

      // 5. Guardar tokens en sessionStorage
      sessionStorage.setItem('tmwe_access_token', access_token);
      if (refresh_token) {
        sessionStorage.setItem('tmwe_refresh_token', refresh_token);
      }
      if (expires_in) {
        const expiresAt = Date.now() + (expires_in * 1000);
        sessionStorage.setItem('tmwe_token_expires_at', expiresAt.toString());
      }
      if (email) {
        sessionStorage.setItem('tmwe_user_email', email);
      }

      addDetail('👤 Obteniendo perfil del usuario (/get_my_profile)...');

      // 6. Obtener perfil del usuario usando el access_token
      const profileResponse = await fetch('https://findair.it/erp/tmwe_json/get_my_profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handler: 'get_my_profile'
        }),
      });

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`);
      }

      const profileData = await profileResponse.json();
      
      addDetail(`✅ Perfil obtenido: ${profileData.name || profileData.username}`);
      addDetail(`🏢 Empresa: ${profileData.enterprise_name || 'N/A'}`);

      // 7. Crear/actualizar sesión en Supabase
      addDetail('🔄 Sincronizando con Supabase...');
      
      await login(profileData.email || email, {
        email: profileData.email || email,
        name: profileData.name,
        username: profileData.username,
        enterprise_name: profileData.enterprise_name,
        rubrica: profileData.rubrica,
      });

      addDetail('✅ Sesión Supabase creada correctamente');

      // 8. Limpiar datos temporales de OAuth
      sessionStorage.removeItem('tmwe_oauth_state');
      sessionStorage.removeItem('tmwe_client_id');
      sessionStorage.removeItem('tmwe_client_secret');
      sessionStorage.removeItem('tmwe_redirect_uri');

      addDetail('✨ Login completado con éxito');
      setStatus('success');

      // 9. Redirigir al dashboard
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setError(error.message || 'Unknown error occurred');
      setStatus('error');
      addDetail(`❌ Error: ${error.message}`);
      
      // Redirigir a login después de mostrar error
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
