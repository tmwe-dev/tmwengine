import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface SenderAIChatDialogProps {
  senderEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SenderAIChatDialog({ senderEmail, open, onOpenChange }: SenderAIChatDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    const currentPrompt = prompt;
    setPrompt('');

    // Aggiungi messaggio utente
    const userMessage: Message = {
      role: 'user',
      content: currentPrompt,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const isGeneralAssistant = senderEmail === 'assistente.email@ai.local';
      const systemPrompt = isGeneralAssistant
        ? `Sei un assistente AI che aiuta a gestire le email. 
Aiuta l'utente con domande generali sulla gestione email, organizzazione, best practices, etc.
Rispondi sempre in italiano.`
        : `Sei un assistente AI che aiuta a gestire le email. 
Il mittente con cui stai parlando è: ${senderEmail}
Aiuta l'utente a capire meglio le email di questo mittente, suggerisci azioni, analizza pattern, etc.
Rispondi sempre in italiano.`;

      const { data, error } = await supabase.functions.invoke('chat-with-openai', {
        body: { 
          prompt: currentPrompt, 
          systemPrompt: systemPrompt,
          conversationId: null // Chat temporanea senza persistenza
        }
      });

      if (error) throw error;

      // Aggiungi risposta assistente
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Errore invio prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] backdrop-blur-md bg-background/95 border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Chat AI{senderEmail !== 'assistente.email@ai.local' ? ` - ${senderEmail}` : ' - Assistente Email'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full gap-4">
          {/* Messages Area */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Inizia una conversazione su questo mittente</p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <Card className={`max-w-[80%] backdrop-blur-md ${
                    message.role === 'assistant' 
                      ? 'bg-card/80 border-white/10' 
                      : 'bg-primary/10 border-primary/20'
                  }`}>
                    <div className="p-4">
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(message.created_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </Card>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <Card className="backdrop-blur-md bg-card/80 border-white/10">
                    <div className="p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Scrivi un messaggio sulla gestione di questo mittente..."
              className="flex-1 resize-none backdrop-blur-md bg-background/50 border-white/10"
              rows={3}
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={!prompt.trim() || isLoading}
              className="self-end"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
