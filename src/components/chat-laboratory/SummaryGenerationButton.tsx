import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SummaryGenerationButtonProps {
  conversationId: string;
  onSummaryGenerated: () => void;
}

export function SummaryGenerationButton({
  conversationId,
  onSummaryGenerated
}: SummaryGenerationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSummary = async (type: 'quick' | 'complete' | 'report') => {
    setIsGenerating(true);
    
    try {
      const chunkSize = type === 'quick' ? 20 : 50;
      const includeAll = type !== 'quick';

      const { data, error } = await supabase.functions.invoke('generate-chunked-summary', {
        body: {
          conversationId,
          chunkSize,
          includeAll
        }
      });

      if (error) throw error;

      if (type === 'report') {
        // Download as Markdown
        const markdown = generateMarkdownReport(data);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `riassunto-conversazione-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "✅ Riassunto generato",
        description: `${data.messagesSummarized} messaggi analizzati`,
      });

      onSummaryGenerated();
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile generare il riassunto",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMarkdownReport = (data: any) => {
    console.log('📄 Generazione report Markdown, dati ricevuti:', data);
    
    let markdown = `# Riassunto Conversazione\n\n`;
    markdown += `**Data:** ${new Date().toLocaleDateString('it-IT', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;
    markdown += `**Messaggi analizzati:** ${data?.messagesSummarized || 'N/A'}\n\n`;
    markdown += `---\n\n`;
    
    // Try to get summary from different possible locations
    const summary = data?.summary || data?.finalSummary || data?.riassunto_contesto || 'Nessun riassunto disponibile';
    markdown += `## Sintesi Generale\n\n${summary}\n\n`;
    
    // Add chunks if available
    if (data?.chunks && Array.isArray(data.chunks) && data.chunks.length > 0) {
      markdown += `## Dettagli per Sezione\n\n`;
      data.chunks.forEach((chunk: any, idx: number) => {
        // Try to parse chunk.summary if it's a JSON string
        let chunkData = chunk;
        if (typeof chunk.summary === 'string' && chunk.summary.includes('{')) {
          try {
            const cleanJson = chunk.summary.replace(/```json\n?|\n?```/g, '').trim();
            chunkData = JSON.parse(cleanJson);
          } catch (e) {
            console.warn('Could not parse chunk summary as JSON:', e);
          }
        }
        
        markdown += `### Sezione ${idx + 1}`;
        if (chunkData.messageRange) {
          markdown += ` (Messaggi ${chunkData.messageRange[0] + 1}-${chunkData.messageRange[1] + 1})`;
        }
        markdown += `\n\n`;
        
        if (chunkData.participants && Array.isArray(chunkData.participants)) {
          markdown += `**Partecipanti:** ${chunkData.participants.join(', ')}\n\n`;
        }
        
        const chunkSummary = chunkData.summary || chunk.summary || '';
        markdown += `${chunkSummary}\n\n`;
        
        if (chunkData.keyPoints && Array.isArray(chunkData.keyPoints) && chunkData.keyPoints.length > 0) {
          markdown += `**Punti Chiave:**\n\n`;
          chunkData.keyPoints.forEach((point: string) => {
            markdown += `- ${point}\n`;
          });
          markdown += `\n`;
        }
      });
    }
    
    console.log('📄 Report markdown generato, lunghezza:', markdown.length);
    return markdown;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Genera Riassunto
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => generateSummary('quick')}>
          ⚡ Riassunto Rapido
          <span className="text-xs text-muted-foreground ml-2">(ultimi 20 msg)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => generateSummary('complete')}>
          📋 Riassunto Completo
          <span className="text-xs text-muted-foreground ml-2">(tutti)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => generateSummary('report')}>
          <Download className="h-4 w-4 mr-2" />
          Report Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}