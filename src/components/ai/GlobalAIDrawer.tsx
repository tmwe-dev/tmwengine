import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GlobalAIDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalAIDrawer({ open, onOpenChange }: GlobalAIDrawerProps) {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pagePrompt, setPagePrompt] = useState<string>('');
  const [pageName, setPageName] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carica il prompt della pagina corrente
  useEffect(() => {
    if (open) {
      loadPagePrompt();
    }
  }, [open, location.pathname]);

  // Auto scroll ai nuovi messaggi
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadPagePrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('page_system_prompts')
        .select('*')
        .eq('page_route', location.pathname)
        .eq('attivo', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading page prompt:', error);
        return;
      }

      if (data) {
        setPagePrompt(data.system_prompt);
        setPageName(data.page_name);
      } else {
        // Prompt di default se non esiste per questa pagina
        setPagePrompt('Sei un assistente AI che aiuta gli utenti con le loro attività.');
        setPageName('Assistente AI');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      // Costruisci il system prompt con contesto della pagina
      const contextualPrompt = `${pagePrompt}\n\nPagina corrente: ${location.pathname}\nNome pagina: ${pageName}`;

      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          prompt: userMessage.content,
          systemPrompt: contextualPrompt,
          conversationId: null // Chat temporanea senza persistenza
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Nessuna risposta ricevuta.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      toast.error('Errore nella chiamata all\'AI');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Riprova.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div className="flex-1">
            <SheetTitle className="text-lg">
              {pageName || 'Assistente AI'}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Contesto: {location.pathname}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              disabled={messages.length === 0}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Nessun messaggio ancora.</p>
                <p className="text-sm mt-2">Inizia la conversazione chiedendo qualcosa!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!prompt.trim() || isLoading}
              className="h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Premi Invio per inviare, Shift+Invio per andare a capo
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
