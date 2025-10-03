import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, User, Phone, Save } from 'lucide-react';

const GeneralConfig = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadGeneralConfiguration();
  }, []);

  const loadGeneralConfiguration = async () => {
    try {
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
      console.error('Errore nel caricamento configurazione generale:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la configurazione generale",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneralConfig = async () => {
    setSaving(true);
    try {
      if (generalConfig.id) {
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
      toast({
        title: "Errore",
        description: "Impossibile salvare le configurazioni generali",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurazioni Generali</h1>
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurazioni Generali</h1>
          <p className="text-muted-foreground">Gestisci profilo utente e impostazioni generali del CRM</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profilo Utente
          </CardTitle>
          <CardDescription>
            Configura i tuoi dati personali. Questi dati verranno automaticamente assegnati a tutte le attività che crei.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impostazioni Sistema</CardTitle>
          <CardDescription>
            Configura formati e preferenze generali del CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="linguaPredefinita" className="text-sm">Lingua</Label>
              <Select value={generalConfig.linguaPredefinita} onValueChange={(value) => 
                setGeneralConfig(prev => ({ ...prev, linguaPredefinita: value }))
              }>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleziona lingua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="formatoData" className="text-sm">Formato Data</Label>
              <Select value={generalConfig.formatoData} onValueChange={(value) => 
                setGeneralConfig(prev => ({ ...prev, formatoData: value }))
              }>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleziona formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="timezoneFuso" className="text-sm">Fuso Orario</Label>
              <Select value={generalConfig.timezoneFuso} onValueChange={(value) => 
                setGeneralConfig(prev => ({ ...prev, timezoneFuso: value }))
              }>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleziona fuso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Rome">Europe/Rome (GMT+1)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="maxEmailGiorno" className="text-sm">Max Email al Giorno</Label>
              <Input
                id="maxEmailGiorno"
                type="number"
                value={generalConfig.maxEmailGiorno}
                onChange={(e) => setGeneralConfig(prev => ({ ...prev, maxEmailGiorno: parseInt(e.target.value) || 100 }))}
                placeholder="100"
                className="h-9"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveGeneralConfig} disabled={saving} className="h-9">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvataggio...' : 'Salva Configurazioni'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralConfig;
