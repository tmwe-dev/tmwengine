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
    let markdown = `# Riassunto Conversazione\n\n`;
    markdown += `**Data:** ${new Date().toLocaleDateString('it-IT', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;
    markdown += `**Messaggi analizzati:** ${data.messagesSummarized}\n\n`;
    markdown += `---\n\n`;
    markdown += `## Sintesi Generale\n\n${data.finalSummary}\n\n`;
    
    if (data.chunks && data.chunks.length > 1) {
      markdown += `## Dettagli per Sezione\n\n`;
      data.chunks.forEach((chunk: any, idx: number) => {
        markdown += `### Sezione ${idx + 1} (Messaggi ${chunk.messageRange[0] + 1}-${chunk.messageRange[1] + 1})\n\n`;
        markdown += `**Partecipanti:** ${chunk.participants.join(', ')}\n\n`;
        markdown += `${chunk.summary}\n\n`;
        if (chunk.keyPoints.length > 0) {
          markdown += `**Punti Chiave:**\n\n`;
          chunk.keyPoints.forEach((point: string) => {
            markdown += `- ${point}\n`;
          });
          markdown += `\n`;
        }
      });
    }
    
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