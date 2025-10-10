import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SynthesisData {
  chatgpt?: string;
  gemini?: string;
  claude?: string;
  final?: string;
}

interface FinalSynthesisPanelProps {
  synthesis: SynthesisData;
  conversationTitle: string;
}

export const FinalSynthesisPanel = ({ synthesis, conversationTitle }: FinalSynthesisPanelProps) => {
  const exportToPDF = () => {
    // Create printable HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${conversationTitle} - Sintesi Finale</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 3px solid #000; padding-bottom: 10px; }
            h2 { color: #666; margin-top: 30px; border-left: 4px solid #666; padding-left: 10px; }
            .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .final { background: #e8f5e9; border: 2px solid #4caf50; padding: 20px; margin-top: 30px; }
            .icon { display: inline-block; margin-right: 8px; }
          </style>
        </head>
        <body>
          <h1>📄 ${conversationTitle}</h1>
          <p><em>Documento generato il ${new Date().toLocaleString('it-IT')}</em></p>
          
          ${synthesis.chatgpt ? `
            <div class="section">
              <h2><span class="icon">🤖</span>Analisi Strategica (ChatGPT)</h2>
              <p>${synthesis.chatgpt.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
          
          ${synthesis.gemini ? `
            <div class="section">
              <h2><span class="icon">🔷</span>Valutazione Tecnica (Gemini)</h2>
              <p>${synthesis.gemini.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
          
          ${synthesis.claude ? `
            <div class="section">
              <h2><span class="icon">🧠</span>Analisi Critica (Claude)</h2>
              <p>${synthesis.claude.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
          
          ${synthesis.final ? `
            <div class="final">
              <h2><span class="icon">🏆</span>DECISIONE CONDIVISA</h2>
              <p>${synthesis.final.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    
    toast.success('Documento pronto per la stampa/esportazione PDF');
  };

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Sintesi Finale della Discussione
        </h3>
        <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
          <FileDown className="h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      {synthesis.chatgpt && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <span>🤖</span> Analisi Strategica (ChatGPT)
          </h4>
          <div className="bg-background/80 p-4 rounded-lg text-sm whitespace-pre-wrap">
            {synthesis.chatgpt}
          </div>
        </div>
      )}

      {synthesis.gemini && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <span>🔷</span> Valutazione Tecnica (Gemini)
          </h4>
          <div className="bg-background/80 p-4 rounded-lg text-sm whitespace-pre-wrap">
            {synthesis.gemini}
          </div>
        </div>
      )}

      {synthesis.claude && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <span>🧠</span> Analisi Critica (Claude)
          </h4>
          <div className="bg-background/80 p-4 rounded-lg text-sm whitespace-pre-wrap">
            {synthesis.claude}
          </div>
        </div>
      )}

      {synthesis.final && (
        <div className="space-y-2 pt-4 border-t-2 border-primary/20">
          <h4 className="font-bold text-lg flex items-center gap-2">
            <span>🏆</span> DECISIONE CONDIVISA
          </h4>
          <div className="bg-primary/10 p-5 rounded-lg text-sm whitespace-pre-wrap font-medium">
            {synthesis.final}
          </div>
        </div>
      )}
    </Card>
  );
};
