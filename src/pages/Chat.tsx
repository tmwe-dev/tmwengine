import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Chat = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(36),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-openai', {
        body: { prompt }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: Math.random().toString(36),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setPrompt('');
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          Chat AI
        </h1>
        <p className="text-muted-foreground mt-2">
          Inserisci il tuo prompt per interagire con l'intelligenza artificiale
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt di Comando</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Inserisci qui il tuo prompt..."
                className="min-h-[120px] resize-none"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!prompt.trim() || isLoading}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'Invio...' : 'Invia Prompt'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {messages.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Bot className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <User className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Chat;