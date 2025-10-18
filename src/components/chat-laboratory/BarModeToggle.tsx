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
    setIsLoading(true);
    try {
      // MODALITÀ PRE-CONVERSAZIONE: salva in localStorage
      if (!conversationId) {
        localStorage.setItem('bar-mode-pending', JSON.stringify({
          mode: enabled ? 'bar' : 'laboratory',
          timestamp: new Date().toISOString()
        }));
        
        onToggle(enabled);
        
        // toast({
        //   title: enabled ? "🍺 Bar Mode Attivo" : "Modalità Laboratory",
        //   description: enabled 
        //     ? "Configura gli agenti prima di iniziare la chat"
        //     : "Modalità standard selezionata",
        // });
        
        setIsLoading(false);
        return;
      }

      // MODALITÀ POST-CONVERSAZIONE: salva nel database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      const { data: existing } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('chat_laboratory_bar_mode')
          .update({ 
            mode: enabled ? 'bar' : 'laboratory',
            updated_at: new Date().toISOString()
          })
          .eq('conversation_id', conversationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_laboratory_bar_mode')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            mode: enabled ? 'bar' : 'laboratory',
            voice_enabled: true,
            auto_play_audio: true,
            conversation_pace: 'normal',
            enable_interruptions: true,
          });

        if (error) throw error;
      }

      onToggle(enabled);
      
      console.log('🍺 BarMode toggled:', { 
        enabled, 
        conversationId, 
        hasConversationId: !!conversationId 
      });
      
      // toast({
      //   title: enabled ? "🍺 Bar Mode Attivo" : "Modalità Laboratory",
      //   description: enabled 
      //     ? "Conversazione in stile bar con agenti vocali"
      //     : "Modalità standard ripristinata",
      // });
    } catch (error) {
      console.error('Errore toggle Bar Mode:', error);
      // toast({
      //   title: "Errore",
      //   description: "Impossibile cambiare modalità",
      //   variant: "destructive",
      // });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={() => handleToggle(!isBarMode)}
      disabled={isLoading}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
    >
      {/* Birra con schiuma */}
      <div className="relative shrink-0">
        <Beer className={`h-5 w-5 transition-colors ${isBarMode ? 'text-amber-500' : 'text-muted-foreground'}`} />
        {/* Schiuma bianca sopra */}
        <div className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full transition-colors ${
          isBarMode ? 'bg-white' : 'bg-muted-foreground/30'
        }`} />
      </div>
      
      <span className="text-sm font-semibold">
        Bar Chat
      </span>
    </button>
  );
};
