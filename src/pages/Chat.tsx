import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Bot, User, Settings, Save, Plus, Trash2, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChatMemoryControls } from '@/components/chat/ChatMemoryControls';
import { ConversationStats } from '@/components/chat/ConversationStats';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  chat_messages?: Array<{
    content: string;
    created_at: string;
  }>;
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
  const [showConversations, setShowConversations] = useState(true);
  const [selectedTab, setSelectedTab] = useState('prompts');
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
        .select(`
          *,
          chat_messages(content, created_at)
        `)
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
      
      // Toast rimosso: non mostrare notifica creazione conversazione
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

    setIsLoading(true);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      // Ottieni il system prompt attivo
      const activeSystemPrompt = systemPrompts.find(p => p.attivo);
      const systemPromptContent = activeSystemPrompt?.contenuto || 'Sei un assistente AI utile e amichevole che risponde in italiano.';

      console.log(`Sending message to conversation ${conversationId} with memory settings:`, {
        memoria_completa: currentConversation?.memoria_completa,
        prompt: currentPrompt.substring(0, 50) + '...'
      });

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

      console.log(`Response received with ${data.messages_in_context} messages in context (${data.memory_mode} memory mode)`);

      // Ricarica i messaggi per mostrare la conversazione aggiornata
      await loadMessages(conversationId);

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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              Chat AI
            </h1>
          </div>
          
          {/* Stats verticali in grigio */}
          {lastResponseStats && (
            <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-1">
              <span>{lastResponseStats.tokens} token</span>
              <span>{lastResponseStats.responseTime}ms</span>
              <span>{lastResponseStats.memoryMode} memory</span>
            </div>
          )}
        </div>
        
        {/* Settings Icon */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-transparent border-0 hover:bg-transparent">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto mx-2">
            <DialogHeader className="pb-3 sm:pb-4">
              <DialogTitle className="text-lg sm:text-xl">Gestione Chat AI</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 sm:space-y-6">
              <Select value={selectedTab} onValueChange={setSelectedTab}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona una sezione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prompts">🤖 System Prompts</SelectItem>
                  <SelectItem value="controls">⚙️ Controlli Memoria</SelectItem>
                  <SelectItem value="stats">📊 Statistiche</SelectItem>
                </SelectContent>
              </Select>

              {selectedTab === 'prompts' && (
                <div className="space-y-4 sm:space-y-6">
                  <Card className="bg-card-transparent">
                    <Collapsible open={isSystemPromptOpen} onOpenChange={setIsSystemPromptOpen}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 sm:py-4">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="text-sm sm:text-base font-medium">System Prompt Management</span>
                            </div>
                            {isSystemPromptOpen ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />}
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4 sm:space-y-6 pt-0 pb-4 sm:pb-6">
                          <div>
                            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">System Prompts Esistenti</h4>
                            <div className="space-y-3 sm:space-y-4">
                              {systemPrompts.map((prompt) => (
                                <div
                                  key={prompt.id}
                                  className={`p-3 sm:p-4 border rounded-lg ${
                                    prompt.attivo ? 'border-primary bg-primary/5' : 'border-border'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                        <h5 className="font-semibold text-sm sm:text-base">{prompt.nome}</h5>
                                        {prompt.attivo && (
                                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                                            ATTIVO
                                          </span>
                                        )}
                                      </div>
                                      <div className="bg-muted/30 p-2 sm:p-3 rounded-md border">
                                        <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                                          {prompt.contenuto}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                                      {!prompt.attivo && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => activateSystemPrompt(prompt.id)}
                                          className="min-w-[70px] sm:min-w-[80px] text-xs sm:text-sm"
                                        >
                                          Attiva
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteSystemPrompt(prompt.id)}
                                        className="min-w-[70px] sm:min-w-[80px] text-xs sm:text-sm"
                                      >
                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4 sm:pt-6">
                            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Crea Nuovo System Prompt</h4>
                            <div className="space-y-3 sm:space-y-4">
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2 block">
                                  Nome Prompt
                                </label>
                                <Input
                                  placeholder="Inserisci il nome del system prompt..."
                                  value={newSystemPromptName}
                                  onChange={(e) => setNewSystemPromptName(e.target.value)}
                                  className="h-9 sm:h-10 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2 block">
                                  Contenuto Prompt
                                </label>
                                <Textarea
                                  placeholder="Inserisci il contenuto del system prompt..."
                                  value={newSystemPromptContent}
                                  onChange={(e) => setNewSystemPromptContent(e.target.value)}
                                  rows={4}
                                  className="min-h-[80px] sm:min-h-[100px] resize-none text-sm"
                                />
                              </div>
                              <Button onClick={createSystemPrompt} className="w-full h-9 sm:h-10 text-sm">
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                Crea System Prompt
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </div>
              )}

              {selectedTab === 'controls' && (
                <ChatMemoryControls
                  conversationId={currentConversationId}
                  memoriaCompleta={currentConversation?.memoria_completa || false}
                  onMemoriaCompletaChange={handleMemoriaCompletaChange}
                />
              )}

              {selectedTab === 'stats' && (
                <ConversationStats
                  conversationId={currentConversationId}
                  currentTokenUsage={lastResponseStats?.tokens}
                  responseTime={lastResponseStats?.responseTime}
                  modelUsed={lastResponseStats?.model}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Layout Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 order-2 xl:order-1">
          <Card className="bg-card-transparent">
            <CardHeader className="cursor-pointer py-4" onClick={() => setShowConversations(!showConversations)}>
              <CardTitle className="flex items-center justify-between">
                <span>Conversazioni</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); createNewConversation(); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  {showConversations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
            {showConversations && (
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`w-full text-left h-auto p-3 rounded-lg border transition-all cursor-pointer ${
                      currentConversationId === conversation.id 
                        ? 'bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent border-purple-500/20' 
                        : 'border-border bg-transparent hover:bg-gradient-to-l hover:from-purple-500/10 hover:via-purple-500/5 hover:via-35% hover:to-transparent hover:border-purple-500/30'
                    }`}
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="w-full space-y-2">
                      <div className="text-xs text-muted-foreground">
                        {new Date(conversation.updated_at).toLocaleDateString()} {new Date(conversation.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {conversation.chat_messages && conversation.chat_messages.length > 0 
                          ? conversation.chat_messages[0].content.substring(0, 60) + (conversation.chat_messages[0].content.length > 60 ? '...' : '')
                          : 'Nuova chat'
                        }
                      </div>
                    </div>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    Nessuna conversazione ancora
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Area Chat Principale */}
        <div className="xl:col-span-3 space-y-6 order-1 xl:order-2">
          {/* Messaggi della Conversazione */}
          {currentConversationId && messages.length > 0 && (
            <Card className="bg-card-transparent">
              <CardHeader className="py-4">
                <CardTitle className="flex items-center justify-between">
                  <span>Conversazione</span>
                  {currentConversation?.memoria_completa && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                      🧠 Memoria Completa Attiva
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto px-2 sm:px-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <Bot className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    )}
                    <div
                      className={`w-full max-w-none sm:max-w-[85%] p-3 sm:p-4 rounded-lg border ${
                        message.role === 'user'
                          ? 'bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent border-purple-500/20'
                          : 'bg-gradient-to-l from-orange-500/10 via-orange-500/5 via-35% to-transparent border-orange-500/20'
                      }`}
                    >
                      <div 
                        className="text-sm whitespace-pre-wrap leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: message.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
                            .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-2 rounded my-2 overflow-x-auto"><code>$1</code></pre>')
                            .replace(/\n/g, '<br>')
                        }}
                      />
                      <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50 flex justify-between items-center gap-2">
                        <span>{new Date(message.created_at).toLocaleString('it-IT', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                        <div className="flex gap-2 items-center">
                          {message.model && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{message.model}</span>
                          )}
                          {message.tokens_used && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{message.tokens_used}t</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <User className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!currentConversationId && (
            <Card className="bg-card-transparent">
              <CardContent className="flex items-center justify-start py-8 px-6">
                <MessageSquare className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
                <p className="text-muted-foreground">
                  Seleziona una conversazione esistente o iniziane una nuova per iniziare a chattare.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Area Input */}
          <Card className="bg-card-transparent">
            <CardHeader className="py-4">
              <CardTitle>
                {currentConversationId ? 'Continua la conversazione' : 'Inizia una nuova conversazione'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Inserisci qui il tuo messaggio..."
                  className="min-h-[120px] resize-none"
                  disabled={isLoading}
                />
                
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
        </div>
      </div>
    </div>
  );
};

export default Chat;