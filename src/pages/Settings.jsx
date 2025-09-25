import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { crmEvents, crmUtils } from '@/lib/crm/events';
import { supabase } from '@/integrations/supabase/client';
import { 
  Key, 
  Mail, 
  Bot, 
  Database, 
  Globe,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Settings as SettingsIcon
} from 'lucide-react';

const Settings = () => {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stati per le configurazioni
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

  const [aiConfig, setAiConfig] = useState({
    id: null,
    provider: '',
    modello: '',
    apiKey: '',
    attivo: false
  });

  const [generalConfig, setGeneralConfig] = useState({
    id: null,
    maxEmailGiorno: 100,
    timezoneFuso: 'Europe/Rome',
    linguaPredefinita: 'it',
    formatoData: 'DD/MM/YYYY'
  });

  // Carica le configurazioni esistenti
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      // Carica configurazione AI
      const { data: aiData } = await supabase
        .from('config_ai')
        .select('*')
        .maybeSingle();

      if (aiData) {
        setAiConfig({
          id: aiData.id,
          provider: aiData.provider,
          modello: aiData.modello,
          apiKey: aiData.api_key,
          attivo: aiData.attivo
        });
      }

      // Carica configurazione email
      const { data: emailData } = await supabase
        .from('email_provider')
        .select('*, email_provider_credenziali(*)')
        .maybeSingle();

      if (emailData) {
        setEmailConfig({
          id: emailData.id,
          provider: emailData.provider,
          dominioInvio: emailData.dominio_invio || '',
          inboundRoute: emailData.inbound_route || '',
          outboundEndpoint: emailData.outbound_endpoint || '',
          apiKey: emailData.email_provider_credenziali?.[0]?.api_key || '',
          webhookSecret: emailData.email_provider_credenziali?.[0]?.webhook_secret || '',
          attivo: emailData.attivo
        });
      }

      // Carica configurazione generale
      const { data: generalData } = await supabase
        .from('config_generale')
        .select('*')
        .maybeSingle();

      if (generalData) {
        setGeneralConfig({
          id: generalData.id,
          maxEmailGiorno: generalData.max_email_giorno,
          timezoneFuso: generalData.timezone_fuso,
          linguaPredefinita: generalData.lingua_predefinita,
          formatoData: generalData.formato_data
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento configurazioni:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le configurazioni",
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
        // Aggiorna configurazione esistente
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

        // Aggiorna credenziali
        const { error: credError } = await supabase
          .from('email_provider_credenziali')
          .upsert({
            provider_id: emailConfig.id,
            api_key: emailConfig.apiKey,
            webhook_secret: emailConfig.webhookSecret
          });

        if (credError) throw credError;
      } else {
        // Crea nuova configurazione
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

        // Crea credenziali
        const { error: credError } = await supabase
          .from('email_provider_credenziali')
          .insert({
            provider_id: emailProviderId,
            api_key: emailConfig.apiKey,
            webhook_secret: emailConfig.webhookSecret
          });

        if (credError) throw credError;

        setEmailConfig(prev => ({ ...prev, id: emailProviderId }));
      }

      toast({
        title: "Successo",
        description: "Configurazione email salvata con successo",
      });
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

  const handleSaveAiConfig = async () => {
    setSaving(true);
    try {
      if (!aiConfig.provider || !aiConfig.modello || !aiConfig.apiKey) {
        toast({
          title: "Errore",
          description: "Provider, modello e API Key sono obbligatori",
          variant: "destructive",
        });
        return;
      }

      if (aiConfig.id) {
        // Aggiorna configurazione esistente
        const { error } = await supabase
          .from('config_ai')
          .update({
            provider: aiConfig.provider,
            modello: aiConfig.modello,
            api_key: aiConfig.apiKey,
            attivo: aiConfig.attivo
          })
          .eq('id', aiConfig.id);

        if (error) throw error;
      } else {
        // Crea nuova configurazione
        const { data, error } = await supabase
          .from('config_ai')
          .insert({
            provider: aiConfig.provider,
            modello: aiConfig.modello,
            api_key: aiConfig.apiKey,
            attivo: aiConfig.attivo
          })
          .select()
          .single();

        if (error) throw error;
        setAiConfig(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Successo",
        description: "Configurazione AI salvata con successo",
      });
    } catch (error) {
      console.error('Errore salvataggio AI config:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione AI",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneralConfig = async () => {
    setSaving(true);
    try {
      if (generalConfig.id) {
        // Aggiorna configurazione esistente
        const { error } = await supabase
          .from('config_generale')
          .update({
            max_email_giorno: generalConfig.maxEmailGiorno,
            timezone_fuso: generalConfig.timezoneFuso,
            lingua_predefinita: generalConfig.linguaPredefinita,
            formato_data: generalConfig.formatoData
          })
          .eq('id', generalConfig.id);

        if (error) throw error;
      } else {
        // Crea nuova configurazione
        const { data, error } = await supabase
          .from('config_generale')
          .insert({
            max_email_giorno: generalConfig.maxEmailGiorno,
            timezone_fuso: generalConfig.timezoneFuso,
            lingua_predefinita: generalConfig.linguaPredefinita,
            formato_data: generalConfig.formatoData
          })
          .select()
          .single();

        if (error) throw error;
        setGeneralConfig(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Successo",
        description: "Configurazioni generali salvate con successo",
      });
    } catch (error) {
      console.error('Errore salvataggio config generale:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le configurazioni generali",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderSecretField = (label, value, field, onChange, placeholder) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <div className="relative">
        <Input
          id={field}
          type={showSecrets[field] ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
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
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Impostazioni CRM</h1>
            <p className="text-muted-foreground">Caricamento configurazioni...</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Impostazioni CRM</h1>
          <p className="text-muted-foreground">Configura API keys, provider email e impostazioni AI</p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Le chiavi API sono archiviate in modo sicuro e crittografato. Non condividere mai le tue chiavi API.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Provider
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI & Classificazione
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Generale
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Sicurezza
          </TabsTrigger>
        </TabsList>

        {/* Configurazione Email Provider */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configurazione Email Provider
              </CardTitle>
              <CardDescription>
                Configura il provider email per invio e ricezione automatica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emailProvider">Provider Email</Label>
                  <Select value={emailConfig.provider} onValueChange={(value) => 
                    setEmailConfig(prev => ({ ...prev, provider: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="ses">Amazon SES</SelectItem>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="custom">SMTP Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dominioInvio">Dominio di Invio</Label>
                  <Input
                    id="dominioInvio"
                    value={emailConfig.dominioInvio}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, dominioInvio: e.target.value }))}
                    placeholder="crm.tuodominio.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="inboundRoute">Route Inbound Email</Label>
                  <Input
                    id="inboundRoute"
                    value={emailConfig.inboundRoute}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, inboundRoute: e.target.value }))}
                    placeholder="/api/email/inbound"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outboundEndpoint">Endpoint Outbound</Label>
                  <Input
                    id="outboundEndpoint"
                    value={emailConfig.outboundEndpoint}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, outboundEndpoint: e.target.value }))}
                    placeholder="https://api.provider.com/send"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emailAttivo"
                    checked={emailConfig.attivo}
                    onCheckedChange={(checked) => setEmailConfig(prev => ({ ...prev, attivo: checked }))}
                  />
                  <Label htmlFor="emailAttivo">Provider email attivo</Label>
                </div>

                <Button onClick={handleSaveEmailConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvataggio...' : 'Salva Configurazione'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurazione AI */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Configurazione AI per Classificazione Email
              </CardTitle>
              <CardDescription>
                Configura il provider AI per classificazione automatica email inbound
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aiProvider">Provider AI</Label>
                  <Select value={aiConfig.provider} onValueChange={(value) => 
                    setAiConfig(prev => ({ ...prev, provider: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona provider AI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatgpt">OpenAI ChatGPT</SelectItem>
                      <SelectItem value="claude">Anthropic Claude</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiModello">Modello</Label>
                  <Select value={aiConfig.modello} onValueChange={(value) => 
                    setAiConfig(prev => ({ ...prev, modello: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona modello" />
                    </SelectTrigger>
                    <SelectContent>
                      {aiConfig.provider === 'chatgpt' && (
                        <>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </>
                      )}
                      {aiConfig.provider === 'claude' && (
                        <>
                          <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                          <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        </>
                      )}
                      {aiConfig.provider === 'gemini' && (
                        <>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                          <SelectItem value="gemini-pro-vision">Gemini Pro Vision</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {renderSecretField(
                "API Key AI",
                aiConfig.apiKey,
                "aiApiKey",
                (value) => setAiConfig(prev => ({ ...prev, apiKey: value })),
                "Inserisci la tua API key del provider AI"
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="aiAttivo"
                    checked={aiConfig.attivo}
                    onCheckedChange={(checked) => setAiConfig(prev => ({ ...prev, attivo: checked }))}
                  />
                  <Label htmlFor="aiAttivo">Classificazione AI attiva</Label>
                </div>

                <Button onClick={handleSaveAiConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvataggio...' : 'Salva Configurazione'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurazioni Generali */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurazioni Generali
              </CardTitle>
              <CardDescription>
                Impostazioni generali del sistema CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxEmailGiorno">Max Email al Giorno</Label>
                  <Input
                    id="maxEmailGiorno"
                    type="number"
                    value={generalConfig.maxEmailGiorno}
                    onChange={(e) => setGeneralConfig(prev => ({ ...prev, maxEmailGiorno: parseInt(e.target.value) }))}
                    min="1"
                    max="10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezoneFuso">Fuso Orario</Label>
                  <Select value={generalConfig.timezoneFuso} onValueChange={(value) => 
                    setGeneralConfig(prev => ({ ...prev, timezoneFuso: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Rome">Europa/Roma</SelectItem>
                      <SelectItem value="Europe/London">Europa/Londra</SelectItem>
                      <SelectItem value="America/New_York">America/New York</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linguaPredefinita">Lingua Predefinita</Label>
                  <Select value={generalConfig.linguaPredefinita} onValueChange={(value) => 
                    setGeneralConfig(prev => ({ ...prev, linguaPredefinita: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formatoData">Formato Data</Label>
                  <Select value={generalConfig.formatoData} onValueChange={(value) => 
                    setGeneralConfig(prev => ({ ...prev, formatoData: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneralConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvataggio...' : 'Salva Configurazioni'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sicurezza */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Sicurezza e Conformità
              </CardTitle>
              <CardDescription>
                Impostazioni di sicurezza e conformità GDPR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Tutte le credenziali sono crittografate con AES-256 e archiviate in modo sicuro.
                  Mai hardcodare chiavi API nel codice sorgente.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Conformità GDPR</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Minimizzazione dati: raccolta solo dati necessari</li>
                  <li>• Consenso esplicito per marketing email</li>
                  <li>• Diritto all'oblio implementato</li>
                  <li>• Portabilità dati garantita</li>
                  <li>• Lista soppressioni per bounce/complaints automatica</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Sicurezza Email</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Unsubscribe obbligatorio in tutte le campagne</li>
                  <li>• Firma webhook per email inbound</li>
                  <li>• Rate limiting automatico</li>
                  <li>• Blacklist domini maliciosi</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;