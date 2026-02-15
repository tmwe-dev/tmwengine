import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRadioSummary = (loadConversations: () => Promise<void>) => {
  const { toast } = useToast();

  const generateSummary = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-chunked-summary', {
        body: { conversationId, chunkSize: 20, includeAll: false }
      });
      if (error) throw error;
      if (data.messagesSummarized === 0) {
        toast({ title: "ℹ️ Nessun messaggio da riassumere", description: data.message || "La conversazione non ha abbastanza messaggi" });
        return;
      }
      toast({ title: "✅ Riassunto generato", description: `${data.messagesSummarized} messaggi analizzati` });
      loadConversations();
    } catch (err) {
      toast({ title: "❌ Errore", description: "Impossibile generare il riassunto", variant: "destructive" });
    }
  }, [loadConversations, toast]);

  const generateFullReport = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-chunked-summary', {
        body: { conversationId, chunkSize: 50, includeAll: true }
      });
      if (error) throw error;

      let markdown = `# Riassunto Conversazione\n\n`;
      markdown += `**Data:** ${new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n`;
      markdown += `**Messaggi analizzati:** ${data.messagesSummarized}\n\n---\n\n`;
      markdown += `## Sintesi Generale\n\n${data.finalSummary}\n\n`;
      if (data.chunks?.length > 1) {
        markdown += `## Dettagli per Sezione\n\n`;
        data.chunks.forEach((chunk: any, idx: number) => {
          markdown += `### Sezione ${idx + 1} (Messaggi ${chunk.messageRange[0] + 1}-${chunk.messageRange[1] + 1})\n\n`;
          markdown += `**Partecipanti:** ${chunk.participants.join(', ')}\n\n${chunk.summary}\n\n`;
          if (chunk.keyPoints?.length > 0) {
            markdown += `**Punti Chiave:**\n\n`;
            chunk.keyPoints.forEach((point: string) => { markdown += `- ${point}\n`; });
            markdown += `\n`;
          }
        });
      }

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `riassunto-conversazione-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "📋 Report scaricato", description: "File Markdown salvato" });
    } catch (err) {
      toast({ title: "❌ Errore", description: "Impossibile generare il report", variant: "destructive" });
    }
  }, [toast]);

  return { generateSummary, generateFullReport };
};
