import { useState, useEffect, useRef } from "react";
import { Brain, X, Send, Loader2, Settings, Trash2, MessageSquare, Sparkles, Image as ImageIcon, Paperclip, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileUploader, UploadedFile } from "@/components/chat/FileUploader";
import { ImageGenerator } from "@/components/chat/ImageGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  tokens_used?: number;
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  created_at: string;
  images?: string[];
  attachments?: UploadedFile[];
  generated_images?: string[];
}

interface Conversation {
  id: string;
  titolo?: string;
  system_prompt_id?: string;
  memoria_completa?: boolean;
  created_at: string;
  updated_at: string;
}

interface AIChatPopupProps {
  pageRoute: string;
}

export function AIChatPopup({ pageRoute }: AIChatPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [aiConfigs, setAiConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [lastResponseStats, setLastResponseStats] = useState<{
    tokens: number;
    responseTime: number;
    model: string;
  } | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load configurations and conversations when opened
  useEffect(() => {
    if (isOpen) {
      loadAIConfigurations();
      loadConversations();
    }
  }, [isOpen]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!isOpen || !currentConversationId) return;

    const messagesChannel = supabase
      .channel('popup-chat-messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${currentConversationId}` },
        () => loadMessages(currentConversationId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [isOpen, currentConversationId]);

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

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
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
      setMessages((data || []) as any);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const { data: pagePrompt } = await supabase
        .from("page_system_prompts")
        .select("id")
        .eq("page_route", pageRoute)
        .eq("attivo", true)
        .single();

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          titolo: `Conversazione ${pageRoute}`,
          system_prompt_id: pagePrompt?.id,
          memoria_completa: false,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentConversationId(data.id);
      setCurrentConversation(data);
      setMessages([]);
      await loadConversations();
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la conversazione",
        variant: "destructive",
      });
      return null;
    }
  };

  const selectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    const conv = conversations.find(c => c.id === conversationId);
    setCurrentConversation(conv || null);
    await loadMessages(conversationId);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setCurrentConversation(null);
        setMessages([]);
      }
      
      await loadConversations();
      
      toast({
        title: "Successo",
        description: "Conversazione eliminata",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la conversazione",
        variant: "destructive",
      });
    }
  };

  const handleMemoriaCompletaChange = async (checked: boolean) => {
    if (!currentConversationId) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ memoria_completa: checked })
        .eq('id', currentConversationId);

      if (error) throw error;

      setCurrentConversation(prev => prev ? { ...prev, memoria_completa: checked } : null);
      
      toast({
        title: "Successo",
        description: checked ? "Memoria completa attivata" : "Memoria limitata attivata",
      });
    } catch (error) {
      console.error('Error updating memory:', error);
    }
  };

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    let convId = currentConversationId;
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
    }

    const userMessageContent = prompt;
    setPrompt("");
    setIsLoading(true);

    try {
      // Get page-specific system prompt
      const { data: pagePrompt } = await supabase
        .from("page_system_prompts")
        .select("system_prompt")
        .eq("page_route", pageRoute)
        .eq("attivo", true)
        .single();

      const systemPrompt = pagePrompt?.system_prompt || "Sei un assistente AI per il CRM FindAir.";

      // Prepare images if any
      const imageUrls = generatedImage ? [generatedImage] : uploadedFiles.map(f => f.url);

      // Call AI chat function
      const { data, error } = await supabase.functions.invoke("chat-with-ai", {
        body: {
          prompt: userMessageContent,
          systemPrompt: systemPrompt,
          conversationId: convId,
          images: imageUrls.length > 0 ? imageUrls : undefined,
          configId: selectedConfigId,
        },
      });

      if (error) throw error;

      // Update stats
      if (data.tokens_used || data.response_time_ms) {
        setLastResponseStats({
          tokens: data.tokens_used || 0,
          responseTime: data.response_time_ms || 0,
          model: data.model || 'Unknown',
        });
      }

      // Clear files after sending
      setUploadedFiles([]);
      setGeneratedImage(null);

      // Reload messages
      await loadMessages(convId);
    } catch (error) {
      console.error("Error calling AI:", error);
      toast({
        title: "Errore AI",
        description: "Impossibile contattare l'assistente AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="icon"
        className="relative"
      >
        <Brain className="h-5 w-5" />
      </Button>

      {/* Chat Popup - Centered with glassmorphism */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Card */}
          <Card 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[95vw] h-[750px] max-h-[90vh] shadow-glow z-50 flex flex-col border-primary/20 animate-scale-in"
            style={{ 
              background: 'linear-gradient(135deg, hsl(var(--card-transparent)) 0%, hsl(var(--card)) 100%)',
              backdropFilter: 'blur(20px)',
            }}
          >
          {/* Header with gradient */}
          <div 
            className="flex items-center justify-between p-4 border-b border-primary/20 rounded-t-lg"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-hover)) 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-foreground/10 backdrop-blur-sm">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">AI Assistant</h3>
                <p className="text-xs text-primary-foreground/70">{pageRoute}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-primary-foreground/10 text-primary-foreground"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Impostazioni Chat</DialogTitle>
                    <DialogDescription>
                      Configura le impostazioni per questa conversazione
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* AI Model Selection */}
                    <div className="space-y-2">
                      <Label>Modello AI</Label>
                      <Select value={selectedConfigId || ''} onValueChange={setSelectedConfigId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona modello" />
                        </SelectTrigger>
                        <SelectContent>
                          {aiConfigs.map((config) => (
                            <SelectItem key={config.id} value={config.id}>
                              {config.provider} - {config.modello}
                              {config.attivo && <Badge className="ml-2" variant="secondary">Attivo</Badge>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Full Memory Toggle */}
                    {currentConversationId && (
                      <div className="flex items-center justify-between">
                        <Label htmlFor="full-memory">Memoria Completa</Label>
                        <Switch
                          id="full-memory"
                          checked={currentConversation?.memoria_completa || false}
                          onCheckedChange={handleMemoriaCompletaChange}
                        />
                      </div>
                    )}

                    {/* Stats */}
                    {lastResponseStats && (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">Ultima Risposta:</p>
                        <p>Modello: {lastResponseStats.model}</p>
                        <p>Token: {lastResponseStats.tokens}</p>
                        <p>Tempo: {lastResponseStats.responseTime}ms</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="hover:bg-primary-foreground/10 text-primary-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conversations Sidebar with glassmorphism */}
          <div 
            className="flex gap-2 p-3 border-b border-border/50 overflow-x-auto bg-surface-secondary/30"
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={createNewConversation}
              className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuova
            </Button>
            {conversations.slice(0, 5).map((conv) => (
              <div key={conv.id} className="flex items-center gap-1 shrink-0">
                <Button
                  variant={currentConversationId === conv.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => selectConversation(conv.id)}
                  className={currentConversationId === conv.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted/50 transition-all"}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {conv.titolo?.substring(0, 12) || 'Chat'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-all"
                  onClick={() => deleteConversation(conv.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 animate-fade-in">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Brain className="h-16 w-16 text-primary opacity-70" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Inizia una conversazione!</h4>
                <p className="text-sm">Usa i tools CRM disponibili per questa pagina</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl p-3 shadow-sm transition-all hover:shadow-md ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground"
                          : "bg-muted/80 backdrop-blur-sm border border-border/50"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Show images */}
                      {msg.images && msg.images.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {msg.images.map((img, idx) => (
                            <img key={idx} src={img} alt="Uploaded" className="max-w-[200px] rounded" />
                          ))}
                        </div>
                      )}
                      
                      {/* Show generated images */}
                      {msg.generated_images && msg.generated_images.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {msg.generated_images.map((img, idx) => (
                            <img key={idx} src={img} alt="Generated" className="max-w-[200px] rounded" />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {msg.model && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            {msg.model}
                          </Badge>
                        )}
                        {msg.tokens_used && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {msg.tokens_used}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-muted/80 backdrop-blur-sm rounded-xl p-3 border border-border/50">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Attachments Preview with improved design */}
          {(uploadedFiles.length > 0 || generatedImage) && (
            <div className="px-4 py-3 border-t border-border/50 bg-surface-secondary/20">
              <p className="text-xs text-muted-foreground mb-2">Allegati:</p>
              <div className="flex gap-2 items-center flex-wrap">
                {uploadedFiles.map((file) => (
                  <div key={file.url} className="relative group">
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="h-14 w-14 object-cover rounded-lg border-2 border-primary/20 group-hover:border-primary/50 transition-all" 
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      onClick={() => setUploadedFiles(files => files.filter(f => f.url !== file.url))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {generatedImage && (
                  <div className="relative group">
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      className="h-14 w-14 object-cover rounded-lg border-2 border-success/20 group-hover:border-success/50 transition-all" 
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      onClick={() => setGeneratedImage(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Area with gradient border */}
          <div 
            className="p-4 border-t border-border/50 space-y-3"
            style={{ 
              background: 'linear-gradient(to top, hsl(var(--surface-secondary)) 0%, transparent 100%)' 
            }}
          >
            <div className="flex gap-2 items-center">
              <FileUploader onFilesUploaded={setUploadedFiles} />
              <ImageGenerator onImageGenerated={setGeneratedImage} />
            </div>
            <div className="flex gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Scrivi il tuo messaggio... (Shift+Enter per nuova riga)"
                className="resize-none bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!prompt.trim() || isLoading}
                size="icon"
                className="shrink-0 h-auto shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-primary to-primary-hover"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
        </>
      )}
    </>
  );
}
