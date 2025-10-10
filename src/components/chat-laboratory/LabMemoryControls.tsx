import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, Clock, MessageSquare, Zap, Save } from "lucide-react";

interface ChatMemoryConfig {
  memoria_messaggi: number;
  memoria_ore: number;
  usa_riassunto: boolean;
  max_token_conversazione: number;
  mostra_statistiche: boolean;
}

interface LabMemoryControlsProps {
  conversationId: string | null;
  memoriaCompleta: boolean;
  onMemoriaCompletaChange: (value: boolean) => void;
}

export const LabMemoryControls = ({ 
  conversationId, 
  memoriaCompleta, 
  onMemoriaCompletaChange 
}: LabMemoryControlsProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ChatMemoryConfig>({
    memoria_messaggi: 10,
    memoria_ore: 2,
    usa_riassunto: false,
    max_token_conversazione: 4000,
    mostra_statistiche: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('config_generale')
        .select('memoria_messaggi, memoria_ore, usa_riassunto, max_token_conversazione, mostra_statistiche')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig({
          memoria_messaggi: data.memoria_messaggi || 10,
          memoria_ore: data.memoria_ore || 2,
          usa_riassunto: data.usa_riassunto || false,
          max_token_conversazione: data.max_token_conversazione || 4000,
          mostra_statistiche: data.mostra_statistiche ?? true
        });
      }
    } catch (error) {
      console.error('Error loading memory config:', error);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('config_generale')
        .update({
          memoria_messaggi: config.memoria_messaggi,
          memoria_ore: config.memoria_ore,
          usa_riassunto: config.usa_riassunto,
          max_token_conversazione: config.max_token_conversazione,
          mostra_statistiche: config.mostra_statistiche
        })
        .eq('id', (await supabase.from('config_generale').select('id').limit(1).single()).data?.id);

      if (error) throw error;

      toast({
        title: "Configurazione salvata",
        description: "Le impostazioni della memoria sono state aggiornate"
      });
    } catch (error) {
      console.error('Error saving memory config:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMemoriaCompleta = async () => {
    if (!conversationId) return;
    
    const newValue = !memoriaCompleta;
    
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ memoria_completa: newValue })
        .eq('id', conversationId);

      if (error) throw error;

      onMemoriaCompletaChange(newValue);
      
      toast({
        title: newValue ? "Memoria completa attivata" : "Memoria limitata attivata",
        description: newValue 
          ? "Tutti i messaggi verranno inclusi nel contesto" 
          : "Solo i messaggi recenti verranno inclusi"
      });
    } catch (error) {
      console.error('Error toggling memoria completa:', error);
      toast({
        title: "Errore",
        description: "Impossibile modificare la modalità memoria",
        variant: "destructive"
      });
    }
  };

  const getMemoryPreview = () => {
    if (memoriaCompleta) {
      return "Memoria completa: tutti i messaggi inclusi";
    }
    return `Ultimi ${config.memoria_messaggi} messaggi degli ultimi ${config.memoria_ore} ore`;
  };

  const getTokenEstimate = () => {
    const avgTokensPerMessage = 100;
    const estimatedTokens = config.memoria_messaggi * avgTokensPerMessage;
    const percentage = Math.min(100, (estimatedTokens / config.max_token_conversazione) * 100);
    return { estimatedTokens, percentage: percentage.toFixed(0) };
  };

  const { estimatedTokens, percentage } = getTokenEstimate();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Configurazione Memoria AI
        </CardTitle>
        <CardDescription>
          Gestisci quante informazioni il sistema ricorda durante la conversazione
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Memoria Completa Toggle - Solo per conversazione corrente */}
        {conversationId && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Memoria Completa (Conversazione Corrente)</Label>
                <p className="text-sm text-muted-foreground">
                  Include tutti i messaggi senza limiti di tempo o numero
                </p>
              </div>
              <Switch
                checked={memoriaCompleta}
                onCheckedChange={toggleMemoriaCompleta}
              />
            </div>
          </div>
        )}

        {/* Preview Memoria */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {getMemoryPreview()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Token stimati: ~{estimatedTokens} / {config.max_token_conversazione} ({percentage}%)
          </p>
        </div>

        {/* Messaggi in Memoria */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Numero di messaggi da ricordare: {config.memoria_messaggi}
          </Label>
          <Slider
            value={[config.memoria_messaggi]}
            onValueChange={([value]) => setConfig({ ...config, memoria_messaggi: value })}
            min={5}
            max={50}
            step={5}
            disabled={memoriaCompleta}
            className={memoriaCompleta ? "opacity-50" : ""}
          />
          <p className="text-xs text-muted-foreground">
            Raccomandato: 10-20 messaggi per conversazioni bilanciate
          </p>
        </div>

        {/* Finestra Temporale */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Finestra temporale: {config.memoria_ore} ore
          </Label>
          <Slider
            value={[config.memoria_ore]}
            onValueChange={([value]) => setConfig({ ...config, memoria_ore: value })}
            min={1}
            max={24}
            step={1}
            disabled={memoriaCompleta}
            className={memoriaCompleta ? "opacity-50" : ""}
          />
          <p className="text-xs text-muted-foreground">
            Messaggi più vecchi di questo periodo verranno ignorati
          </p>
        </div>

        {/* Riassunto Intelligente */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Riassunto Intelligente</Label>
            <p className="text-xs text-muted-foreground">
              Riassumi messaggi vecchi invece di eliminarli
            </p>
          </div>
          <Switch
            checked={config.usa_riassunto}
            onCheckedChange={(checked) => setConfig({ ...config, usa_riassunto: checked })}
            disabled={memoriaCompleta}
          />
        </div>

        {/* Max Token */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Token massimi per conversazione: {config.max_token_conversazione}
          </Label>
          <Slider
            value={[config.max_token_conversazione]}
            onValueChange={([value]) => setConfig({ ...config, max_token_conversazione: value })}
            min={1000}
            max={16000}
            step={1000}
          />
          <p className="text-xs text-muted-foreground">
            Limite totale di token che possono essere inviati all'AI
          </p>
        </div>

        {/* Mostra Statistiche */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Mostra Statistiche</Label>
            <p className="text-xs text-muted-foreground">
              Visualizza metriche di utilizzo e performance
            </p>
          </div>
          <Switch
            checked={config.mostra_statistiche}
            onCheckedChange={(checked) => setConfig({ ...config, mostra_statistiche: checked })}
          />
        </div>

        {/* Pulsante Salva */}
        <Button 
          onClick={saveConfig} 
          className="w-full"
          disabled={isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Salvataggio..." : "Salva Configurazione"}
        </Button>
      </CardContent>
    </Card>
  );
};