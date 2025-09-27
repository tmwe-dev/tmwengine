import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Bot, User, Settings, Save, Plus, Trash2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChatMemoryControls } from '@/components/chat/ChatMemoryControls';
import { ConversationStats } from '@/components/chat/ConversationStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokens_used?: number;
  created_at: string;
}

interface SystemPrompt {
  id: string;
  nome: string;
  contenuto: string;
  attivo: boolean;
}

interface Conversation {
  id: string;
  titolo?: string;
  system_prompt_id?: string;
  memoria_completa?: boolean;
  riassunto_contesto?: string;
  created_at: string;
  updated_at: string;
}

const Chat = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string>('');
  const [newSystemPromptName, setNewSystemPromptName] = useState('');
  const [newSystemPromptContent, setNewSystemPromptContent] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [lastResponseStats, setLastResponseStats] = useState<{
    tokens: number;
    responseTime: number;
    model: string;
    memoryMode: string;
    messagesInContext: number;
  } | null>(null);
  const { toast } = useToast();

  // Carica system prompts
  useEffect(() => {
    loadSystemPrompts();
    loadConversations();
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    const messagesChannel = supabase
      .channel('chat-messages-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          console.log('Message update:', payload);
          if (currentConversationId) {
            loadMessages(currentConversationId);
          }
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('chat-conversations-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_conversations' },
        (payload) => {
          console.log('Conversation update:', payload);
          loadConversations();
        }
      )
      .subscribe();

    const systemPromptsChannel = supabase
      .channel('chat-system-prompts-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_system_prompts' },
        (payload) => {
          console.log('System prompt update:', payload);
          loadSystemPrompts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(systemPromptsChannel);
    };
  }, [currentConversationId]);

  const loadSystemPrompts = async () => {
    const { data, error } = await supabase
      .from('chat_system_prompts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore caricamento system prompts:', error);
      return;
    }

    setSystemPrompts(data || []);
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Errore caricamento conversazioni:', error);
      return;
    }

    setConversations(data || []);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Errore caricamento messaggi:', error);
      return;
    }

    setMessages(data?.map(msg => ({
      ...msg,
      role: msg.role as 'user' | 'assistant'
    })) || []);
  };

  const createNewConversation = async () => {
    try {
      // Get active system prompt
      const activePrompt = systemPrompts.find(p => p.attivo);
      
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert([{
          titolo: `Conversazione ${new Date().toLocaleDateString('it-IT')}, ${new Date().toLocaleTimeString('it-IT')}`,
          system_prompt_id: activePrompt?.id || null,
          memoria_completa: false
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      setCurrentConversation(data);
      setMessages([]);
      toast({
        title: "Nuova conversazione creata",
        description: "Puoi iniziare a chattare!"
      });
    } catch (error) {
      console.error('Errore creazione conversazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la conversazione",
        variant: "destructive"
      });
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);
    setCurrentConversation(conversation);
    loadMessages(conversation.id);
  };

  const createSystemPrompt = async () => {
    if (!newSystemPromptName.trim() || !newSystemPromptContent.trim()) {
      toast({
        title: "Errore",
        description: "Nome e contenuto sono obbligatori",
        variant: "destructive"
      });
      return;
    }

    try {
      // Disattiva tutti gli altri prompt
      await supabase
        .from('chat_system_prompts')
        .update({ attivo: false })
        .neq('id', '');

      const { data, error } = await supabase
        .from('chat_system_prompts')
        .insert([{
          nome: newSystemPromptName.trim(),
          contenuto: newSystemPromptContent.trim(),
          attivo: true
        }])
        .select()
        .single();

      if (error) throw error;

      setNewSystemPromptName('');
      setNewSystemPromptContent('');
      setIsSystemPromptOpen(false);
      
      toast({
        title: "System prompt creato",
        description: "Il nuovo prompt è stato attivato"
      });
      
      loadSystemPrompts();
    } catch (error) {
      console.error('Errore creazione system prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il system prompt",
        variant: "destructive"
      });
    }
  };

  const activateSystemPrompt = async (promptId: string) => {
    if (!promptId) return;

    try {
      // Disattiva tutti
      await supabase
        .from('chat_system_prompts')
        .update({ attivo: false })
        .neq('id', '');

      // Attiva quello selezionato
      const { error } = await supabase
        .from('chat_system_prompts')
        .update({ attivo: true })
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: "System prompt attivato",
        description: "Il prompt selezionato è ora attivo"
      });

      loadSystemPrompts();
    } catch (error) {
      console.error('Errore attivazione system prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile attivare il system prompt",
        variant: "destructive"
      });
    }
  };

  const deleteSystemPrompt = async (promptId: string) => {
    if (!promptId) return;

    try {
      const { error } = await supabase
        .from('chat_system_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: "System prompt eliminato",
        description: "Il prompt è stato rimosso"
      });

      loadSystemPrompts();
      setSelectedSystemPromptId('');
    } catch (error) {
      console.error('Errore eliminazione system prompt:', error);
      toast({
        title: "Errore", 
        description: "Impossibile eliminare il system prompt",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    // Create conversation if none exists
    if (!currentConversationId) {
      await createNewConversation();
      return;
    }

    const userMessage = prompt.trim();
    setPrompt('');
    setIsLoading(true);

    try {
      // Save user message
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: currentConversationId,
          role: 'user',
          content: userMessage
        }])
        .select()
        .single();

      if (messageError) throw messageError;

      // Get active system prompt
      const activePrompt = systemPrompts.find(p => p.attivo);

      // Call the chat function
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat-with-openai', {
        body: {
          prompt: userMessage,
          systemPrompt: activePrompt?.contenuto || 'Sei un assistente AI utile e amichevole che risponde in italiano.',
          conversationId: currentConversationId
        }
      });

      if (chatError) throw chatError;

      console.log('Risposta AI:', chatResponse);

      // Update stats from response
      if (chatResponse.tokens_used || chatResponse.response_time_ms) {
        setLastResponseStats({
          tokens: chatResponse.tokens_used || 0,
          responseTime: chatResponse.response_time_ms || 0,
          model: chatResponse.model || 'N/A',
          memoryMode: chatResponse.memory_mode || 'N/A',
          messagesInContext: chatResponse.messages_in_context || 0
        });
      }

      // Save AI response
      const { error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert([{
          conversation_id: currentConversationId,
          role: 'assistant',
          content: chatResponse.response || 'Errore nella risposta',
          model: chatResponse.model,
          tokens_used: chatResponse.tokens_used,
          tempo_risposta_ms: chatResponse.response_time_ms
        }]);

      if (aiMessageError) throw aiMessageError;

      toast({
        title: "Messaggio inviato",
        description: "Risposta ricevuta con successo"
      });

    } catch (error) {
      console.error('Errore invio prompt:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nell'invio del messaggio",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemoriaCompletaChange = async (enabled: boolean) => {
    if (!currentConversationId) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ memoria_completa: enabled })
        .eq('id', currentConversationId);

      if (error) throw error;

      setCurrentConversation(prev => prev ? { ...prev, memoria_completa: enabled } : null);
      
      toast({
        title: enabled ? "Memoria completa attivata" : "Memoria completa disattivata",
        description: enabled 
          ? "Tutti i messaggi saranno mantenuti in memoria" 
          : "Solo i messaggi recenti saranno mantenuti"
      });
    } catch (error) {
      console.error('Errore aggiornamento memoria:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le impostazioni di memoria",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-7rem)] gap-4 lg:gap-6">
      {/* Conversations Sidebar */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col order-2 lg:order-1">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversazioni
              </CardTitle>
              <Button onClick={createNewConversation} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Nuova</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-3 overflow-hidden">
            <div className="space-y-2 h-full overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nessuna conversazione</p>
                  <p className="text-xs mt-1">Inizia una nuova chat</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                      currentConversationId === conv.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-accent'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">
                      {conv.titolo || `Conversazione del ${new Date(conv.created_at).toLocaleDateString()}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{new Date(conv.created_at).toLocaleString('it-IT')}</span>
                      {conv.memoria_completa && (
                        <Badge variant="secondary" className="text-xs">
                          Full Memory
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="mt-4 w-full">
              <Settings className="h-4 w-4 mr-2" />
              Impostazioni Chat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Impostazioni Chat AI</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="memory" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="memory">Memoria</TabsTrigger>
                <TabsTrigger value="prompts">System Prompts</TabsTrigger>
                <TabsTrigger value="stats">Statistiche</TabsTrigger>
              </TabsList>
              
              <TabsContent value="memory" className="space-y-4">
                <ChatMemoryControls 
                  conversationId={currentConversationId}
                  memoriaCompleta={currentConversation?.memoria_completa || false}
                  onMemoriaCompletaChange={(enabled) => handleMemoriaCompletaChange(enabled)}
                />
              </TabsContent>
              
              <TabsContent value="prompts" className="space-y-4">
                {/* System Prompts Management */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={selectedSystemPromptId} onValueChange={setSelectedSystemPromptId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleziona un system prompt..." />
                      </SelectTrigger>
                      <SelectContent>
                        {systemPrompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.nome} {prompt.attivo && '(Attivo)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => activateSystemPrompt(selectedSystemPromptId)}
                        disabled={!selectedSystemPromptId}
                        size="sm"
                      >
                        Attiva
                      </Button>
                      <Button 
                        onClick={() => deleteSystemPrompt(selectedSystemPromptId)}
                        disabled={!selectedSystemPromptId}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Collapsible open={isSystemPromptOpen} onOpenChange={setIsSystemPromptOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuovo System Prompt
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <Input
                        placeholder="Nome del system prompt..."
                        value={newSystemPromptName}
                        onChange={(e) => setNewSystemPromptName(e.target.value)}
                      />
                      <Textarea
                        placeholder="Contenuto del system prompt..."
                        value={newSystemPromptContent}
                        onChange={(e) => setNewSystemPromptContent(e.target.value)}
                        rows={6}
                      />
                      <Button 
                        onClick={createSystemPrompt}
                        disabled={!newSystemPromptName || !newSystemPromptContent}
                        className="w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salva System Prompt
                      </Button>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="space-y-4">
                <ConversationStats 
                  conversationId={currentConversationId}
                  currentTokenUsage={lastResponseStats?.tokens}
                  responseTime={lastResponseStats?.responseTime}
                  modelUsed={lastResponseStats?.model}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 order-1 lg:order-2">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Chat AI
                {currentConversation && (
                  <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                    {currentConversation.memoria_completa ? 'Full Memory' : 'Limited Memory'}
                  </Badge>
                )}
              </CardTitle>
              {lastResponseStats && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Tokens: {lastResponseStats.tokens}</span>
                  <span className="hidden md:inline">Tempo: {lastResponseStats.responseTime}ms</span>
                  <span className="hidden lg:inline">Modello: {lastResponseStats.model}</span>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col min-h-0 p-3">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Bot className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium mb-2">Benvenuto nel Chat AI</h3>
                    <p className="text-sm max-w-md mx-auto">
                      Inizia una conversazione digitando un messaggio qui sotto. 
                      L'AI può aiutarti con il tuo CRM e rispondere alle tue domande.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    } rounded-lg p-3`}>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      <div className="text-xs opacity-70 mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span>{new Date(message.created_at).toLocaleTimeString('it-IT')}</span>
                        {message.tokens_used && (
                          <span className="hidden sm:inline">• {message.tokens_used} tokens</span>
                        )}
                        {message.model && (
                          <span className="hidden md:inline">• {message.model}</span>
                        )}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Scrivi il tuo messaggio..."
                  className="flex-1 min-h-[60px] resize-none"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  disabled={!prompt.trim() || isLoading}
                  className="self-end sm:self-stretch px-4 h-[60px]"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">
                    {isLoading ? 'Invio...' : 'Invia'}
                  </span>
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;