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

  // Modelli disponibili per provider
  const modelsByProvider = {
    openai: [
      { value: 'gpt-5-2025-08-07', label: 'GPT-5 (flagship - più capace)', free: false },
      { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini (veloce ed efficiente)', free: false },
      { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano (economico)', free: false },
      { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (affidabile)', free: false },
      { value: 'o3-2025-04-16', label: 'O3 (reasoning avanzato)', free: false },
      { value: 'o4-mini-2025-04-16', label: 'O4 Mini (reasoning veloce)', free: false }
    ],
    anthropic: [
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (consigliato - più intelligente)', free: false },
      { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1 (massime prestazioni)', free: false },
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (bilanciato)', free: false },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude Haiku 3.5 (veloce)', free: false }
    ],
    google: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: true },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (consigliato)', free: true },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', free: true }
    ],
    lovable: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (consigliato)', free: true },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', free: true },
      { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', free: true },
      { value: 'google/gemini-2.5-flash-image-preview', label: 'Gemini Image Preview (genera immagini)', free: true },
      { value: 'openai/gpt-5', label: 'GPT-5 (potente)', free: false },
      { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', free: false },
      { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', free: false }
    ],
    huggingface: [
      { value: 'mistral-7b', label: 'Mistral 7B', free: false },
      { value: 'llama-2-7b', label: 'Llama 2 7B', free: false },
      { value: 'falcon-7b', label: 'Falcon 7B', free: false }
    ],
    custom: [
      { value: 'custom-model', label: 'Modello Custom (specifica manualmente)', free: false }
    ]
  };

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
      // Per Lovable, l'API Key è auto-configurata
      const apiKeyToSave = newAiConfig.provider === 'lovable' ? 'auto' : newAiConfig.apiKey;
      
      if (!newAiConfig.provider || !newAiConfig.modello) {
        toast({
          title: "Errore",
          description: "Provider e modello sono obbligatori",
          variant: "destructive",
        });
        return;
      }

      if (newAiConfig.provider !== 'lovable' && !newAiConfig.apiKey) {
        toast({
          title: "Errore",
          description: "API Key è obbligatoria per questo provider",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('config_ai')
        .insert({
          provider: newAiConfig.provider,
          modello: newAiConfig.modello,
          api_key: apiKeyToSave,
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
                  <SelectItem value="lovable">Lovable AI Gateway</SelectItem>
                  <SelectItem value="huggingface">HuggingFace</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="aiModello" className="text-sm">Modello</Label>
              {newAiConfig.provider && modelsByProvider[newAiConfig.provider] ? (
                <Select 
                  value={newAiConfig.modello} 
                  onValueChange={(value) => setNewAiConfig(prev => ({ ...prev, modello: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleziona modello" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsByProvider[newAiConfig.provider].map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex items-center gap-2">
                          <span>{model.label}</span>
                          {model.free && (
                            <Badge variant="secondary" className="text-xs">GRATUITO</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="aiModello"
                  value={newAiConfig.modello}
                  onChange={(e) => setNewAiConfig(prev => ({ ...prev, modello: e.target.value }))}
                  placeholder="Seleziona prima un provider"
                  className="h-9"
                  disabled={!newAiConfig.provider}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {newAiConfig.provider === 'lovable' ? (
              <div className="space-y-1">
                <Label className="text-sm">API Key</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Badge variant="secondary" className="text-xs">Auto-Configurata</Badge>
                  <span className="text-sm text-muted-foreground">Usa LOVABLE_API_KEY da Supabase</span>
                </div>
              </div>
            ) : (
              renderSecretField(
                "API Key *",
                newAiConfig.apiKey,
                "newAiApiKey",
                (value) => setNewAiConfig(prev => ({ ...prev, apiKey: value })),
                "Inserisci la tua API key"
              )
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
