import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIProviderSelector } from '@/components/chat-laboratory/AIProviderSelector';
import ReactMarkdown from 'react-markdown';

interface AIManualCanvasProps {
  className?: string;
}

export const AIManualCanvas = ({ className }: AIManualCanvasProps) => {
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  const handleAskAI = async () => {
    if (!userInput.trim()) {
      toast.error('Scrivi una domanda per AI');
      return;
    }

    if (!selectedConfigId) {
      toast.error('Seleziona un provider AI');
      return;
    }

    setIsLoading(true);
    setAiResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('email-ai-manual-assistant', {
        body: {
          user_message: userInput,
          ai_config_id: selectedConfigId,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Errore nella chiamata AI: ' + error.message);
        return;
      }

      if (data?.response) {
        setAiResponse(data.response);
      } else {
        toast.error('Risposta AI non valida');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto nella chiamata AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAI();
    }
  };

  return (
    <Card className={`border-2 border-primary/20 ${className}`}>
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Assistente AI Manuale
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Fai domande ad AI per analizzare email, creare regole, o ottenere suggerimenti
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Selezione AI Provider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Seleziona AI Provider</label>
          <AIProviderSelector
            selectedConfigId={selectedConfigId}
            onConfigChange={setSelectedConfigId}
          />
        </div>

        {/* Input Utente */}
        <div className="space-y-2">
          <label className="text-sm font-medium">La tua domanda</label>
          <Textarea
            placeholder="es: Come posso gestire automaticamente le email da LinkedIn? Voglio che le offerte di lavoro mi vengano inoltrate subito..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px]"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Premi Invio per inviare, Shift+Invio per andare a capo
            </p>
            <Button
              onClick={handleAskAI}
              disabled={isLoading || !selectedConfigId || !userInput.trim()}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI sta pensando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Chiedi ad AI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Risposta AI */}
        {aiResponse && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium">Risposta AI</label>
            </div>
            <div className="bg-muted/50 p-4 rounded-md border prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{aiResponse}</ReactMarkdown>
            </div>
          </div>
        )}

        {!aiResponse && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Fai una domanda ad AI per iniziare</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
