import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseSummaryAutoGeneratorProps {
  conversationId: string | null;
  messageCount: number;
  lastMessageSummarized: number;
  economyMode: boolean;
  onSummaryGenerated: () => void;
}

export function useSummaryAutoGenerator({
  conversationId,
  messageCount,
  lastMessageSummarized,
  economyMode,
  onSummaryGenerated
}: UseSummaryAutoGeneratorProps) {
  const { toast } = useToast();
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !economyMode || isGeneratingRef.current) return;

    // Check if we should trigger auto-summary
    const messagesSinceLastSummary = messageCount - lastMessageSummarized;
    const shouldGenerate = messagesSinceLastSummary >= 20;

    if (shouldGenerate) {
      generateAutoSummary();
    }
  }, [conversationId, messageCount, lastMessageSummarized, economyMode]);

  const generateAutoSummary = async () => {
    if (!conversationId || isGeneratingRef.current) return;

    isGeneratingRef.current = true;

    try {
      toast({
        title: "🔄 Generazione riassunto...",
        description: "Elaborazione in background",
      });

      const { error } = await supabase.functions.invoke('generate-chunked-summary', {
        body: {
          conversationId,
          chunkSize: 50,
          includeAll: false
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Riassunto aggiornato",
        description: "Il riassunto è stato generato automaticamente",
      });

      onSummaryGenerated();
    } catch (error) {
      console.error('Auto-summary error:', error);
      // Silent fail for auto-generation
    } finally {
      isGeneratingRef.current = false;
    }
  };

  return null;
}