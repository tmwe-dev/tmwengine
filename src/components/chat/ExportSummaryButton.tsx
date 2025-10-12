import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExportSummaryButtonProps {
  conversationId?: string;
  roomId?: string;
  labConversationId?: string;
  variant: 'chat' | 'intranet' | 'laboratory';
  iconOnly?: boolean;
}

export const ExportSummaryButton = ({ 
  conversationId, 
  roomId, 
  labConversationId, 
  variant,
  iconOnly = false
}: ExportSummaryButtonProps) => {
  const { toast } = useToast();
  
  const handleExport = async () => {
    try {
      let data: { riassunto_contesto: string | null; titolo: string | null } | null = null;
      
      if (variant === 'chat' && conversationId) {
        const result = await supabase
          .from('chat_conversations')
          .select('riassunto_contesto, titolo')
          .eq('id', conversationId)
          .maybeSingle();
        data = result.data;
      } else if (variant === 'laboratory' && labConversationId) {
        const result = await supabase
          .from('chat_laboratory_conversations')
          .select('riassunto_contesto, titolo')
          .eq('id', labConversationId)
          .maybeSingle();
        data = result.data;
      } else {
        toast({
          title: 'Funzione non disponibile',
          description: 'Export riassunto disponibile solo per Chat e Laboratory',
          variant: 'destructive'
        });
        return;
      }
      
      if (!data?.riassunto_contesto) {
        toast({
          title: 'Nessun riassunto disponibile',
          description: 'Attiva la modalità Economy per generare un riassunto',
          variant: 'destructive'
        });
        return;
      }
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Riassunto Conversazione - ${data.titolo || 'Senza titolo'}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 30px;
    }
    .content {
      white-space: pre-wrap;
      text-align: justify;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>${data.titolo || 'Riassunto Conversazione'}</h1>
  <div class="meta">
    Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
  </div>
  <div class="content">${data.riassunto_contesto}</div>
</body>
</html>
      `;
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `riassunto-${data.titolo || 'conversazione'}-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Riassunto esportato',
        description: 'File HTML pronto per la stampa'
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile esportare il riassunto',
        variant: 'destructive'
      });
    }
  };
  
  if (iconOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Esporta Riassunto</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <FileText className="h-4 w-4 mr-2" />
      Esporta Riassunto
      <Download className="h-3 w-3 ml-2" />
    </Button>
  );
};