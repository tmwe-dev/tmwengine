import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

const AIConfig = () => {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [aiConfigs, setAiConfigs] = useState([]);
  const [newAiConfig, setNewAiConfig] = useState({
    provider: '',
    modello: '',
    apiKey: '',
    attivo: false
  });

  useEffect(() => {
    loadAIConfigurations();
  }, []);

  const loadAIConfigurations = async () => {
    try {
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
    } catch (error) {
      console.error('Errore nel caricamento configurazioni AI:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le configurazioni AI",
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

      if (newAiConfig.attivo) {
        await supabase
          .from('config_ai')
          .update({ attivo: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

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

      setNewAiConfig({
        provider: '',
        modello: '',
        apiKey: '',
        attivo: false
      });

      await loadAIConfigurations();
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
      if (!currentStatus) {
        await supabase
          .from('config_ai')
          .update({ attivo: false })
          .neq('id', configId);
      }

      const { error } = await supabase
        .from('config_ai')
        .update({ attivo: !currentStatus })
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: `Configurazione ${!currentStatus ? 'attivata' : 'disattivata'}`,
      });

      await loadAIConfigurations();
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

      await loadAIConfigurations();
    } catch (error) {
      console.error('Errore eliminazione AI config:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la configurazione",
        variant: "destructive",
      });
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
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurazione AI</h1>
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
        <Bot className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurazione AI</h1>
          <p className="text-muted-foreground">Gestisci i provider AI per classificazione e analisi automatica</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aggiungi Configurazione AI</CardTitle>
          <CardDescription>
            Configura un nuovo provider AI (OpenAI, Claude, ecc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="aiProvider" className="text-sm">Provider AI</Label>
              <Select value={newAiConfig.provider} onValueChange={(value) => 
                setNewAiConfig(prev => ({ ...prev, provider: value }))
              }>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleziona provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google AI</SelectItem>
                  <SelectItem value="huggingface">HuggingFace</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="aiModello" className="text-sm">Modello</Label>
              <Input
                id="aiModello"
                value={newAiConfig.modello}
                onChange={(e) => setNewAiConfig(prev => ({ ...prev, modello: e.target.value }))}
                placeholder="gpt-4, claude-3, ecc."
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderSecretField(
              "API Key *",
              newAiConfig.apiKey,
              "newAiApiKey",
              (value) => setNewAiConfig(prev => ({ ...prev, apiKey: value })),
              "Inserisci la tua API key"
            )}

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="newAiAttivo"
                checked={newAiConfig.attivo}
                onCheckedChange={(checked) => setNewAiConfig(prev => ({ ...prev, attivo: checked }))}
              />
              <Label htmlFor="newAiAttivo" className="text-sm">Attiva immediatamente</Label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAddAiConfig} disabled={saving} className="h-9">
              <Plus className="h-4 w-4 mr-2" />
              {saving ? "Aggiunta..." : "Aggiungi Configurazione"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurazioni AI Esistenti</CardTitle>
          <CardDescription>
            Gestisci le configurazioni AI salvate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aiConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna configurazione AI presente
            </div>
          ) : (
            <div className="space-y-3">
              {aiConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4 flex-1">
                    <div>
                      <div className="font-medium">{config.provider}</div>
                      <div className="text-sm text-muted-foreground">{config.modello}</div>
                    </div>
                    {config.attivo && (
                      <Badge variant="default">Attivo</Badge>
                    )}
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
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIConfig;
