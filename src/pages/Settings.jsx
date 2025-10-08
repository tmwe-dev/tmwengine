import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { crmEvents, crmUtils } from '@/lib/crm/events';
import { supabase } from '@/integrations/supabase/client';
import { TMWEProfileSync } from '@/components/settings/TMWEProfileSync';
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
  Phone,
  Info
} from 'lucide-react';

const Settings = () => {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState({});
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');


  const [aiConfigs, setAiConfigs] = useState([]);
  const [newAiConfig, setNewAiConfig] = useState({
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

  const [voiceAgentConfig, setVoiceAgentConfig] = useState({
    elevenLabsApiKey: '',
    agentId: '',
    enabled: false
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

    const savedVoiceAgent = localStorage.getItem('voice_agent_config');
    if (savedVoiceAgent) {
      try {
        const parsed = JSON.parse(savedVoiceAgent);
        setVoiceAgentConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading voice agent config:', error);
      }
    }
  }, []);

  // Carica le configurazioni esistenti
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      // Carica tutte le configurazioni AI
      const { data: aiData } = await supabase
        .from('config_ai')
        .select('*')
        .order('created_at', { ascending: false });

      if (aiData) {
        setAiConfigs(aiData.map(config => ({
          id: config.id,
          provider: config.provider,
          modello: config.modello,
          apiKey: config.api_key,
          attivo: config.attivo
        })));
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


  const handleAddAiConfig = async () => {
    setSaving(true);
    try {
      if (!newAiConfig.provider || !newAiConfig.modello || !newAiConfig.apiKey) {
        toast({
          title: "Errore",
          description: "Provider, modello e API Key sono obbligatori",
          variant: "destructive",
        });
        return;
      }

      // Se questo sarà l'unico config attivo, disattiva gli altri
      if (newAiConfig.attivo) {
        await supabase
          .from('config_ai')
          .update({ attivo: false })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Disattiva tutti
      }

      // Crea nuova configurazione
      const { error } = await supabase
        .from('config_ai')
        .insert({
          provider: newAiConfig.provider,
          modello: newAiConfig.modello,
          api_key: newAiConfig.apiKey,
          attivo: newAiConfig.attivo
        });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Configurazione AI aggiunta con successo",
      });

      // Reset form
      setNewAiConfig({
        provider: '',
        modello: '',
        apiKey: '',
        attivo: false
      });

      // Ricarica configurazioni
      await loadConfigurations();
    } catch (error) {
      console.error('Errore aggiunta AI config:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere la configurazione AI",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAiConfig = async (configId, currentStatus) => {
    try {
      // Se stiamo attivando questo config, disattiviamo gli altri
      if (!currentStatus) {
        await supabase
          .from('config_ai')
          .update({ attivo: false })
          .neq('id', configId);
      }

      // Toggle dello stato attuale
      const { error } = await supabase
        .from('config_ai')
        .update({ attivo: !currentStatus })
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: `Configurazione ${!currentStatus ? 'attivata' : 'disattivata'}`,
      });

      // Ricarica configurazioni
      await loadConfigurations();
    } catch (error) {
      console.error('Errore toggle AI config:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la configurazione",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAiConfig = async (configId) => {
    try {
      const { error } = await supabase
        .from('config_ai')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Configurazione AI eliminata",
      });

      // Ricarica configurazioni
      await loadConfigurations();
    } catch (error) {
      console.error('Errore eliminazione AI config:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la configurazione",
        variant: "destructive",
      });
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Impostazioni CRM</h1>
            <p className="text-sm text-muted-foreground">Configura API keys, provider email e impostazioni AI</p>
          </div>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-5 w-5 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                ✅ <strong>Configurazione permanente attiva:</strong> Tutte le chiavi API sono salvate in modo sicuro e non dovrai mai più reinserirle. Il sistema le utilizza automaticamente per ogni operazione.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

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
              <SelectItem value="voiceagent">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Voice Agent (ElevenLabs)
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
          <div className="space-y-4">
            {/* Componente de sincronización TMWE */}
            <TMWEProfileSync />
            
            {/* Card de perfil local existente */}
            <Card className="w-full bg-card-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Perfil Local (Manual)
                </CardTitle>
                <CardDescription className="text-sm">
                  Edita manualmente tus datos personales. Estos datos se asignarán automáticamente a todas las actividades que crees.
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
          </div>
        )}


        {/* Configurazione Voice Agent */}
        {activeSection === 'voiceagent' && (
          <Card className="w-full bg-card-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5" />
                Voice Agent - ElevenLabs
              </CardTitle>
              <CardDescription className="text-sm">
                Configura l'agente vocale ElevenLabs per interazioni AI via voce
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {renderSecretField(
                  "ElevenLabs API Key *",
                  voiceAgentConfig.elevenLabsApiKey,
                  "elevenLabsApiKey",
                  (value) => setVoiceAgentConfig(prev => ({ ...prev, elevenLabsApiKey: value })),
                  "Inserisci la tua API key di ElevenLabs"
                )}

                <div className="space-y-1">
                  <Label htmlFor="agentId" className="text-sm">Agent ID *</Label>
                  <Input
                    id="agentId"
                    value={voiceAgentConfig.agentId}
                    onChange={(e) => setVoiceAgentConfig(prev => ({ ...prev, agentId: e.target.value }))}
                    placeholder="Inserisci l'Agent ID creato su ElevenLabs"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puoi trovare l'Agent ID nel tuo dashboard ElevenLabs dopo aver creato un agente
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Abilita Voice Agent</Label>
                    <div className="text-sm text-muted-foreground">
                      Attiva l'agente vocale nell'applicazione
                    </div>
                  </div>
                  <Switch
                    checked={voiceAgentConfig.enabled}
                    onCheckedChange={(checked) => setVoiceAgentConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>
              </div>

              <Alert className="mt-4">
                <Bot className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Come configurare:</strong> Crea un agente su ElevenLabs, configura i Client Tools come da documentazione, 
                  poi inserisci API Key e Agent ID qui. L'agente potrà gestire email, attività CRM e invio email template.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end pt-2">
                <Button onClick={() => {
                  localStorage.setItem('voice_agent_config', JSON.stringify(voiceAgentConfig));
                  toast({
                    title: "Successo",
                    description: "Configurazione Voice Agent salvata con successo",
                  });
                }} className="h-9">
                  <Save className="h-4 w-4 mr-2" />
                  Salva Configurazione
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configurazione Telefono & WhatsApp */}
        {activeSection === 'phone' && (
          <Card className="w-full bg-card-transparent">
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
          <Card className="bg-card-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Servizi AI Configurati
              </CardTitle>
              <CardDescription>
                Gestisci multipli provider AI per classificazione automatica email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lista configurazioni esistenti */}
              {aiConfigs.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Servizi AI Attivi</Label>
                  {aiConfigs.map((config) => (
                    <Card key={config.id} className="border-2 bg-card-transparent">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{config.provider}</span>
                              {config.attivo && (
                                <Badge variant="default" className="text-xs">Attivo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{config.modello}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={config.attivo}
                              onCheckedChange={() => handleToggleAiConfig(config.id, config.attivo)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAiConfig(config.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Form nuova configurazione */}
              <div className="border-t pt-6 space-y-4">
                <Label className="text-sm font-medium">Aggiungi Nuovo Servizio AI</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="newAiProvider" className="text-sm">Provider AI</Label>
                    <Select 
                      value={newAiConfig.provider} 
                      onValueChange={(value) => setNewAiConfig(prev => ({ ...prev, provider: value }))}
                    >
                      <SelectTrigger className="h-9 w-[60%]">
                        <SelectValue placeholder="Seleziona provider AI" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                        <SelectItem value="google">Google AI</SelectItem>
                        <SelectItem value="mistral">Mistral AI</SelectItem>
                        <SelectItem value="perplexity">Perplexity</SelectItem>
                        <SelectItem value="cohere">Cohere</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="newAiModello" className="text-sm">Modello</Label>
                    <div className="flex items-center gap-2">
                      <Select 
                        value={newAiConfig.modello} 
                        onValueChange={(value) => setNewAiConfig(prev => ({ ...prev, modello: value }))}
                      >
                        <SelectTrigger className="h-9 w-[60%]">
                          <SelectValue placeholder="Seleziona modello" />
                        </SelectTrigger>
                        <SelectContent>
                          {newAiConfig.provider === 'openai' && (
                            <>
                              <SelectItem value="gpt-5-2025-08-07">GPT-5 (Latest)</SelectItem>
                              <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                              <SelectItem value="gpt-5-nano-2025-08-07">GPT-5 Nano</SelectItem>
                              <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                              <SelectItem value="o3-2025-04-16">O3 (Reasoning)</SelectItem>
                              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                            </>
                          )}
                          {newAiConfig.provider === 'claude' && (
                            <>
                              <SelectItem value="claude-opus-4-1-20250805">Claude Opus 4.1</SelectItem>
                              <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                              <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                            </>
                          )}
                          {newAiConfig.provider === 'gemini' && (
                            <>
                              <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash</SelectItem>
                              <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                              <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                            </>
                          )}
                          {newAiConfig.provider === 'mistral' && (
                            <>
                              <SelectItem value="mistral-large-2411">Mistral Large</SelectItem>
                              <SelectItem value="mistral-small-2409">Mistral Small</SelectItem>
                            </>
                          )}
                          {newAiConfig.provider === 'perplexity' && (
                            <>
                              <SelectItem value="llama-3.1-sonar-large-128k-online">Llama 3.1 Sonar Large</SelectItem>
                              <SelectItem value="llama-3.1-sonar-small-128k-online">Llama 3.1 Sonar Small</SelectItem>
                            </>
                          )}
                          {newAiConfig.provider === 'cohere' && (
                            <>
                              <SelectItem value="command-r-plus">Command R+</SelectItem>
                              <SelectItem value="command-r">Command R</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      
                      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-12 w-12 p-0 ml-4"
                          >
                            <Key className="h-7 w-7 text-yellow-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aggiungi API Key</DialogTitle>
                            <DialogDescription>
                              Inserisci la tua API key per {newAiConfig.provider}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="apiKeyInput">API Key</Label>
                              <div className="relative">
                                <Input
                                  id="apiKeyInput"
                                  type={showSecrets['dialogApiKey'] ? "text" : "password"}
                                  value={newAiConfig.apiKey}
                                  onChange={(e) => setNewAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                  placeholder="Inserisci la tua API key"
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowSecrets(prev => ({ ...prev, dialogApiKey: !prev.dialogApiKey }))}
                                >
                                  {showSecrets['dialogApiKey'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <Button 
                              onClick={() => setShowApiKeyDialog(false)} 
                              className="w-full"
                            >
                              Salva
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <div className="flex items-center gap-2">
                        <Switch
                          id="newAiAttivo"
                          checked={newAiConfig.attivo}
                          onCheckedChange={(checked) => setNewAiConfig(prev => ({ ...prev, attivo: checked }))}
                        />
                        {newAiConfig.attivo && (
                          <span className="text-xs text-success">Servizio attivo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button onClick={handleAddAiConfig} disabled={saving} className="h-9">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Aggiunta...' : 'Aggiungi Servizio'}
                  </Button>
                </div>
              </div>

              <Alert>
                <Bot className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Puoi configurare multipli servizi AI e scegliere quale usare attivandolo. Solo un servizio può essere attivo alla volta.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Configurazioni Generali */}
        {activeSection === 'general' && (
          <Card className="bg-card-transparent">
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
          <Card className="bg-card-transparent">
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