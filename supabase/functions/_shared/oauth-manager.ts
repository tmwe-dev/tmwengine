// ═══════════════════════════════════════════════════════════════════════════
// TMWE OAUTH MANAGER - SHARED MODULE v1.0
// Centralizes OAuth token management with automatic refresh
// ═══════════════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface OAuthCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  token_type: string;
}

export interface OAuthManagerOptions {
  autoRefresh?: boolean;        // Default: true - automatically refresh expired tokens
  throwOnExpired?: boolean;      // Default: false - only throw if autoRefresh is disabled
  supabaseClient: SupabaseClient;
}

/**
 * Get TMWE OAuth token with automatic refresh capability
 * 
 * @param userEmail - Email of the authenticated user
 * @param options - Configuration options for token retrieval
 * @returns Valid OAuth access token
 * @throws Error if token not found or refresh fails
 */
export async function getTMWEOAuthToken(
  userEmail: string,
  options: OAuthManagerOptions
): Promise<string> {
  const { autoRefresh = true, throwOnExpired = false, supabaseClient } = options;
  
  console.log(`[TMWE-OAuth] 🔍 Buscando token para: ${userEmail}`);
  
  // 1. Check environment variable first
  const envToken = Deno.env.get('TMWE_OAUTH_TOKEN');
  if (envToken && envToken.trim() !== '') {
    console.log('[TMWE-OAuth] ✅ Token OAuth encontrado en environment variable');
    return envToken;
  }
  
  // 2. Query database for user credentials
  const { data: credentials, error: credErr } = await supabaseClient
    .from('user_tmwe_credentials')
    .select('access_token, refresh_token, expires_at, token_type')
    .eq('email', userEmail)
    .eq('token_type', 'oauth')
    .maybeSingle();
  
  if (credErr) {
    console.error('[TMWE-OAuth] ❌ Error querying database:', credErr);
    throw new Error(`Error fetching OAuth credentials: ${credErr.message}`);
  }
  
  if (!credentials || !credentials.access_token) {
    console.error('[TMWE-OAuth] ❌ Token OAuth no encontrado en DB');
    throw new Error(`Token OAuth no encontrado para ${userEmail}. Por favor, realiza login TMWE primero.`);
  }
  
  // 3. Validate token expiration
  if (credentials.expires_at) {
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();
    const bufferMinutes = 5; // Refresh 5 minutes before actual expiration
    const bufferMs = bufferMinutes * 60 * 1000;
    const willExpireSoon = expiresAt.getTime() - now.getTime() < bufferMs;
    
    console.log(`[TMWE-OAuth] 📅 Token expira: ${expiresAt.toISOString()}`);
    
    if (expiresAt < now || willExpireSoon) {
      console.log(`[TMWE-OAuth] ⚠️ Token ${expiresAt < now ? 'expirado' : 'expirará pronto'}`);
      
      // 4. Auto-refresh if enabled
      if (autoRefresh) {
        console.log('[TMWE-OAuth] 🔄 Iniciando auto-refresh...');
        
        try {
          // Invoke tmwe-oauth-refresh edge function
          const { data: refreshData, error: refreshError } = await supabaseClient.functions.invoke(
            'tmwe-oauth-refresh',
            {
              body: { email: userEmail }
            }
          );
          
          if (refreshError) {
            console.error('[TMWE-OAuth] ❌ Error en auto-refresh:', refreshError);
            throw new Error(`Auto-refresh falló: ${refreshError.message}`);
          }
          
          if (!refreshData || refreshData.error) {
            console.error('[TMWE-OAuth] ❌ Refresh retornó error:', refreshData?.error);
            throw new Error(`Auto-refresh falló: ${refreshData?.error || 'Unknown error'}`);
          }
          
          console.log('[TMWE-OAuth] ✅ Token refrescado exitosamente');
          
          // Re-query to get the updated token
          const { data: updatedCredentials, error: reQueryError } = await supabaseClient
            .from('user_tmwe_credentials')
            .select('access_token, expires_at')
            .eq('email', userEmail)
            .eq('token_type', 'oauth')
            .maybeSingle();
          
          if (reQueryError || !updatedCredentials?.access_token) {
            console.error('[TMWE-OAuth] ❌ Error releyendo credenciales actualizadas');
            throw new Error('Token refrescado pero no se pudo releer de la base de datos');
          }
          
          console.log(`[TMWE-OAuth] ✅ Token válido hasta: ${updatedCredentials.expires_at}`);
          return updatedCredentials.access_token;
          
        } catch (refreshError) {
          console.error('[TMWE-OAuth] ❌ Error crítico en auto-refresh:', refreshError);
          
          if (throwOnExpired) {
            throw refreshError;
          }
          
          throw new Error(
            `Token expirado y auto-refresh falló: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}. ` +
            'Por favor, realiza login TMWE nuevamente.'
          );
        }
      } else if (throwOnExpired) {
        // Auto-refresh disabled and throwOnExpired is true
        throw new Error(`Token OAuth expirado para ${userEmail}. Por favor, realiza login TMWE nuevamente.`);
      } else {
        // Auto-refresh disabled but don't throw - just warn
        console.warn('[TMWE-OAuth] ⚠️ Token expirado pero auto-refresh está deshabilitado');
      }
    } else {
      console.log(`[TMWE-OAuth] ✅ Token válido hasta: ${expiresAt.toISOString()}`);
    }
  } else {
    console.log('[TMWE-OAuth] ℹ️ Token sin fecha de expiración (usando como válido)');
  }
  
  return credentials.access_token;
}

/**
 * Extract user email from Authorization header
 * 
 * @param req - HTTP Request object
 * @param supabaseClient - Supabase client instance
 * @returns User email
 * @throws Error if authentication fails
 */
export async function getUserEmailFromRequest(
  req: Request,
  supabaseClient: SupabaseClient
): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('❌ Authorization header mancante - utente non autenticato');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user?.email) {
    console.error('❌ Errore autenticazione:', authError);
    throw new Error('❌ Utente non autenticato o email mancante');
  }
  
  return user.email;
}
