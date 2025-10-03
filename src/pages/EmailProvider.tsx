import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Eye, EyeOff, Save } from 'lucide-react';

const EmailProvider = () => {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [emailConfig, setEmailConfig] = useState({
    id: null,
    provider: '',
    apiKey: '',
    webhookSecret: '',
    inboundRoute: '',
    outboundEndpoint: '',
    dominioInvio: '',
    attivo: false
  });

  useEffect(() => {
    loadEmailConfiguration();
  }, []);

  const loadEmailConfiguration = async () => {
    try {
      const { data: emailData } = await supabase
        .from('email_provider')
        .select('*, email_provider_credenziali(*)')
        .maybeSingle();

      if (emailData) {
        const creds = emailData.email_provider_credenziali;
        setEmailConfig({
          id: emailData.id,
          provider: emailData.provider,
          dominioInvio: emailData.dominio_invio || '',
          inboundRoute: emailData.inbound_route || '',
          outboundEndpoint: emailData.outbound_endpoint || '',
          apiKey: creds?.oauth_token || creds?.api_key || '',
          webhookSecret: creds?.webhook_secret || '',
          attivo: emailData.attivo
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento configurazione email:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la configurazione email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShowSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveEmailConfig = async () => {
    setSaving(true);
    try {
      if (!emailConfig.provider || !emailConfig.apiKey) {
        toast({
          title: "Errore",
          description: "Provider e API Key sono obbligatori",
          variant: "destructive",
        });
        return;
      }

      let emailProviderId = emailConfig.id;

      if (emailConfig.id) {
        const { error: providerError } = await supabase
          .from('email_provider')
          .update({
            provider: emailConfig.provider,
            dominio_invio: emailConfig.dominioInvio,
            inbound_route: emailConfig.inboundRoute,
            outbound_endpoint: emailConfig.outboundEndpoint,
            attivo: emailConfig.attivo
          })
          .eq('id', emailConfig.id);

        if (providerError) throw providerError;

        const { error: credError } = await supabase
          .from('email_provider_credenziali')
          .upsert({
            provider_id: emailConfig.id,
            api_key: emailConfig.apiKey,
            oauth_token: emailConfig.apiKey,
            webhook_secret: emailConfig.webhookSecret
          }, {
            onConflict: 'provider_id'
          });

        if (credError) throw credError;
      } else {
        const { data: providerData, error: providerError } = await supabase
          .from('email_provider')
          .insert({
            provider: emailConfig.provider,
            dominio_invio: emailConfig.dominioInvio,
            inbound_route: emailConfig.inboundRoute,
            outbound_endpoint: emailConfig.outboundEndpoint,
            attivo: emailConfig.attivo
          })
          .select()
          .single();

        if (providerError) throw providerError;
        emailProviderId = providerData.id;

        const { error: credError } = await supabase
          .from('email_provider_credenziali')
          .upsert({
            provider_id: emailProviderId,
            api_key: emailConfig.apiKey,
            oauth_token: emailConfig.apiKey,
            webhook_secret: emailConfig.webhookSecret
          }, {
            onConflict: 'provider_id'
          });

        if (credError) throw credError;

        setEmailConfig(prev => ({ ...prev, id: emailProviderId }));
      }

      toast({
        title: "Successo",
        description: "Configurazione email salvata con successo",
      });
      
      await loadEmailConfiguration();
    } catch (error) {
      console.error('Errore salvataggio email config:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione email",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderSecretField = (label, value, field, onChange, placeholder) => (
    <div className="space-y-1">
      <Label htmlFor={field} className="text-sm">{label}</Label>
      <div className="relative">
        <Input
          id={field}
          type={showSecrets[field] ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10 h-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3"
          onClick={() => toggleShowSecret(field)}
        >
          {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Provider</h1>
            <p className="text-muted-foreground">Caricamento configurazione...</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Mail className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Provider</h1>
          <p className="text-muted-foreground">Configura il provider email per invio e ricezione automatica</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurazione Email Provider</CardTitle>
          <CardDescription>
            Configura il provider email per invio e ricezione automatica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="emailProvider" className="text-sm">Provider Email</Label>
              <Select value={emailConfig.provider} onValueChange={(value) => 
                setEmailConfig(prev => ({ ...prev, provider: value }))
              }>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleziona provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TMWE">TMWE Email API</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="custom">SMTP Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="dominioInvio" className="text-sm">Dominio di Invio</Label>
              <Input
                id="dominioInvio"
                value={emailConfig.dominioInvio}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, dominioInvio: e.target.value }))}
                placeholder="crm.tuodominio.com"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {emailConfig.provider === 'TMWE' ? (
              <>
                {renderSecretField(
                  "TMWE API Token *",
                  emailConfig.apiKey,
                  "emailApiKey",
                  (value) => setEmailConfig(prev => ({ ...prev, apiKey: value })),
                  "Inserisci il tuo token TMWE API"
                )}
                
                <div className="space-y-1">
                  <Label className="text-sm">Configurazione TMWE</Label>
                  <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                    Utilizza il token fornito da TMWE per l'integrazione email
                  </div>
                </div>
              </>
            ) : (
              <>
                {renderSecretField(
                  "API Key",
                  emailConfig.apiKey,
                  "emailApiKey",
                  (value) => setEmailConfig(prev => ({ ...prev, apiKey: value })),
                  "Inserisci la tua API key del provider email"
                )}

                {renderSecretField(
                  "Webhook Secret",
                  emailConfig.webhookSecret,
                  "webhookSecret",
                  (value) => setEmailConfig(prev => ({ ...prev, webhookSecret: value })),
                  "Secret per validazione webhook inbound"
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="inboundRoute" className="text-sm">Route Inbound Email</Label>
              <Input
                id="inboundRoute"
                value={emailConfig.inboundRoute}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, inboundRoute: e.target.value }))}
                placeholder="/api/email/inbound"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="outboundEndpoint" className="text-sm">
                {emailConfig.provider === 'TMWE' ? 'TMWE Endpoint' : 'Endpoint Outbound'}
              </Label>
              <Input
                id="outboundEndpoint"
                value={emailConfig.outboundEndpoint}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, outboundEndpoint: e.target.value }))}
                placeholder={emailConfig.provider === 'TMWE' ? 'https://api.tmwe.it/v1/send' : 'https://api.provider.com/send'}
                className="h-9"
              />
              {emailConfig.provider === 'TMWE' && (
                <div className="text-xs text-muted-foreground">
                  Endpoint predefinito per TMWE API
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="emailAttivo"
                checked={emailConfig.attivo}
                onCheckedChange={(checked) => setEmailConfig(prev => ({ ...prev, attivo: checked }))}
              />
              <Label htmlFor="emailAttivo" className="text-sm">Provider email attivo</Label>
            </div>

            <Button onClick={handleSaveEmailConfig} disabled={saving} className="h-9">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailProvider;
