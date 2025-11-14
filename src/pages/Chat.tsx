import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, User, Settings, Save, Plus, Trash2, BarChart3, ChevronDown, ChevronUp, X, ArrowUpDown, Sparkles, Cpu, FileText, ArrowLeft, Copy, Check } from 'lucide-react';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';
import { AIGuideDialog } from '@/components/ai/AIGuideDialog';
import { supabase } from '@/integrations/supabase/client';
import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { ExportSummaryButton } from '@/components/chat/ExportSummaryButton';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ConversationStats } from '@/components/chat/ConversationStats';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileUploader, UploadedFile } from '@/components/chat/FileUploader';
import { ImageGenerator } from '@/components/chat/ImageGenerator';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { StreamingProgress } from '@/components/chat/StreamingProgress';

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

const Chat = () => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pageRoute = searchParams.get('page') || '/chat';
  const [pagePromptName, setPagePromptName] = useState<string>('');
  
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
  
  // Streaming chat hook
  const { 
    isLoading: streamLoading, 
    toolProgress, 
    finalResponse, 
    cancelStream,
    startStream 
  } = useStreamingChat();

  // Auto-scroll verso il basso quando cambiano i messaggi (solo se layout non invertito)
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
        // Non auto-attivare: l'utente deve attivare manualmente
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
        .eq('attivo', true)
        .order('provider', { ascending: true });

      if (error) throw error;
      
      setAiConfigs(data || []);
      
      // Auto-select if only one active config
      if (data && data.length === 1) {
        setSelectedConfigId(data[0].id);
      } else if (data && data.length > 1) {
        // Try to restore from localStorage
        const savedConfigId = localStorage.getItem('chat_selected_ai_config');
        if (savedConfigId && data.find(c => c.id === savedConfigId)) {
          setSelectedConfigId(savedConfigId);
        } else {
          // Default to first one
          setSelectedConfigId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading AI configurations:', error);
    }
  };

  // Save selected config to localStorage
  useEffect(() => {
    if (selectedConfigId) {
      localStorage.setItem('chat_selected_ai_config', selectedConfigId);
    }
  }, [selectedConfigId]);

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
      
      // Cast with proper type mapping for JSON fields
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
      // Ottieni il system prompt - priorità al page prompt se presente
      let systemPromptContent = 'Rispondi in modo conciso.';
      
      if (useSystemPrompt) {
        if (pageRoute !== '/chat') {
          // Usa il page prompt se siamo in una sezione specifica
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
          // Usa il system prompt generale solo se siamo in /chat
          const activeSystemPrompt = systemPrompts.find(p => p.attivo);
          if (activeSystemPrompt) {
            systemPromptContent = activeSystemPrompt.contenuto;
          }
        }
      }

      console.log(`Sending message to conversation ${conversationId} with memory settings:`, {
        memoria_completa: currentConversation?.memoria_completa,
        prompt: currentPrompt.substring(0, 50) + '...'
      });

      // Prepare images for vision models
      const imageUrls = [
        ...uploadedFiles.filter(f => f.isImage).map(f => f.url),
        ...(generatedImage ? [generatedImage] : [])
      ];

      // Use streaming chat
      await startStream({
        prompt: currentPrompt,
        systemPrompt: systemPromptContent,
        conversationId: conversationId,
        configId: selectedConfigId,
        images: imageUrls.length > 0 ? imageUrls : undefined
      });

      // Clear uploaded files after sending
      setUploadedFiles([]);
      setGeneratedImage(null);

    } catch (error) {
      console.error('Errore invio prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio. Riprova.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  // Handle finalResponse from streaming
  useEffect(() => {
    if (finalResponse && currentConversationId) {
      if (finalResponse.data) {
        // Aggiorna statistiche ultima risposta
        setLastResponseStats({
          tokens: finalResponse.data.tokens_used || 0,
          responseTime: finalResponse.data.response_time_ms || 0,
          model: finalResponse.data.model || 'unknown',
          memoryMode: finalResponse.data.memory_mode || 'limited',
          messagesInContext: finalResponse.data.messages_in_context || 0
        });

        console.log(`Response received with ${finalResponse.data.messages_in_context} messages in context (${finalResponse.data.memory_mode} memory mode)`);

        // Ricarica i messaggi per mostrare la conversazione aggiornata
        loadMessages(currentConversationId);
      } else if (finalResponse.error) {
        toast({
          title: "Errore",
          description: "Impossibile inviare il messaggio. Riprova.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }
  }, [finalResponse, currentConversationId]);

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

  const hasMessages = messages.length > 0;
  const shouldHideHeader = isMobile && hasMessages;

  const handlePromptToggle = () => {
    if (!useSystemPrompt) {
      // Sta cercando di attivare i prompts, mostra conferma
      setShowPromptConfirm(true);
    } else {
      // Sta disattivando, nessuna conferma necessaria
      setUseSystemPrompt(false);
    }
  };

  const confirmActivatePrompt = () => {
    setUseSystemPrompt(true);
    setShowPromptConfirm(false);
  };

  const copyMessageToClipboard = async (messageId: string, content: string) => {
    try {
      // Remove HTML tags for clean copy
      const cleanContent = content
        .replace(/<br>/g, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      
      await navigator.clipboard.writeText(cleanContent);
      setCopiedMessageId(messageId);
      
      toast({
        title: "Copiato!",
        description: "Messaggio copiato negli appunti.",
      });
      
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il messaggio.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`${shouldHideHeader ? 'h-[calc(100vh-6rem)] flex flex-col overflow-hidden' : 'max-w-7xl mx-auto p-3 sm:p-6'}`}>
      {!shouldHideHeader && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                Chat AI
              </h1>
            </div>
            
            {/* Settings Icon e Toggle System Prompt - allineati a destra */}
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
              <UnifiedAICommunicationBadge pageRoute="/chat" />
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
                      <Card>
                        <CardHeader>
                          <CardTitle>Controlli Memoria</CardTitle>
                          <CardDescription>
                            I controlli di memoria sono stati spostati nelle Impostazioni Globali
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Ora puoi gestire la memoria AI per tutte le chat (Chat AI, Laboratory, Intranet) 
                            da un'unica sezione centralizzata.
                          </p>
                          <Link to="/settings">
                            <Button className="w-full">
                              <Settings className="h-4 w-4 mr-2" />
                              Vai alle Impostazioni Globali
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
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

          {/* Descrizione prompt sotto il titolo - sempre visibile */}
          <div className={`text-sm mt-2 ml-11 max-w-md ${useSystemPrompt ? 'text-yellow-500' : 'text-red-500'}`}>
            {pagePromptName || 'Nessun prompt di pagina'}
          </div>

          {/* Stats orizzontali in grigio sotto il modello */}
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

      {/* Layout Responsive */}
      <div className={`grid grid-cols-1 xl:grid-cols-4 gap-6 ${shouldHideHeader ? 'flex-1 overflow-hidden' : ''}`}>
        <div className={`xl:col-span-1 order-2 xl:order-1 ${shouldHideHeader ? 'hidden' : ''}`}>
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
        <div className={`order-1 xl:order-2 ${shouldHideHeader ? `col-span-1 flex ${isLayoutInverted ? 'flex-col-reverse' : 'flex-col'} h-full overflow-hidden min-h-0 transition-all duration-300` : 'xl:col-span-3 space-y-6'}`}>
          {/* Messaggi della Conversazione */}
          {currentConversationId && messages.length > 0 && (
            <Card className={`bg-card-transparent ${shouldHideHeader ? 'flex-1 flex flex-col border-0 shadow-none overflow-hidden min-h-0' : ''}`}>
              {!shouldHideHeader && (
                <CardHeader className="py-4">
                  <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                    <span>Conversazione</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentConversation?.memoria_completa && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                          🧠 Memoria Completa
                        </span>
                      )}
                      {currentConversationId && (
                        <>
                          <TokenCounterBadge 
                            conversationId={currentConversationId}
                            variant="chat"
                            alertThreshold={15000}
                          />
                          <ConversationCostBadge conversationId={currentConversationId} />
                          <ExportSummaryButton 
                            conversationId={currentConversationId}
                            variant="chat"
                          />
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
              )}
              <CardContent className={`overflow-y-auto ${shouldHideHeader ? 'flex-1 px-3 py-3 min-h-0' : 'space-y-3 px-2 sm:px-6 max-h-[600px]'}`}>
                <div className={shouldHideHeader ? 'space-y-3' : ''}>
                  {/* Streaming Progress - shown in message flow */}
                  <StreamingProgress
                    toolProgress={toolProgress}
                    isVisible={streamLoading}
                    onCancel={cancelStream}
                  />
                  
                  {(isLayoutInverted && shouldHideHeader ? [...messages].reverse() : messages).map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${shouldHideHeader ? 'mb-3' : ''} ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <Bot className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      )}
                      <div
                        className={`max-w-[75%] p-3 rounded-lg border relative group ${
                          message.role === 'user'
                            ? 'bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent border-purple-500/20'
                            : 'bg-gradient-to-l from-orange-500/10 via-orange-500/5 via-35% to-transparent border-orange-500/20'
                        }`}
                      >
                        {/* Copy button - appears on hover */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyMessageToClipboard(message.id, message.content)}
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted"
                          title="Copia messaggio"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span>{new Date(message.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                          <span>{new Date(message.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Show attachments if any */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {message.attachments.map((file, idx) => (
                              <a 
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1 hover:bg-muted/80"
                              >
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Show images if any */}
                        {message.images && message.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {message.images.map((img, idx) => (
                              <img 
                                key={idx}
                                src={img}
                                alt={`Immagine ${idx + 1}`}
                                className="max-w-xs rounded-lg border"
                              />
                            ))}
                          </div>
                        )}

                        {/* Show generated images if any */}
                        {message.generated_images && message.generated_images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {message.generated_images.map((img, idx) => (
                              <img 
                                key={idx}
                                src={img}
                                alt={`Generata ${idx + 1}`}
                                className="max-w-xs rounded-lg border"
                              />
                            ))}
                          </div>
                        )}

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
                      </div>
                      {message.role === 'user' && (
                        <User className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                {!isLayoutInverted && <div ref={messagesEndRef} />}
                <div ref={messagesEndRef} />
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

          {/* Quick Actions per System Analyst */}
          {pageRoute === '/system-analyst' && currentConversationId && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Esegui un'analisi completa dello stato del sistema")}
              >
                📊 Full System Audit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Analizza tutte le RLS policies e trova vulnerabilità di sicurezza")}
              >
                🔒 Security Check
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Identifica query lente e suggerisci indici da aggiungere")}
              >
                ⚡ Performance Review
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Controlla la qualità dei dati: duplicati, inconsistenze, record orfani")}
              >
                🔍 Data Quality
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Mostra errori critici degli ultimi 7 giorni e analizza le cause")}
              >
                🚨 Recent Errors
              </Button>
            </div>
          )}

          {/* Area Input */}
          <Card className={`bg-card-transparent ${shouldHideHeader ? 'border-0 shadow-none flex-shrink-0' : ''}`}>
            {!shouldHideHeader && (
              <CardHeader className="py-4">
                <CardTitle>
                  {currentConversationId ? 'Continua la conversazione' : 'Inizia una nuova conversazione'}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent className={shouldHideHeader ? 'p-3' : 'p-3 sm:p-6'}>
              <form onSubmit={handleSubmit} className={shouldHideHeader ? 'space-y-3' : 'space-y-4'}>
                {/* Show generated image preview */}
                {generatedImage && (
                  <div className="relative inline-block">
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      className="max-w-xs rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => setGeneratedImage(null)}
                      className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Inserisci qui il tuo messaggio..."
                  className={`resize-none ${shouldHideHeader ? 'min-h-[80px]' : 'min-h-[120px]'}`}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                
                <div className="flex justify-between items-start">
                  {shouldHideHeader ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/chat')}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePromptToggle}
                        className="animate-pulse"
                      >
                        <Sparkles className={`h-4 w-4 transition-colors ${useSystemPrompt ? 'text-yellow-500' : 'text-blue-500'}`} />
                      </Button>
                      {pageRoute === '/system-analyst' && useSystemPrompt && (
                        <Badge variant="secondary" className="ml-2">
                          <Bot className="h-3 w-3 mr-1" />
                          System Context
                        </Badge>
                      )}
                    </div>
                  ) : null}
                  <div className={shouldHideHeader ? 'flex items-center gap-2' : 'w-full flex justify-end items-center gap-2'}>
                    {shouldHideHeader && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto mx-2">
                          <DialogHeader className="pb-3 sm:pb-4">
                            <DialogTitle className="text-lg sm:text-xl">Gestione Chat AI</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 sm:space-y-6 pb-3 sm:pb-4">
                            <ConversationStats conversationId={currentConversationId} />
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Impostazioni Memoria Globali</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                  I controlli di memoria sono ora centralizzati nelle Impostazioni.
                                </p>
                                <Link to="/settings">
                                  <Button className="w-full" variant="outline">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Apri Impostazioni
                                  </Button>
                                </Link>
                              </CardContent>
                            </Card>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <VoiceRecorder 
                      onTranscription={(text) => setPrompt(prev => prev ? `${prev} ${text}` : text)}
                    />
                    <FileUploader 
                      onFilesUploaded={(files) => setUploadedFiles(files)}
                      maxFiles={5}
                    />
                    <ImageGenerator 
                      onImageGenerated={(url) => setGeneratedImage(url)}
                    />
                    <Button 
                      type="submit" 
                      size="icon"
                      disabled={(!prompt.trim() && uploadedFiles.length === 0 && !generatedImage) || isLoading}
                    >
                      <Send className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Toggle Button - Solo mobile */}
          {shouldHideHeader && (
            <div className="absolute left-1/2 transform -translate-x-1/2 z-50" style={{ bottom: 'calc(1rem - 8px)' }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsLayoutInverted(!isLayoutInverted)}
                className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                <ArrowUpDown className="h-5 w-5 text-primary" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog di conferma attivazione System Prompts */}
      <AlertDialog open={showPromptConfirm} onOpenChange={setShowPromptConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attivare i System Prompts?</AlertDialogTitle>
            <AlertDialogDescription>
              L'attivazione dei System Prompts aumenterà il numero di token utilizzati per ogni messaggio, 
              comportando costi maggiori. Vuoi procedere?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivatePrompt}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;