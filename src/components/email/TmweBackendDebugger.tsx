/**
 * TMWE Backend Debugger - Test diretto API backend
 * Per debugging problemi con UID e cartelle
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Bug, Send, Loader2, Info } from 'lucide-react';

export function TmweBackendDebugger() {
  const [folder, setFolder] = useState('lette');
  const [uid, setUid] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGetMessage = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // 🔒 Verifica e forza refresh sessione
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('❌ Non sei autenticato. Fai login con TMWE OAuth prima di usare il debugger.');
        console.error('🔐 Session error:', sessionError);
        return;
      }

      // 🔄 Forza refresh se il token sta per scadere
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      console.log('🔐 [TMWE Debug] Token status:', {
        expiresAt: new Date(expiresAt * 1000).toLocaleString(),
        timeUntilExpiry: `${Math.floor(timeUntilExpiry / 60)} minuti`,
        needsRefresh: timeUntilExpiry < 300
      });

      if (timeUntilExpiry < 300) {
        console.log('🔄 [TMWE Debug] Refreshing token...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          setError(`❌ Errore refresh token: ${refreshError.message}. Fai logout/login.`);
          return;
        }
      }

      // 🧪 Chiama edge function
      console.log('🧪 [TMWE Debug] Testing get_message:', { folder, uid });
      
      const { data, error: fnError } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/email_message',
          data: {
            handler: 'get_message',
            uid,
            folder
          }
        }
      });

      if (fnError) {
        setError(`❌ Edge Function Error: ${fnError.message}`);
        console.error('❌ [TMWE Debug] Edge function error:', fnError);
        return;
      }

      if (data && !data.success) {
        setError(`⚠️ TMWE API ha risposto ma l'operazione è fallita: ${data.errors?.join(', ')}`);
        console.warn('⚠️ [TMWE Debug] TMWE API error:', data.errors);
      } else {
        console.log('✅ [TMWE Debug] Success:', data);
      }

      setResponse(data);

    } catch (err: any) {
      setError(`💥 Exception: ${err.message}`);
      console.error('💥 [TMWE Debug] Exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetMessages = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // 🔒 Verifica e forza refresh sessione
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('❌ Non sei autenticato. Fai login con TMWE OAuth prima di usare il debugger.');
        console.error('🔐 Session error:', sessionError);
        return;
      }

      // 🔄 Forza refresh se il token sta per scadere
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      console.log('🔐 [TMWE Debug] Token status:', {
        expiresAt: new Date(expiresAt * 1000).toLocaleString(),
        timeUntilExpiry: `${Math.floor(timeUntilExpiry / 60)} minuti`,
        needsRefresh: timeUntilExpiry < 300
      });

      if (timeUntilExpiry < 300) {
        console.log('🔄 [TMWE Debug] Refreshing token...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          setError(`❌ Errore refresh token: ${refreshError.message}. Fai logout/login.`);
          return;
        }
      }

      // 🧪 Chiama edge function
      console.log('🧪 [TMWE Debug] Testing get_messages:', { folder });
      
      const { data, error: fnError } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/email_message',
          data: {
            handler: 'get_messages',
            folder,
            limit: 10,
            offset: 0
          }
        }
      });

      if (fnError) {
        setError(`❌ Edge Function Error: ${fnError.message}`);
        console.error('❌ [TMWE Debug] Edge function error:', fnError);
        return;
      }

      if (data && !data.success) {
        setError(`⚠️ TMWE API ha risposto ma l'operazione è fallita: ${data.errors?.join(', ')}`);
        console.warn('⚠️ [TMWE Debug] TMWE API error:', data.errors);
      } else {
        console.log('✅ [TMWE Debug] Success:', data);
      }

      setResponse(data);

    } catch (err: any) {
      setError(`💥 Exception: ${err.message}`);
      console.error('💥 [TMWE Debug] Exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          TMWE Backend Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth Status Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>🔐 Autenticazione Richiesta</AlertTitle>
          <AlertDescription>
            Assicurati di essere loggato con TMWE OAuth prima di usare il debugger.
            Se vedi errori 401/403, fai logout e login di nuovo.
          </AlertDescription>
        </Alert>

        {/* Input Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="folder">Folder</Label>
            <Input
              id="folder"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="es. INBOX, lette"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uid">UID</Label>
            <Input
              id="uid"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="es. 5"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={testGetMessage}
            disabled={isLoading || !folder || !uid}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Test get_message
              </>
            )}
          </Button>
          <Button
            onClick={testGetMessages}
            disabled={isLoading || !folder}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Test get_messages
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">Error:</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Response:</Label>
              {response.success ? (
                <Badge variant="default" className="bg-green-500">Success</Badge>
              ) : (
                <Badge variant="destructive">Failed</Badge>
              )}
            </div>
            <Textarea
              value={JSON.stringify(response, null, 2)}
              readOnly
              className="font-mono text-xs h-64"
            />
            
            {/* Quick Stats */}
            {response.messages && (
              <div className="p-3 rounded-md bg-muted">
                <p className="text-sm font-medium">
                  📊 Found {response.messages.length} messages
                </p>
                {response.messages.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    UIDs: {response.messages.map((m: any) => m.uid).join(', ')}
                  </p>
                )}
              </div>
            )}

            {response.errors && response.errors.length > 0 && (
              <div className="p-3 rounded-md bg-destructive/10">
                <p className="text-sm font-medium text-destructive">
                  ❌ Errors:
                </p>
                {response.errors.map((err: string, idx: number) => (
                  <p key={idx} className="text-xs text-destructive/80 mt-1">
                    • {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 <strong>Come usare:</strong> Inserisci folder e UID, poi clicca "Test get_message" 
            per verificare se quell'email esiste. Usa "Test get_messages" per vedere tutti gli UID disponibili nella cartella.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
