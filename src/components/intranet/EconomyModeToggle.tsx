import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EconomyModeToggleProps {
  roomId: string | undefined;
  isCollapsed?: boolean;
  onSettingsChange?: (settings: { economy_mode: boolean; show_summaries_only: boolean }) => void;
}

export const EconomyModeToggle = ({ roomId, isCollapsed = false, onSettingsChange }: EconomyModeToggleProps) => {
  const [economyMode, setEconomyMode] = useState(true);
  const [showSummaries, setShowSummaries] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [roomId]);

  const loadSettings = async () => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('intranet_rooms')
        .select('economy_mode, show_summaries_only')
        .eq('id', roomId)
        .single();

      if (error) throw error;

      if (data) {
        setEconomyMode(data.economy_mode ?? true);
        setShowSummaries(data.show_summaries_only ?? true);
      }
    } catch (error) {
      console.error('Error loading economy settings:', error);
    }
  };

  const updateSetting = async (field: 'economy_mode' | 'show_summaries_only', value: boolean) => {
    if (!roomId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('intranet_rooms')
        .update({ [field]: value })
        .eq('id', roomId);

      if (error) throw error;

      if (field === 'economy_mode') {
        setEconomyMode(value);
      } else {
        setShowSummaries(value);
      }

      onSettingsChange?.({
        economy_mode: field === 'economy_mode' ? value : economyMode,
        show_summaries_only: field === 'show_summaries_only' ? value : showSummaries
      });

      toast.success(`Impostazione ${field === 'economy_mode' ? 'Economy Mode' : 'Vista Riassunti'} aggiornata`);
    } catch (error) {
      console.error('Error updating economy setting:', error);
      toast.error('Errore durante aggiornamento impostazione');
    } finally {
      setIsLoading(false);
    }
  };

  if (!roomId) {
    return null;
  }

  // Versione collapsed con icone + tooltip
  if (isCollapsed) {
    return (
      <TooltipProvider>
        <div className="flex flex-col gap-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-full h-10 flex items-center justify-center",
                  economyMode && "bg-primary/10"
                )}
                onClick={() => updateSetting('economy_mode', !economyMode)}
                disabled={isLoading}
              >
                <DollarSign className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="space-y-1">
                <div className="font-semibold text-sm">Economy Mode</div>
                <div className="text-xs text-muted-foreground">
                  {economyMode ? 'Attivo' : 'Disattivo'}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-full h-10 flex items-center justify-center",
                  showSummaries && "bg-primary/10"
                )}
                onClick={() => updateSetting('show_summaries_only', !showSummaries)}
                disabled={isLoading}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="space-y-1">
                <div className="font-semibold text-sm">Mostra Riassunti</div>
                <div className="text-xs text-muted-foreground">
                  {showSummaries ? 'Attivo' : 'Disattivo'}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <Label htmlFor="economy-mode" className="text-sm font-medium cursor-pointer">
            Economy Mode
          </Label>
        </div>
        <Switch
          id="economy-mode"
          checked={economyMode}
          onCheckedChange={(checked) => updateSetting('economy_mode', checked)}
          disabled={isLoading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        AI legge riassunti ultra-compressi per risparmiare token
      </p>

      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <Label htmlFor="show-summaries" className="text-sm font-medium cursor-pointer">
            Mostra Riassunti
          </Label>
        </div>
        <Switch
          id="show-summaries"
          checked={showSummaries}
          onCheckedChange={(checked) => updateSetting('show_summaries_only', checked)}
          disabled={isLoading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Visualizza versioni user-friendly dei messaggi AI
      </p>
    </div>
  );
};
