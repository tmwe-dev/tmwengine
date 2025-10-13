import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TokenWarningBannerProps {
  conversationId: string;
}

export function TokenWarningBanner({ conversationId }: TokenWarningBannerProps) {
  const [highTokenMessage, setHighTokenMessage] = useState<{
    agent: string;
    tokens: number;
  } | null>(null);

  useEffect(() => {
    // Listener real-time per messaggi con molti token
    const channel = supabase
      .channel(`token-warning-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_laboratory_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          const msg = payload.new;
          if (msg.token_output && msg.token_output > 2000) {
            setHighTokenMessage({
              agent: msg.sender_name,
              tokens: msg.token_output
            });
            
            // Auto-dismiss dopo 10 secondi
            setTimeout(() => setHighTokenMessage(null), 10000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  if (!highTokenMessage) return null;

  return (
    <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">Risposta Verbosa Rilevata</AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        <strong>{highTokenMessage.agent}</strong> ha generato{" "}
        <strong>{highTokenMessage.tokens.toLocaleString()} token</strong>.
        <br />
        <span className="text-sm">
          💡 Suggerimento: Considera prompt più specifici per risposte più concise.
        </span>
      </AlertDescription>
    </Alert>
  );
}
