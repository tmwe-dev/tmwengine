import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, User, Settings, Save, Plus, Trash2, BarChart3, ChevronDown, ChevronUp, X, ArrowUpDown, Sparkles, Cpu, FileText, ArrowLeft, Users, Menu, Maximize2 } from 'lucide-react';
import { PagePromptManager } from '@/components/ai/PagePromptManager';
import { AIGuideDialog } from '@/components/ai/AIGuideDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChatMemoryControls } from '@/components/chat/ChatMemoryControls';
import { ConversationStats } from '@/components/chat/ConversationStats';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileUploader, UploadedFile } from '@/components/chat/FileUploader';
import { ImageGenerator } from '@/components/chat/ImageGenerator';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { OnlineUsers } from '@/components/intranet/OnlineUsers';
import { SettingsButton } from '@/components/intranet/SettingsButton';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MessageInputWithAttachments } from '@/components/intranet/MessageInputWithAttachments';
import { ChatMessages } from '@/components/intranet/ChatMessages';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  tokens_used?: number;
  created_at: string;
  images?: string[];
  attachments?: UploadedFile[];
  generated_images?: string[];
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

const Best = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pageRoute = searchParams.get('page') || '/best';
  const [pagePromptName, setPagePromptName] = useState<string>('');
  
  // Intranet state
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreatorOrAdmin, setIsCreatorOrAdmin] = useState(false);
  const { onlineUsers } = useIntranetPresence(selectedRoomId || '');
  
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
  const [isLayoutInverted, setIsLayoutInverted] = useState(false);
  const [useSystemPrompt, setUseSystemPrompt] = useState(false);
  const [showPromptConfirm, setShowPromptConfirm] = useState(false);
  const [aiConfigs, setAiConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll verso il basso quando cambiano i messaggi
  useEffect(() => {
    if (!isLayoutInverted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLayoutInverted]);

  // Carica system prompts e AI configurations
  useEffect(() => {
    loadSystemPrompts();
    loadConversations();
    loadAIConfigurations();
    loadPagePrompt();
  }, []);

  // Check user permissions
  const checkCreatorOrAdmin = async () => {
    if (!selectedRoomId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = roleData?.role === 'admin';

      // Check if room creator
      const { data: roomData } = await supabase
        .from('intranet_rooms')
        .select('created_by')
        .eq('id', selectedRoomId)
        .single();

      const isCreator = roomData?.created_by === user.id;

      setIsCreatorOrAdmin(isAdmin || isCreator);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setIsCreatorOrAdmin(false);
    }
  };

  useEffect(() => {
    checkCreatorOrAdmin();
  }, [selectedRoomId]);

  // Carica il prompt specifico della pagina
  const loadPagePrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('page_system_prompts')
        .select('*')
        .eq('page_route', pageRoute)
        .eq('attivo', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPagePromptName(data.page_name);
      } else {
        setPagePromptName('');
      }
    } catch (error) {
      console.error('Errore caricamento page prompt:', error);
      setPagePromptName('');
    }
  };

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

  const loadAIConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('config_ai')
        .select('*')
        .order('provider', { ascending: true });

      if (error) throw error;
      
      setAiConfigs(data || []);
      
      const activeConfig = data?.find(c => c.attivo);
      if (activeConfig) {
        setSelectedConfigId(activeConfig.id);
      }
    } catch (error) {
      console.error('Error loading AI configurations:', error);
    }
  };

  const loadSystemPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSystemPrompts(data || []);
      
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
      
      const messages = (data || []).map(msg => ({
        ...msg,
        images: Array.isArray(msg.images) ? msg.images as string[] : [],
        attachments: Array.isArray(msg.attachments) ? msg.attachments as unknown as UploadedFile[] : [],
        generated_images: Array.isArray(msg.generated_images) ? msg.generated_images as string[] : []
      })) as Message[];
      
      setMessages(messages);
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
      await supabase
        .from('chat_system_prompts')
        .update({ attivo: false })
        .neq('id', promptId);

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

    let conversationId = currentConversationId;
    if (!conversationId) {
      await createNewConversation();
      return;
    }

    setIsLoading(true);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      let systemPromptContent = 'Rispondi in modo conciso.';
      
      if (useSystemPrompt) {
        if (pageRoute !== '/best') {
          const { data: pagePrompt } = await supabase
            .from('page_system_prompts')
            .select('*')
            .eq('page_route', pageRoute)
            .eq('attivo', true)
            .maybeSingle();
          
          if (pagePrompt) {
            systemPromptContent = pagePrompt.system_prompt;
          }
        } else {
          const activeSystemPrompt = systemPrompts.find(p => p.attivo);
          if (activeSystemPrompt) {
            systemPromptContent = activeSystemPrompt.contenuto;
          }
        }
      }

      const imageUrls = [
        ...uploadedFiles.filter(f => f.isImage).map(f => f.url),
        ...(generatedImage ? [generatedImage] : [])
      ];

      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: { 
          prompt: currentPrompt, 
          systemPrompt: systemPromptContent,
          conversationId: conversationId,
          configId: selectedConfigId,
          images: imageUrls.length > 0 ? imageUrls : undefined
        }
      });

      if (error) throw error;

      setUploadedFiles([]);
      setGeneratedImage(null);

      setLastResponseStats({
        tokens: data.tokens_used || 0,
        responseTime: data.response_time_ms || 0,
        model: data.model || 'unknown',
        memoryMode: data.memory_mode || 'limited',
        messagesInContext: data.messages_in_context || 0
      });

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

  const hasMessages = messages.length > 0;
  const shouldHideHeader = isMobile && hasMessages;

  const handlePromptToggle = () => {
    if (!useSystemPrompt) {
      setShowPromptConfirm(true);
    } else {
      setUseSystemPrompt(false);
    }
  };

  const confirmActivatePrompt = () => {
    setUseSystemPrompt(true);
    setShowPromptConfirm(false);
  };

  return (
    <div className={`${shouldHideHeader ? 'h-[calc(100vh-6rem)] flex flex-col overflow-hidden' : 'max-w-7xl mx-auto p-3 sm:p-6'}`}>
      {!shouldHideHeader && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                Best Chat
              </h1>
              {selectedRoomId && <OnlineUsers users={onlineUsers} />}
            </div>
            
            <div className="flex items-center gap-1">
              {selectedConfigId && aiConfigs.length > 0 && (
                <Select value={selectedConfigId || ''} onValueChange={setSelectedConfigId}>
                  <SelectTrigger className="h-8 w-8 p-0 border-none bg-transparent hover:bg-muted">
                    <Cpu className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiConfigs.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{config.provider}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-xs">{config.modello}</span>
                          {config.attivo && <Badge variant="default" className="text-xs ml-2">Attivo</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <AIGuideDialog />
              <PagePromptManager pageRoute="/best" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePromptToggle}
                className="animate-pulse"
                title={useSystemPrompt ? 'Disattiva System Prompts' : 'Attiva System Prompts'}
              >
                <Sparkles className={`h-5 w-5 transition-colors ${useSystemPrompt ? 'text-yellow-500' : 'text-blue-500'}`} />
              </Button>
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
                                <div className="space-y-4">
                                  <h3 className="text-md font-semibold">Crea Nuovo System Prompt</h3>
                                  <div className="grid gap-2">
                                    <Input
                                      type="text"
                                      placeholder="Nome del System Prompt"
                                      value={newSystemPromptName}
                                      onChange={(e) => setNewSystemPromptName(e.target.value)}
                                    />
                                    <Textarea
                                      placeholder="Contenuto del System Prompt"
                                      rows={4}
                                      value={newSystemPromptContent}
                                      onChange={(e) => setNewSystemPromptContent(e.target.value)}
                                    />
                                    <Button onClick={createSystemPrompt}>Crea System Prompt</Button>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <h3 className="text-md font-semibold">System Prompts Esistenti</h3>
                                  <div className="grid gap-2">
                                    {systemPrompts.map((prompt) => (
                                      <Card key={prompt.id} className="bg-muted">
                                        <CardHeader className="flex items-center justify-between">
                                          <CardTitle className="text-sm font-medium">{prompt.nome}</CardTitle>
                                          <div className="flex items-center space-x-2">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => activateSystemPrompt(prompt.id)}
                                              disabled={prompt.attivo}
                                            >
                                              <Plus className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon">
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Questa azione è irreversibile. Vuoi eliminare il system prompt "{prompt.nome}"?
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => deleteSystemPrompt(prompt.id)}>Elimina</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </CardHeader>
                                        <CardContent className="text-sm text-muted-foreground p-3">
                                          {prompt.contenuto}
                                        </CardContent>
                                      </Card>
                                    ))}
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
          </div>

          <div className={`text-sm mt-2 ml-11 max-w-md ${useSystemPrompt ? 'text-yellow-500' : 'text-red-500'}`}>
            {pagePromptName || 'Nessun prompt di pagina'}
          </div>

          {lastResponseStats && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 ml-11">
              <span>{lastResponseStats.tokens} token</span>
              <span>•</span>
              <span>{lastResponseStats.responseTime}ms</span>
              <span>•</span>
              <span>{lastResponseStats.memoryMode} memory</span>
            </div>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 xl:grid-cols-4 gap-6 ${shouldHideHeader ? 'flex-1 overflow-hidden' : ''}`}>
        {/* Room Selector Sidebar */}
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="fixed bottom-20 left-4 z-50 rounded-full shadow-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="p-4">
                <RoomSelector 
                  onRoomSelect={setSelectedRoomId}
                  selectedRoomId={selectedRoomId || undefined}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <div className={`xl:col-span-1 order-2 xl:order-1 ${shouldHideHeader ? 'hidden' : ''}`}>
            <RoomSelector 
              onRoomSelect={setSelectedRoomId}
              selectedRoomId={selectedRoomId || undefined}
            />
          </div>
        )}

        {/* Main Chat Area */}
        <div className={`order-1 xl:order-2 ${shouldHideHeader ? `col-span-1 flex ${isLayoutInverted ? 'flex-col-reverse' : 'flex-col'} h-full overflow-hidden min-h-0 transition-all duration-300` : 'xl:col-span-3 space-y-6'}`}>
          {selectedRoomId ? (
            <>
              <Card className={`bg-card-transparent ${shouldHideHeader ? 'flex-1 flex flex-col border-0 shadow-none overflow-hidden min-h-0' : ''}`}>
                <CardContent className={`overflow-y-auto ${shouldHideHeader ? 'flex-1 px-3 py-3 min-h-0' : 'space-y-3 px-2 sm:px-6 max-h-[600px]'}`}>
                  <div className={shouldHideHeader ? 'space-y-3' : ''}>
                    <ChatMessages roomId={selectedRoomId} isLayoutInverted={isLayoutInverted} shouldHideHeader={shouldHideHeader} />
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-card-transparent ${shouldHideHeader ? 'border-0 shadow-none flex-shrink-0' : ''}`}>
                <CardContent className={shouldHideHeader ? 'p-3' : 'p-3 sm:p-6'}>
                  <MessageInputWithAttachments roomId={selectedRoomId} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card-transparent">
              <CardContent className="flex items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground text-center">
                  Seleziona una stanza per iniziare a chattare
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Settings Button for room creators/admins */}
      {selectedRoomId && isCreatorOrAdmin && (
        <SettingsButton roomId={selectedRoomId} isCreatorOrAdmin={isCreatorOrAdmin} />
      )}

      {/* Layout Toggle Button for Mobile */}
      {isMobile && hasMessages && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg"
          onClick={() => setIsLayoutInverted(!isLayoutInverted)}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      )}

      {/* Prompt Activation Confirmation Dialog */}
      <AlertDialog open={showPromptConfirm} onOpenChange={setShowPromptConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attivare i System Prompts?</AlertDialogTitle>
            <AlertDialogDescription>
              I System Prompts modificano il comportamento dell'AI. Vuoi attivarli per questa conversazione?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivatePrompt}>Attiva</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Best;

