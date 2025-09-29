import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { crmEvents, crmUtils } from '@/lib/crm/events';
import { TMWESyncTest } from '@/components/email/TMWESyncTest';
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
  Settings as SettingsIcon,
  User,
  Phone
} from 'lucide-react';

const Settings = () => {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');

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
    formatoData: 'DD/MM/YYYY',
    nomeUtente: '',
    cognomeUtente: '',
    emailUtente: '',
    ruoloUtente: 'Utente',
    telefonoUtente: ''
  });

  const [phoneConfig, setPhoneConfig] = useState({
    defaultCountryCode: '+39',
    enableWhatsApp: true,
    whatsAppBusiness: false,
    phoneFormat: 'international',
    autoDetectCountry: true
  });

  // Sincronizza con il hook usePhoneActions
  useEffect(() => {
    const savedConfig = localStorage.getItem('phone_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setPhoneConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading phone config:', error);
      }
    }
  }, []);

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
          formatoData: generalData.formato_data,
          nomeUtente: generalData.nome_utente || '',
          cognomeUtente: generalData.cognome_utente || '',
          emailUtente: generalData.email_utente || '',
          ruoloUtente: generalData.ruolo_utente || 'Utente',
          telefonoUtente: generalData.telefono_utente || ''
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
            oauth_token: emailConfig.apiKey,
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
            oauth_token: emailConfig.apiKey,
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
            formato_data: generalConfig.formatoData,
            nome_utente: generalConfig.nomeUtente,
            cognome_utente: generalConfig.cognomeUtente,
            email_utente: generalConfig.emailUtente,
            ruolo_utente: generalConfig.ruoloUtente,
            telefono_utente: generalConfig.telefonoUtente
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
            formato_data: generalConfig.formatoData,
            nome_utente: generalConfig.nomeUtente,
            cognome_utente: generalConfig.cognomeUtente,
            email_utente: generalConfig.emailUtente,
            ruolo_utente: generalConfig.ruoloUtente,
            telefono_utente: generalConfig.telefonoUtente
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
    // Salva anche le configurazioni phone
    try {
      localStorage.setItem('phone_config', JSON.stringify(phoneConfig));
    } catch (error) {
      console.error('Error saving phone config:', error);
    }

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
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impostazioni CRM</h1>
          <p className="text-sm text-muted-foreground">Configura API keys, provider email e impostazioni AI</p>
        </div>
      </div>

      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Le chiavi API sono archiviate in modo sicuro e crittografato. Non condividere mai le tue chiavi API.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {/* Selector per la sezione */}
        <div className="space-y-1">
          <Label htmlFor="section-select" className="text-sm font-medium">Seleziona Sezione</Label>
          <Select value={activeSection} onValueChange={setActiveSection}>
            <SelectTrigger className="w-full max-w-sm h-9">
              <SelectValue placeholder="Seleziona una sezione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profile">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profilo Utente
                </div>
              </SelectItem>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Provider
                </div>
              </SelectItem>
              <SelectItem value="ai">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI & Classificazione
                </div>
              </SelectItem>
              <SelectItem value="general">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Generale
                </div>
              </SelectItem>
              <SelectItem value="phone">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefono & WhatsApp
                </div>
              </SelectItem>
              <SelectItem value="security">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Sicurezza
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Renderizza la sezione selezionata */}
        {activeSection === 'profile' && (
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Profilo Utente
              </CardTitle>
              <CardDescription className="text-sm">
                Configura i tuoi dati personali. Questi dati verranno automaticamente assegnati a tutte le attività che crei.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Colonna sinistra */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="nomeUtente" className="text-sm">Nome *</Label>
                    <Input
                      id="nomeUtente"
                      value={generalConfig.nomeUtente}
                      onChange={(e) => setGeneralConfig(prev => ({ ...prev, nomeUtente: e.target.value }))}
                      placeholder="Mario"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="emailUtente" className="text-sm">Email *</Label>
                    <Input
                      id="emailUtente"
                      type="email"
                      value={generalConfig.emailUtente}
                      onChange={(e) => setGeneralConfig(prev => ({ ...prev, emailUtente: e.target.value }))}
                      placeholder="mario.rossi@azienda.com"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ruoloUtente" className="text-sm">Ruolo</Label>
                    <Select value={generalConfig.ruoloUtente} onValueChange={(value) => 
                      setGeneralConfig(prev => ({ ...prev, ruoloUtente: value }))
                    }>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleziona ruolo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Utente">Utente</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Amministratore">Amministratore</SelectItem>
                        <SelectItem value="Commerciale">Commerciale</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Colonna destra */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="cognomeUtente" className="text-sm">Cognome *</Label>
                    <Input
                      id="cognomeUtente"
                      value={generalConfig.cognomeUtente}
                      onChange={(e) => setGeneralConfig(prev => ({ ...prev, cognomeUtente: e.target.value }))}
                      placeholder="Rossi"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="telefonoUtente" className="text-sm">Telefono</Label>
                    <Input
                      id="telefonoUtente"
                      value={generalConfig.telefonoUtente}
                      onChange={(e) => setGeneralConfig(prev => ({ ...prev, telefonoUtente: e.target.value }))}
                      placeholder="+39 123 456 7890"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <Alert className="mt-3">
                <User className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Auto-assegnazione:</strong> Tutte le attività che crei verranno automaticamente assegnate a te. 
                  Il nome completo "{generalConfig.nomeUtente} {generalConfig.cognomeUtente}" apparirà nel campo "Assegnato a".
                </AlertDescription>
              </Alert>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveGeneralConfig} disabled={saving} className="h-9">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvataggio...' : 'Salva Profilo'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configurazione Email Provider */}
        {activeSection === 'email' && (
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Configurazione Email Provider
              </CardTitle>
              <CardDescription className="text-sm">
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
                  {saving ? 'Salvataggio...' : 'Salva Configurazione'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test TMWE Integration */}
        {activeSection === 'email' && (
          <div className="mt-6">
            <TMWESyncTest />
          </div>
        )}

        {/* Configurazione Telefono & WhatsApp */}
        {activeSection === 'phone' && (
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5" />
                Impostazioni Telefono & WhatsApp
              </CardTitle>
              <CardDescription className="text-sm">
                Configura le impostazioni per chiamate telefoniche e messaggi WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="defaultCountryCode">Prefisso Paese Predefinito</Label>
                    <Select
                      value={phoneConfig.defaultCountryCode}
                      onValueChange={(value) => setPhoneConfig(prev => ({ ...prev, defaultCountryCode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+39">🇮🇹 +39 (Italia)</SelectItem>
                        <SelectItem value="+1">🇺🇸 +1 (USA/Canada)</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44 (Regno Unito)</SelectItem>
                        <SelectItem value="+33">🇫🇷 +33 (Francia)</SelectItem>
                        <SelectItem value="+49">🇩🇪 +49 (Germania)</SelectItem>
                        <SelectItem value="+34">🇪🇸 +34 (Spagna)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="phoneFormat">Formato Numero</Label>
                    <Select
                      value={phoneConfig.phoneFormat}
                      onValueChange={(value) => setPhoneConfig(prev => ({ ...prev, phoneFormat: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="international">Internazionale (+39 333 1234567)</SelectItem>
                        <SelectItem value="national">Nazionale (333 1234567)</SelectItem>
                        <SelectItem value="local">Locale (333-1234567)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Abilita WhatsApp</Label>
                      <div className="text-sm text-muted-foreground">
                        Permetti l'invio di messaggi tramite WhatsApp
                      </div>
                    </div>
                    <Switch
                      checked={phoneConfig.enableWhatsApp}
                      onCheckedChange={(checked) => setPhoneConfig(prev => ({ ...prev, enableWhatsApp: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>WhatsApp Business</Label>
                      <div className="text-sm text-muted-foreground">
                        Utilizza WhatsApp Business per i contatti
                      </div>
                    </div>
                    <Switch
                      checked={phoneConfig.whatsAppBusiness}
                      onCheckedChange={(checked) => setPhoneConfig(prev => ({ ...prev, whatsAppBusiness: checked }))}
                      disabled={!phoneConfig.enableWhatsApp}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Rileva Paese</Label>
                      <div className="text-sm text-muted-foreground">
                        Rileva automaticamente il paese dal numero
                      </div>
                    </div>
                    <Switch
                      checked={phoneConfig.autoDetectCountry}
                      onCheckedChange={(checked) => setPhoneConfig(prev => ({ ...prev, autoDetectCountry: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-2">Come funziona</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Clicca sull'icona telefono nelle attività per aprire il menu di contatto</li>
                      <li>• Scegli tra chiamata telefonica diretta o messaggio WhatsApp</li>
                      <li>• I numeri vengono automaticamente formattati secondo le impostazioni</li>
                      <li>• WhatsApp si aprirà in una nuova finestra del browser</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => {
                  toast({
                    title: "Impostazioni Salvate",
                    description: "Le impostazioni telefono sono state salvate con successo.",
                  });
                }}>
                  <Save className="h-4 w-4 mr-1" />
                  Salva Impostazioni
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configurazione AI */}
        {activeSection === 'ai' && (
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
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                      <SelectItem value="perplexity">Perplexity</SelectItem>
                      <SelectItem value="cohere">Cohere</SelectItem>
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
                          <SelectItem value="gpt-5-2025-08-07">GPT-5 (Latest)</SelectItem>
                          <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                          <SelectItem value="gpt-5-nano-2025-08-07">GPT-5 Nano</SelectItem>
                          <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                          <SelectItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini</SelectItem>
                          <SelectItem value="o3-2025-04-16">O3 (Reasoning)</SelectItem>
                          <SelectItem value="o4-mini-2025-04-16">O4 Mini (Reasoning)</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </>
                      )}
                      {aiConfig.provider === 'claude' && (
                        <>
                          <SelectItem value="claude-opus-4-1-20250805">Claude Opus 4.1 (Latest)</SelectItem>
                          <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                          <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                          <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</SelectItem>
                          <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                          <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                          <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                          <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                        </>
                      )}
                      {aiConfig.provider === 'gemini' && (
                        <>
                          <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                          <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                          <SelectItem value="gemini-pro-vision">Gemini Pro Vision</SelectItem>
                        </>
                      )}
                      {aiConfig.provider === 'mistral' && (
                        <>
                          <SelectItem value="mistral-large-2411">Mistral Large (Latest)</SelectItem>
                          <SelectItem value="mistral-small-2409">Mistral Small</SelectItem>
                          <SelectItem value="codestral-2405">Codestral</SelectItem>
                          <SelectItem value="mixtral-8x7b">Mixtral 8x7B</SelectItem>
                        </>
                      )}
                      {aiConfig.provider === 'perplexity' && (
                        <>
                          <SelectItem value="llama-3.1-sonar-large-128k-online">Llama 3.1 Sonar Large (Online)</SelectItem>
                          <SelectItem value="llama-3.1-sonar-small-128k-online">Llama 3.1 Sonar Small (Online)</SelectItem>
                          <SelectItem value="llama-3.1-sonar-huge-128k-online">Llama 3.1 Sonar Huge (Online)</SelectItem>
                        </>
                      )}
                      {aiConfig.provider === 'cohere' && (
                        <>
                          <SelectItem value="command-r-plus">Command R+</SelectItem>
                          <SelectItem value="command-r">Command R</SelectItem>
                          <SelectItem value="command">Command</SelectItem>
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
        )}

        {/* Configurazioni Generali */}
        {activeSection === 'general' && (
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
        )}

        {/* Sicurezza */}
        {activeSection === 'security' && (
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
        )}
      </div>
    </div>
  );
};

export default Settings;