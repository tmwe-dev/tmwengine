import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PageLayout } from '@/components/design-system/layouts/PageLayout';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const BrainChat = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('gemini');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const { data: conv } = await supabase
          .from('chat_laboratory_conversations')
          .insert({
            titolo: 'Brain Chat',
            user_id: user.id
          })
          .select()
          .single();
        
        if (conv) setConversationId(conv.id);
      }
    };
    getUser();
  }, []);

  const { data: technicalContext } = useQuery({
    queryKey: ['brain-technical-context'],
    queryFn: async () => {
      const [duplicates, heavy, shared] = await Promise.all([
        supabase.from('brain_function_analysis')
          .select('*')
          .eq('is_duplicate', true)
          .limit(10),
        supabase.from('brain_function_analysis')
          .select('*')
          .eq('is_heavy', true)
          .order('cyclomatic_complexity', { ascending: false })
          .limit(10),
        supabase.from('brain_function_analysis')
          .select('*')
          .eq('is_shared', true)
          .order('share_count', { ascending: false })
          .limit(10)
      ]);

      return {
        duplicates: duplicates.data || [],
        heavy: heavy.data || [],
        shared: shared.data || []
      };
    }
  });

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId || !currentUser) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const contextData = {
      duplicates: technicalContext?.duplicates.map(d => ({
        function: d.function_name,
        file: d.file_path,
        duplicate_of: d.duplicate_of,
        lines_of_code: d.lines_of_code
      })),
      heavy_functions: technicalContext?.heavy.map(h => ({
        function: h.function_name,
        complexity: h.cyclomatic_complexity,
        lines_of_code: h.lines_of_code,
        file: h.file_path
      })),
      shared_functions: technicalContext?.shared.map(s => ({
        function: s.function_name,
        share_count: s.share_count
      }))
    };

    try {
      const { data, error } = await supabase.functions.invoke('brain-chat-assistant', {
        body: {
          conversation_id: conversationId,
          user_message: inputValue,
          technical_context: contextData,
          selected_agent: selectedAgent
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile ottenere risposta',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="Brain Chat - Debugging Assistant">
      <div className="space-y-4">
        {/* Context Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Contesto Tecnico Caricato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-semibold">{technicalContext?.duplicates.length || 0}</span> duplicati
              </div>
              <div>
                <span className="font-semibold">{technicalContext?.heavy.length || 0}</span> funzioni pesanti
              </div>
              <div>
                <span className="font-semibold">{technicalContext?.shared.length || 0}</span> funzioni condivise
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Seleziona Agente AI</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Pitagora (Gemini 2.5 Flash)</SelectItem>
                <SelectItem value="chatgpt">Albert (GPT-5 Mini)</SelectItem>
                <SelectItem value="claude">Archimede (Claude Sonnet 4.5)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Conversazione</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {messages.map(msg => (
                <div key={msg.id} className={`mb-4 p-4 rounded-lg ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {msg.role === 'user' ? '👤' : <Bot className="h-4 w-4" />}
                    <span className="font-semibold">{msg.role === 'user' ? 'Tu' : 'AI'}</span>
                  </div>
                  <div className="text-sm prose dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="flex gap-2 mt-4">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Chiedi analisi su funzioni, duplicati, performance..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={isLoading || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default BrainChat;
