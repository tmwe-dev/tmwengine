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
    try {
      const { data, error } = await supabase
        .from('chat_system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSystemPrompts(data || []);
      
      // Seleziona il prompt attivo
      const activePrompt = data?.find(p => p.attivo);
      if (activePrompt) {
        setSelectedSystemPromptId(activePrompt.id);
      }
    } catch (error) {
      console.error('Errore caricamento system prompts:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Errore caricamento conversazioni:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Errore caricamento messaggi:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          titolo: `Conversazione ${new Date().toLocaleString()}`,
          system_prompt_id: selectedSystemPromptId || null
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentConversationId(data.id);
      setMessages([]);
      
      toast({
        title: "Nuova Conversazione",
        description: "Conversazione creata con successo.",
      });
    } catch (error) {
      console.error('Errore creazione conversazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la conversazione.",
        variant: "destructive",
      });
    }
  };

  const selectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    loadMessages(conversationId);
    
    // Carica dettagli conversazione
    const { data: convData } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (convData) {
      setCurrentConversation(convData);
    }
  };

  const createSystemPrompt = async () => {
    if (!newSystemPromptName.trim() || !newSystemPromptContent.trim()) {
      toast({
        title: "Errore",
        description: "Nome e contenuto sono obbligatori.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_system_prompts')
        .insert({
          nome: newSystemPromptName,
          contenuto: newSystemPromptContent,
          attivo: false
        });

      if (error) throw error;

      setNewSystemPromptName('');
      setNewSystemPromptContent('');
      
      toast({
        title: "System Prompt Creato",
        description: "Il nuovo system prompt è stato creato.",
      });
    } catch (error) {
      console.error('Errore creazione system prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il system prompt.",
        variant: "destructive",
      });
    }
  };

  const activateSystemPrompt = async (promptId: string) => {
    try {
      // Disattiva tutti gli altri
      await supabase
        .from('chat_system_prompts')
        .update({ attivo: false })
        .neq('id', promptId);

      // Attiva quello selezionato
      const { error } = await supabase
        .from('chat_system_prompts')
        .update({ attivo: true })
        .eq('id', promptId);

      if (error) throw error;

      setSelectedSystemPromptId(promptId);
      
      toast({
        title: "System Prompt Attivato",
        description: "Il system prompt è ora attivo.",
      });
    } catch (error) {
      console.error('Errore attivazione system prompt:', error);
    }
  };

  const deleteSystemPrompt = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('chat_system_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;
      
      toast({
        title: "System Prompt Eliminato",
        description: "Il system prompt è stato eliminato.",
      });
    } catch (error) {
      console.error('Errore eliminazione system prompt:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Crea una nuova conversazione se non esiste
    let conversationId = currentConversationId;
    if (!conversationId) {
      await createNewConversation();
      return; // Il messaggio verrà inviato dopo la creazione della conversazione
    }

    // Salva il messaggio utente
    try {
      const { data: userMessageData, error: userMessageError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: prompt
        })
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      setIsLoading(true);
      const currentPrompt = prompt;
      setPrompt('');

      // Ottieni il system prompt attivo
      const activeSystemPrompt = systemPrompts.find(p => p.attivo);
      const systemPromptContent = activeSystemPrompt?.contenuto || 'Sei un assistente AI utile e amichevole che risponde in italiano.';

      const { data, error } = await supabase.functions.invoke('chat-with-openai', {
        body: { 
          prompt: currentPrompt, 
          systemPrompt: systemPromptContent,
          conversationId: conversationId
        }
      });

      if (error) throw error;

      // Aggiorna statistiche ultima risposta
      setLastResponseStats({
        tokens: data.tokens_used || 0,
        responseTime: data.response_time_ms || 0,
        model: data.model || 'unknown',
        memoryMode: data.memory_mode || 'limited',
        messagesInContext: data.messages_in_context || 0
      });

      // Salva la risposta AI con statistiche dettagliate
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: data.response,
          model: data.model,
          tokens_used: data.tokens_used,
          token_input: data.tokens_input,
          token_output: data.tokens_output,
          tempo_risposta_ms: data.response_time_ms
        });

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

  // Auto-invia il prompt se una conversazione viene appena creata
  useEffect(() => {
    if (currentConversationId && prompt.trim()) {
      handleSubmit(new Event('submit') as any);
    }
  }, [currentConversationId]);

  const handleMemoriaCompletaChange = (value: boolean) => {
    if (currentConversation) {
      setCurrentConversation({ ...currentConversation, memoria_completa: value });
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

      {/* Sidebar Conversazioni */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Conversazioni
                <Button onClick={createNewConversation} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  variant={currentConversationId === conversation.id ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => selectConversation(conversation.id)}
                >
                  <div className="truncate">
                    <div className="font-medium truncate">
                      {conversation.titolo || 'Conversazione senza titolo'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))}
              {conversations.length === 0 && (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  Nessuna conversazione ancora
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Area Chat Principale */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">💬 Chat</TabsTrigger>
              <TabsTrigger value="controls">⚙️ Controlli Memoria</TabsTrigger>
              <TabsTrigger value="stats">📊 Statistiche</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-6">
              {/* System Prompt Configuration */}
              <Card>
                <Collapsible open={isSystemPromptOpen} onOpenChange={setIsSystemPromptOpen}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        System Prompt Management
                        <span className="text-sm text-muted-foreground ml-auto">
                          {isSystemPromptOpen ? 'Chiudi' : 'Gestisci'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      {/* System Prompts Esistenti */}
                      <div>
                        <h4 className="font-medium mb-3">System Prompts Esistenti</h4>
                        <div className="space-y-3">
                          {systemPrompts.map((prompt) => (
                            <div
                              key={prompt.id}
                              className={`p-3 border rounded-lg break-words overflow-hidden whitespace-pre-wrap ${
                                prompt.attivo ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 overflow-hidden">
                                  <div className="font-medium flex items-center gap-2">
                                    {prompt.nome}
                                    {prompt.attivo && (
                                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                        ATTIVO
                                      </span>
                                    )}
                                  </div>
                                   <p className="text-sm text-muted-foreground mt-1 break-words overflow-hidden whitespace-pre-wrap">
                                     {prompt.contenuto}
                                   </p>
                                </div>
                                <div className="flex gap-2">
                                  {!prompt.attivo && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => activateSystemPrompt(prompt.id)}
                                    >
                                      Attiva
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteSystemPrompt(prompt.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Crea Nuovo System Prompt */}
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Crea Nuovo System Prompt</h4>
                        <div className="space-y-3">
                          <Input
                            placeholder="Nome del system prompt..."
                            value={newSystemPromptName}
                            onChange={(e) => setNewSystemPromptName(e.target.value)}
                          />
                          <Textarea
                            placeholder="Contenuto del system prompt..."
                            value={newSystemPromptContent}
                            onChange={(e) => setNewSystemPromptContent(e.target.value)}
                            rows={3}
                          />
                          <Button onClick={createSystemPrompt} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Crea System Prompt
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Area Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{currentConversationId ? 'Continua la conversazione' : 'Inizia una nuova conversazione'}</span>
                    {lastResponseStats && (
                      <div className="flex gap-2 text-xs">
                        <span className="bg-primary/10 px-2 py-1 rounded">
                          {lastResponseStats.tokens} token
                        </span>
                        <span className="bg-secondary px-2 py-1 rounded">
                          {lastResponseStats.responseTime}ms
                        </span>
                        <span className="bg-muted px-2 py-1 rounded">
                          {lastResponseStats.memoryMode} memory
                        </span>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Inserisci qui il tuo messaggio..."
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
                        {isLoading ? 'Invio...' : 'Invia Messaggio'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Messaggi della Conversazione */}
              {currentConversationId && messages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Conversazione</span>
                      {currentConversation?.memoria_completa && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                          🧠 Memoria Completa Attiva
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-96 overflow-y-auto">
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
                          <div className="text-xs opacity-70 mt-2 flex justify-between">
                            <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                            <div className="flex gap-2">
                              {message.model && (
                                <span className="text-xs">{message.model}</span>
                              )}
                              {message.tokens_used && (
                                <span className="text-xs">{message.tokens_used}t</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {message.role === 'user' && (
                          <User className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {!currentConversationId && (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Seleziona una conversazione esistente o iniziane una nuova per iniziare a chattare.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="controls">
              <ChatMemoryControls
                conversationId={currentConversationId}
                memoriaCompleta={currentConversation?.memoria_completa || false}
                onMemoriaCompletaChange={handleMemoriaCompletaChange}
              />
            </TabsContent>

            <TabsContent value="stats">
              <ConversationStats
                conversationId={currentConversationId}
                currentTokenUsage={lastResponseStats?.tokens}
                responseTime={lastResponseStats?.responseTime}
                modelUsed={lastResponseStats?.model}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Chat;