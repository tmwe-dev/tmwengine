import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Save, Brain, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMemoryConfig {
  memoria_messaggi: number;
  memoria_ore: number;
  usa_riassunto: boolean;
  max_token_conversazione: number;
  mostra_statistiche: boolean;
}

interface ChatMemoryControlsProps {
  conversationId: string | null;
  memoriaCompleta: boolean;
  onMemoriaCompletaChange: (value: boolean) => void;
}

export const ChatMemoryControls = ({ 
  conversationId, 
  memoriaCompleta, 
  onMemoriaCompletaChange 
}: ChatMemoryControlsProps) => {
  const [config, setConfig] = useState<ChatMemoryConfig>({
    memoria_messaggi: 10,
    memoria_ore: 2,
    usa_riassunto: false,
    max_token_conversazione: 4000,
    mostra_statistiche: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('config_generale')
        .select('memoria_messaggi, memoria_ore, usa_riassunto, max_token_conversazione, mostra_statistiche')
        .single();

      if (error) throw error;
      if (data) {
        setConfig({
          memoria_messaggi: data.memoria_messaggi || 10,
          memoria_ore: data.memoria_ore || 2,
          usa_riassunto: data.usa_riassunto || false,
          max_token_conversazione: data.max_token_conversazione || 4000,
          mostra_statistiche: data.mostra_statistiche || true
        });
      }
    } catch (error) {
      console.error('Errore caricamento configurazione:', error);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('config_generale')
        .update(config)
        .eq('id', (await supabase.from('config_generale').select('id').single()).data?.id);

      if (error) throw error;

      toast({
        title: "Configurazione Salvata",
        description: "Le impostazioni di memoria sono state aggiornate.",
      });
    } catch (error) {
      console.error('Errore salvataggio configurazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMemoriaCompleta = async () => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ memoria_completa: !memoriaCompleta })
        .eq('id', conversationId);

      if (error) throw error;
      
      onMemoriaCompletaChange(!memoriaCompleta);
      
      toast({
        title: memoriaCompleta ? "Memoria Limitata" : "Memoria Completa",
        description: memoriaCompleta 
          ? "ChatGPT userà solo i messaggi recenti"
          : "ChatGPT ricorderà tutta la conversazione (più token)",
      });
    } catch (error) {
      console.error('Errore toggle memoria:', error);
    }
  };

  const getMemoryPreview = () => {
    if (memoriaCompleta) return "∞ messaggi (TUTTA la conversazione)";
    if (config.usa_riassunto) return `${config.memoria_messaggi} messaggi + riassunto contesto`;
    return `${config.memoria_messaggi} messaggi recenti`;
  };

  const getTokenEstimate = () => {
    if (memoriaCompleta) return "⚠️ Token variabili (possibile alto costo)";
    const baseTokens = config.memoria_messaggi * 50; // Stima approssimativa
    const summaryTokens = config.usa_riassunto ? 200 : 0;
    return `~${baseTokens + summaryTokens}-${baseTokens * 2 + summaryTokens} token per richiesta`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Controlli Memoria ChatGPT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Memoria Conversazione Corrente */}
        {conversationId && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Memoria Completa (Solo questa conversazione)</Label>
                <p className="text-sm text-muted-foreground">
                  ChatGPT ricorderà tutti i messaggi di questa conversazione
                </p>
              </div>
              <Switch
                checked={memoriaCompleta}
                onCheckedChange={toggleMemoriaCompleta}
              />
            </div>
          </div>
        )}

        {/* Controlli Memoria Globale */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4" />
              <Label>Messaggi in Memoria: {config.memoria_messaggi}</Label>
            </div>
            <Slider
              value={[config.memoria_messaggi]}
              onValueChange={(value) => setConfig(prev => ({ ...prev, memoria_messaggi: value[0] }))}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Più messaggi = più contesto ma più token
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" />
              <Label>Finestra Temporale: {config.memoria_ore} ore</Label>
            </div>
            <Slider
              value={[config.memoria_ore]}
              onValueChange={(value) => setConfig(prev => ({ ...prev, memoria_ore: value[0] }))}
              min={1}
              max={24}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Considera solo messaggi delle ultime N ore
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4" />
              <Label>Token Massimi per Conversazione: {config.max_token_conversazione}</Label>
            </div>
            <Slider
              value={[config.max_token_conversazione]}
              onValueChange={(value) => setConfig(prev => ({ ...prev, max_token_conversazione: value[0] }))}
              min={1000}
              max={8000}
              step={500}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Riassunto Intelligente</Label>
              <p className="text-sm text-muted-foreground">
                AI riassume i messaggi vecchi per risparmiare token
              </p>
            </div>
            <Switch
              checked={config.usa_riassunto}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, usa_riassunto: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Mostra Statistiche</Label>
              <p className="text-sm text-muted-foreground">
                Visualizza utilizzo token e performance
              </p>
            </div>
            <Switch
              checked={config.mostra_statistiche}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, mostra_statistiche: checked }))}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="p-3 bg-secondary/50 rounded-lg">
          <h4 className="font-medium mb-2">Anteprima Configurazione</h4>
          <div className="text-sm space-y-1">
            <p><strong>Memoria:</strong> {getMemoryPreview()}</p>
            <p><strong>Stima Token:</strong> {getTokenEstimate()}</p>
            <p className={`text-xs ${memoriaCompleta ? 'text-orange-600' : 'text-green-600'}`}>
              {memoriaCompleta 
                ? "⚠️ Modalità memoria completa attiva per questa conversazione"
                : "✅ Modalità memoria ottimizzata"
              }
            </p>
          </div>
        </div>

        <Button onClick={saveConfig} disabled={isLoading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salva Configurazione'}
        </Button>
      </CardContent>
    </Card>
  );
};