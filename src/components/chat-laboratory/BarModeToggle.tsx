import { Beer } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface BarModeToggleProps {
  conversationId: string | null;
  isBarMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export const BarModeToggle = ({ conversationId, isBarMode, onToggle }: BarModeToggleProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const enabled = !isBarMode;
    setIsLoading(true);
    try {
      if (!conversationId) {
        localStorage.setItem('bar-mode-pending', JSON.stringify({
          mode: enabled ? 'bar' : 'laboratory',
          timestamp: new Date().toISOString()
        }));
        
        onToggle(enabled);
        setIsLoading(false);
        return;
      }

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
    } catch (error) {
      console.error('Errore toggle Bar Mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
        "hover:bg-accent/50 cursor-pointer",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
      title="Attiva/Disattiva Bar Chat"
    >
      <div className="relative shrink-0">
        <Beer className={cn(
          "h-5 w-5 transition-colors",
          isBarMode ? 'text-amber-500' : 'text-muted-foreground'
        )} />
        <div className={cn(
          "absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full",
          isBarMode ? 'bg-white' : 'bg-muted-foreground/30'
        )} />
      </div>
      
      <span className={cn(
        "text-sm font-medium transition-colors",
        isBarMode ? 'text-foreground' : 'text-muted-foreground'
      )}>
        Bar Chat
      </span>
    </button>
  );
};
