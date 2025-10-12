import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Brain, Zap, FileText, DollarSign, BarChart } from 'lucide-react';

interface UnifiedMemoryConfig {
  memoria_messaggi: number;
  usa_riassunto: boolean;
  max_token_conversazione: number;
  mostra_statistiche: boolean;
}

interface UnifiedMemoryControlsProps {
  conversationId?: string;
  memoriaCompleta?: boolean;
  economyMode?: boolean;
  showSummaries?: boolean;
  onMemoriaCompletaChange?: (value: boolean) => void;
  onEconomyModeChange?: (value: boolean) => void;
  onShowSummariesChange?: (value: boolean) => void;
  variant?: 'chat' | 'laboratory' | 'intranet';
}

export const UnifiedMemoryControls = ({
  conversationId,
  memoriaCompleta = false,
  economyMode = true,
  showSummaries = true,
  onMemoriaCompletaChange,
  onEconomyModeChange,
  onShowSummariesChange,
  variant = 'chat'
}: UnifiedMemoryControlsProps) => {
  const [config, setConfig] = useState<UnifiedMemoryConfig>({
    memoria_messaggi: 20,
    usa_riassunto: true,
    max_token_conversazione: 6000,
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
        .select('memoria_messaggi, usa_riassunto, max_token_conversazione, mostra_statistiche')
        .single();

      if (error) throw error;
      if (data) {
        setConfig({
          memoria_messaggi: data.memoria_messaggi ?? 20,
          usa_riassunto: data.usa_riassunto ?? true,
          max_token_conversazione: data.max_token_conversazione ?? 6000,
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
          usa_riassunto: config.usa_riassunto,
          max_token_conversazione: config.max_token_conversazione,
          mostra_statistiche: config.mostra_statistiche
        })
        .eq('id', (await supabase.from('config_generale').select('id').single()).data?.id);

      if (error) throw error;

      toast.success('Configurazione memoria salvata');
    } catch (error) {
      console.error('Error saving memory config:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMemoriaCompleta = async () => {
    if (!conversationId) return;

    try {
      const tableName = variant === 'laboratory' 
        ? 'chat_laboratory_conversations'
        : variant === 'intranet'
        ? 'intranet_rooms'
        : 'chat_conversations';

      const { error } = await supabase
        .from(tableName)
        .update({ memoria_completa: !memoriaCompleta })
        .eq('id', conversationId);

      if (error) throw error;

      onMemoriaCompletaChange?.(!memoriaCompleta);
      toast.success(`Memoria completa ${!memoriaCompleta ? 'attivata' : 'disattivata'}`);
    } catch (error) {
      console.error('Error toggling memoria completa:', error);
      toast.error('Errore durante aggiornamento');
    }
  };

  const getMemoryPreview = () => {
    if (config.usa_riassunto) {
      return 'Memoria: TUTTI i messaggi (riassunti compressi)';
    }
    return `Memoria: ultimi ${config.memoria_messaggi} messaggi (contenuto completo)`;
  };

  const getTokenEstimate = () => {
    if (config.usa_riassunto) {
      return '~200-500 token per richiesta (ultra ottimizzato)';
    }
    const avgTokensPerMsg = 100;
    const min = config.memoria_messaggi * avgTokensPerMsg;
    const max = min * 2;
    return `~${min}-${max} token per richiesta`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Controlli Memoria AI Avanzati
        </CardTitle>
        <CardDescription>
          Sistema unificato per ottimizzare contesto, token e prestazioni
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Full Memory Toggle per conversazione corrente */}
        {conversationId && (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/50">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <div>
                <Label className="text-sm font-medium">Memoria Completa (questa conversazione)</Label>
                <p className="text-xs text-muted-foreground">
                  Ignora tutti i limiti e leggi l'intera cronologia
                </p>
              </div>
            </div>
            <Switch
              checked={memoriaCompleta}
              onCheckedChange={toggleMemoriaCompleta}
            />
          </div>
        )}

        {/* Economy Mode Master Switch */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <Label htmlFor="usa-riassunto" className="text-sm font-medium cursor-pointer">
                Riassunto Intelligente (Economy Mode)
              </Label>
            </div>
            <Switch
              id="usa-riassunto"
              checked={config.usa_riassunto}
              onCheckedChange={(checked) => {
                setConfig({ ...config, usa_riassunto: checked });
                onEconomyModeChange?.(checked);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {config.usa_riassunto 
              ? '✅ AI legge TUTTI i messaggi in formato ultra-compresso (risparmio ~80% token)'
              : '❌ AI legge solo gli ultimi X messaggi in formato completo (più token)'
            }
          </p>
        </div>

        {/* Messaggi in Memoria - visibile solo se usa_riassunto è FALSE */}
        {!config.usa_riassunto && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Messaggi in Memoria: {config.memoria_messaggi}
              </Label>
            </div>
            <Slider
              value={[config.memoria_messaggi]}
              onValueChange={([value]) => setConfig({ ...config, memoria_messaggi: value })}
              min={5}
              max={50}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Più messaggi = più contesto ma più token
            </p>
          </div>
        )}

        {/* Token Massimi per Conversazione */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Token Massimi per Risposta: {config.max_token_conversazione}
            </Label>
          </div>
          <Slider
            value={[config.max_token_conversazione]}
            onValueChange={([value]) => setConfig({ ...config, max_token_conversazione: value })}
            min={1000}
            max={16000}
            step={1000}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Limite comunicato ad AI per adattare lunghezza risposta
          </p>
        </div>

        {/* Mostra Statistiche */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="h-4 w-4 text-primary" />
            <Label htmlFor="mostra-statistiche" className="text-sm font-medium cursor-pointer">
              Mostra Statistiche
            </Label>
          </div>
          <Switch
            id="mostra-statistiche"
            checked={config.mostra_statistiche}
            onCheckedChange={(checked) => setConfig({ ...config, mostra_statistiche: checked })}
          />
        </div>

        {/* Mostra Riassunti (solo UI) */}
        {variant !== 'chat' && conversationId && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <Label htmlFor="show-summaries" className="text-sm font-medium cursor-pointer">
                Mostra Riassunti User-Friendly
              </Label>
            </div>
            <Switch
              id="show-summaries"
              checked={showSummaries}
              onCheckedChange={onShowSummariesChange}
            />
          </div>
        )}

        {/* Anteprima Configurazione */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold">Anteprima Configurazione</h4>
          <p className="text-xs text-muted-foreground">{getMemoryPreview()}</p>
          <p className="text-xs text-muted-foreground">Max risposta: {config.max_token_conversazione} token</p>
          <p className="text-xs text-muted-foreground">Stima utilizzo: {getTokenEstimate()}</p>
          {config.usa_riassunto && (
            <p className="text-xs font-medium text-primary">✅ Modalità memoria ottimizzata attiva</p>
          )}
        </div>

        {/* Salva Configurazione */}
        <Button 
          onClick={saveConfig} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Salvataggio...' : 'Salva Configurazione Globale'}
        </Button>
      </CardContent>
    </Card>
  );
};
