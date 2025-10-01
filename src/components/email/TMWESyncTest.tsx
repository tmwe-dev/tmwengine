import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Mail, Send, Webhook } from 'lucide-react';

interface SyncResult {
  success: boolean;
  sync_log_id?: string;
  emails_sincronizzate?: number;
  emails_nuove?: number;
  messages_found?: number;
  error?: string;
}

interface SendResult {
  success: boolean;
  message_id?: string;
  error?: string;
  error_details?: {
    status: number;
    status_text: string;
    response_body: string;
    headers: Record<string, string>;
  };
  debug?: {
    api_status: number;
    api_status_text: string;
    url_used: string;
    api_response_text: string;
    [key: string]: any;
  };
}

export function TMWESyncTest() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  
  const [syncAction, setSyncAction] = useState('incremental_sync');
  const [folderName, setFolderName] = useState('INBOX');
  
  const [emailData, setEmailData] = useState({
    to: 'test@example.com',
    subject: 'Test TMWE Integration',
    body_text: 'Questo è un test di invio email tramite API TMWE'
  });

  const handleDownloadEmails = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    
    try {
      console.log('Download email tramite tmwe-email-sync-master...');
      
      const { data, error } = await supabase.functions.invoke('tmwe-email-sync-master', {
        body: { 
          mode: 'initial',
          folder_name: folderName,
          max_emails: 1000,
          force_full: false
        }
      });

      if (error) throw error;
      
      setSyncResult({
        success: data.success,
        emails_sincronizzate: data.emails_downloaded || 0,
        emails_nuove: data.emails_downloaded || 0,
        sync_log_id: data.sync_log_id,
        messages_found: data.emails_downloaded || 0
      });
      
      if (data.success) {
        toast.success(`Download completato! ${data.emails_downloaded} email scaricate`);
      } else {
        toast.error(`Errore download: ${data.error}`);
      }
      
    } catch (error) {
      console.error('Errore download:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setSyncResult({ success: false, error: errorMessage });
      toast.error(`Errore: ${errorMessage}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setSendLoading(true);
    setSendResult(null);
    
    try {
      console.log('Invio email tramite TMWE...', emailData);
      
      const { data, error } = await supabase.functions.invoke('tmwe-email-send', {
        body: emailData
      });

      if (error) throw error;
      
      setSendResult(data);
      
      if (data.success) {
        toast.success(`Email inviata! Message ID: ${data.message_id}`);
      } else {
        // Extract detailed error information
        const errorMessage = data.error || 
          (data.error_details ? `${data.error_details.status} ${data.error_details.status_text}` : 'Errore sconosciuto');
        
        const debugInfo = data.debug ? 
          `Status: ${data.debug.api_status}, URL: ${data.debug.url_used}, Response: ${data.debug.api_response_text || 'Empty'}` : 
          'Debug info non disponibile';
          
        toast.error(`Errore invio: ${errorMessage}`, {
          description: debugInfo,
          duration: 10000
        });
      }
      
    } catch (error) {
      console.error('Errore invio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setSendResult({ success: false, error: errorMessage });
      toast.error(`Errore: ${errorMessage}`);
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Sincronizzazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Download Email TMWE
          </CardTitle>
          <CardDescription>
            Testa il download email tramite API TMWE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Cartella</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="INBOX"
            />
          </div>
          
          <Button 
            onClick={handleDownloadEmails} 
            disabled={syncLoading}
            className="w-full"
          >
            {syncLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Download in corso...
              </>
            ) : (
              'Scarica Email'
            )}
          </Button>
          
          {syncResult && (
            <div className="mt-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                {syncResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {syncResult.success ? 'Successo' : 'Errore'}
                </span>
              </div>
              {syncResult.success ? (
                <div className="space-y-1 text-sm">
                  <div>Email sincronizzate: <Badge variant="outline">{syncResult.emails_sincronizzate}</Badge></div>
                  <div>Email nuove: <Badge variant="secondary">{syncResult.emails_nuove}</Badge></div>
                  <div>Log ID: <code className="text-xs">{syncResult.sync_log_id}</code></div>
                </div>
              ) : (
                <div className="text-sm text-red-600">{syncResult.error}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Invio Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Invio Email TMWE
          </CardTitle>
          <CardDescription>
            Testa l'invio email tramite API TMWE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emailTo">Destinatario</Label>
              <Input
                id="emailTo"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                placeholder="destinatario@esempio.com"
                type="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailSubject">Oggetto</Label>
              <Input
                id="emailSubject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Oggetto dell'email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailBody">Messaggio</Label>
              <textarea
                id="emailBody"
                value={emailData.body_text}
                onChange={(e) => setEmailData(prev => ({ ...prev, body_text: e.target.value }))}
                placeholder="Contenuto dell'email..."
                className="w-full h-24 p-3 border rounded-md resize-none bg-transparent"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSendEmail} 
            disabled={sendLoading}
            className="w-full"
          >
            {sendLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Invio in corso...
              </>
            ) : (
              'Invia Email Test'
            )}
          </Button>
          
          {sendResult && (
            <div className="mt-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                {sendResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {sendResult.success ? 'Email Inviata' : 'Errore Invio'}
                </span>
              </div>
              {sendResult.success ? (
                <div className="text-sm">
                  Message ID: <code className="text-xs bg-muted p-1 rounded">{sendResult.message_id}</code>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-red-600">{sendResult.error || 'Errore sconosciuto'}</div>
                  {sendResult.error_details && (
                    <div className="text-xs text-muted-foreground">
                      <div>Status: {sendResult.error_details.status} {sendResult.error_details.status_text}</div>
                      <div>Response: {sendResult.error_details.response_body || 'Empty response'}</div>
                    </div>
                  )}
                  {sendResult.debug && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Debug Info</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(sendResult.debug, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook TMWE
          </CardTitle>
          <CardDescription>
            Endpoint per ricezione email in tempo reale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm">
              <strong>URL Webhook (pubblico):</strong>
            </div>
            <code className="block text-xs bg-muted p-3 rounded border">
              https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/tmwe-email-webhook
            </code>
            <div className="text-xs text-muted-foreground">
              Configura questo URL nel pannello TMWE per ricevere notifiche email in tempo reale
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}