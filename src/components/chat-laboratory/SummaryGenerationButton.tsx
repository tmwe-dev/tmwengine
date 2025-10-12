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

      console.log('🔍 Risposta edge function:', data);

      if (type === 'report') {
        const markdown = generateMarkdownReport(data);
        
        if (!markdown || markdown.length < 100) {
          console.error('❌ Report vuoto o troppo corto, lunghezza:', markdown.length);
          toast({
            title: 'Errore',
            description: 'Il report generato è vuoto. Verifica che ci siano messaggi da analizzare.',
            variant: 'destructive'
          });
          return;
        }
        
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-conversazione-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('✅ Report scaricato, dimensione:', blob.size, 'byte');
        
        toast({
          title: 'Report generato',
          description: `File Markdown scaricato (${(blob.size / 1024).toFixed(2)} KB)`
        });
      } else {
        toast({
          title: 'Riassunto generato',
          description: `${type === 'quick' ? 'Riassunto rapido' : 'Riassunto completo'} creato con successo`
        });
      }

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
    console.log('📊 Generazione Report - Dati ricevuti:', data);
    
    // Validazione dati
    if (!data || (!data.chunks && !data.finalSummary)) {
      console.error('❌ Dati vuoti o invalidi per report');
      toast({
        title: 'Errore',
        description: 'Nessun dato disponibile per generare il report',
        variant: 'destructive'
      });
      return '';
    }

    let markdown = `# Report Completo della Conversazione\n\n`;
    markdown += `*Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}*\n\n`;
    
    if (data.messagesSummarized) {
      markdown += `*Messaggi analizzati: ${data.messagesSummarized}*\n\n`;
    }
    
    markdown += `---\n\n`;
    
    // General summary
    if (data.finalSummary) {
      console.log('✅ Riassunto generale trovato');
      markdown += `## Riassunto Generale\n\n${data.finalSummary}\n\n`;
      markdown += `---\n\n`;
    }
    
    // Detailed chunks
    if (data.chunks && Array.isArray(data.chunks) && data.chunks.length > 0) {
      console.log(`📦 Processando ${data.chunks.length} chunks`);
      markdown += `## Analisi Dettagliata (${data.chunks.length} sezioni)\n\n`;
      
      data.chunks.forEach((chunk: any, index: number) => {
        console.log(`📝 Chunk ${index + 1}:`, chunk);
        
        markdown += `### Sezione ${index + 1}\n\n`;
        
        // Accesso diretto ai campi senza parsing JSON
        if (chunk.participants && Array.isArray(chunk.participants)) {
          markdown += `**Partecipanti:** ${chunk.participants.join(', ')}\n\n`;
        }
        
        if (chunk.summary) {
          markdown += `**Riassunto:**\n${chunk.summary}\n\n`;
        }
        
        if (chunk.keyPoints && Array.isArray(chunk.keyPoints) && chunk.keyPoints.length > 0) {
          markdown += `**Punti Chiave:**\n`;
          chunk.keyPoints.forEach((point: string) => {
            markdown += `- ${point}\n`;
          });
          markdown += `\n`;
        }
        
        if (chunk.messageRange && Array.isArray(chunk.messageRange)) {
          markdown += `*Messaggi analizzati: dal n°${chunk.messageRange[0] + 1} al n°${chunk.messageRange[1] + 1}*\n\n`;
        }
        
        markdown += `---\n\n`;
      });
    } else if (!data.finalSummary) {
      console.warn('⚠️ Nessun chunk trovato e nessun riassunto generale');
      markdown += `*Nessun dato dettagliato disponibile*\n\n`;
    }
    
    console.log('📄 Report generato, lunghezza:', markdown.length, 'caratteri');
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