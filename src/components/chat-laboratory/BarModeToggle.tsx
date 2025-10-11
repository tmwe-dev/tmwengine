import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Beer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BarModeToggleProps {
  conversationId: string | null;
  isBarMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export const BarModeToggle = ({ conversationId, isBarMode, onToggle }: BarModeToggleProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (!conversationId) {
      toast({
        title: "Attenzione",
        description: "Crea prima una conversazione per attivare Bar Mode",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      // Controlla se esiste già una configurazione
      const { data: existing } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (existing) {
        // Aggiorna
        const { error } = await supabase
          .from('chat_laboratory_bar_mode')
          .update({ 
            mode: enabled ? 'bar' : 'laboratory',
            updated_at: new Date().toISOString()
          })
          .eq('conversation_id', conversationId);

        if (error) throw error;
      } else {
        // Crea nuovo
        const { error } = await supabase
          .from('chat_laboratory_bar_mode')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            mode: enabled ? 'bar' : 'laboratory',
            voice_enabled: false,
            auto_play_audio: true,
            conversation_pace: 'normal',
            enable_interruptions: true,
            active_elevenlabs_agents: [],
          });

        if (error) throw error;
      }

      onToggle(enabled);
      
      toast({
        title: enabled ? "🍺 Bar Mode Attivo" : "Modalità Laboratory",
        description: enabled 
          ? "Conversazione in stile bar con agenti vocali"
          : "Modalità standard ripristinata",
      });
    } catch (error) {
      console.error('Errore toggle Bar Mode:', error);
      toast({
        title: "Errore",
        description: "Impossibile cambiare modalità",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-card/40">
      <Beer className={`h-4 w-4 ${isBarMode ? 'text-amber-500' : 'text-muted-foreground'}`} />
      <Label htmlFor="bar-mode" className="text-sm cursor-pointer">
        Bar Mode
      </Label>
      <Switch
        id="bar-mode"
        checked={isBarMode}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
    </div>
  );
};
