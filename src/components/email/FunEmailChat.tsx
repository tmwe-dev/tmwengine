import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FunEmailMessageInput } from '@/components/email/FunEmailMessageInput';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const FunEmailChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: systemPrompt } = useQuery({
    queryKey: ['page-system-prompt', '/funnemail'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_system_prompts')
        .select('system_prompt')
        .eq('page_route', '/funnemail')
        .eq('attivo', true)
        .single();

      if (error) throw error;
      return data.system_prompt;
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Determine which operation to use based on user message
      let operation: 'stats' | 'search' | 'insights' | 'actions' = 'insights';
      const lowerContent = content.toLowerCase();

      if (lowerContent.includes('statistic') || lowerContent.includes('quant') || lowerContent.includes('numer')) {
        operation = 'stats';
      } else if (lowerContent.includes('cerca') || lowerContent.includes('trova') || lowerContent.includes('search')) {
        operation = 'search';
      } else if (lowerContent.includes('sugger') || lowerContent.includes('azione') || lowerContent.includes('fare')) {
        operation = 'actions';
      }

      // Extract keywords for search
      const keywords = lowerContent.split(' ').filter(w => w.length > 4);

      const { data, error } = await supabase.functions.invoke('fun-email-ai-analysis', {
        body: {
          operation,
          filters: {
            keywords: operation === 'search' ? keywords.slice(0, 3) : undefined,
          },
          context: content,
        },
      });

      if (error) throw error;

      // Format response based on operation
      let response = '';
      if (operation === 'stats' && data.data) {
        const stats = data.data;
        response = `📊 **STATISTICHE EMAIL**\n\n`;
        response += `📧 Totale: **${stats.totalEmails}** email\n\n`;
        response += `📁 Per cartella:\n`;
        Object.entries(stats.folderBreakdown || {}).forEach(([folder, count]) => {
          response += `  • ${folder}: ${count}\n`;
        });
        response += `\n📎 Con allegati: **${stats.withAttachments}**\n\n`;
        response += `🔝 **Top 5 mittenti:**\n`;
        stats.topSenders?.slice(0, 5).forEach((sender: any, i: number) => {
          response += `  ${i + 1}. ${sender.sender} (${sender.count} email)\n`;
        });
      } else if (operation === 'search' && data.data) {
        const results = data.data;
        response = `🔍 **RISULTATI RICERCA**\n\n`;
        response += `Trovate **${results.count}** email\n\n`;
        results.results?.slice(0, 10).forEach((email: any, i: number) => {
          response += `${i + 1}. **${email.subject}**\n`;
          response += `   Da: ${email.from}\n`;
          response += `   Data: ${new Date(email.date).toLocaleDateString('it-IT')}\n`;
          response += `   ${email.preview}...\n\n`;
        });
      } else if (operation === 'insights' && data.data) {
        const insights = data.data;
        response = `💡 **INSIGHTS**\n\n`;
        insights.insights?.forEach((insight: string) => {
          response += `• ${insight}\n`;
        });
        response += `\n📝 **Dettagli:**\n`;
        response += `  • Email senza risposta: ${insights.noReplies}\n`;
        response += `  • Thread attivi: ${insights.activeThreads}\n`;
      } else if (operation === 'actions' && data.data) {
        const actions = data.data;
        response = `🎯 **AZIONI SUGGERITE**\n\n`;
        actions.suggestions?.forEach((suggestion: any) => {
          const emoji = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢';
          response += `${emoji} **${suggestion.description}**\n`;
          response += `   Priorità: ${suggestion.priority}\n\n`;
        });
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error('[FunEmailChat] Error:', error);
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile processare la richiesta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h3 className="font-semibold">AI Email Assistant</h3>
          <p className="text-xs text-muted-foreground">
            Analizza le email scaricate nel backup locale
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          disabled={messages.length === 0}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p className="mb-4">👋 Ciao! Sono il tuo assistente AI per l'analisi email.</p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              <p className="font-medium">Esempi di domande:</p>
              <p>• "Mostrami le statistiche delle mie email"</p>
              <p>• "Cerca email di Mario Rossi"</p>
              <p>• "Quali azioni mi suggerisci?"</p>
              <p>• "Analizza i pattern delle mie email"</p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t">
        <FunEmailMessageInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder="Chiedi qualcosa sulle tue email..."
        />
      </div>
    </div>
  );
};
