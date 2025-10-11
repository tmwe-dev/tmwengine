import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, User, Settings, Brain, Cpu, Sparkles, ArrowLeft, LayoutList, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ParticipantSelector } from '@/components/chat-laboratory/ParticipantSelector';
import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { LaboratoryPromptManager } from '@/components/chat-laboratory/LaboratoryPromptManager';
import { FileUploader, UploadedFile } from '@/components/chat/FileUploader';
import { ImageGenerator } from '@/components/chat/ImageGenerator';
import { VoiceRecorder, type VoiceRecorderRef } from '@/components/chat/VoiceRecorder';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageTabsView } from '@/components/chat-laboratory/MessageTabsView';
import { BarModeToggle } from '@/components/chat-laboratory/BarModeToggle';
import { ElevenLabsAgentManager } from '@/components/chat-laboratory/ElevenLabsAgentManager';
import { KnowledgeBaseSelector } from '@/components/chat-laboratory/KnowledgeBaseSelector';
import { BarModeControls } from '@/components/chat-laboratory/BarModeControls';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  is_visible_to_ai: boolean;
  attachments?: UploadedFile[];
  images?: string[];
  generated_images?: string[];
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  created_at: string;
}

interface Participant {
  id: string;
  type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  name: string;
  system_prompt?: string;
  is_active: boolean;
}

const ChatLaboratory = () => {
  const [prompt, setPrompt] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'tabs'>('classic');
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'processing'>('idle');
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  
  // Bar Mode States
  const [isBarMode, setIsBarMode] = useState(false);
  const [selectedElevenLabsAgents, setSelectedElevenLabsAgents] = useState<string[]>([]);
  const [activeKnowledgeBase, setActiveKnowledgeBase] = useState<string | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorderRef>(null);
  const previousMessagesLengthRef = useRef(0);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (messages.length > previousMessagesLengthRef.current) {
      const newCount = messages.length - previousMessagesLengthRef.current;
      
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowNewMessages(false);
        setNewMessagesCount(0);
      } else {
        setShowNewMessages(true);
        setNewMessagesCount(prev => prev + newCount);
      }
    }
    
    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessages(false);
    setNewMessagesCount(0);
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isNearBottom && showNewMessages) {
      setShowNewMessages(false);
      setNewMessagesCount(0);
    }
  };

  useEffect(() => {
    initializeParticipants();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      loadBarModeSettings();
      
      const channel = supabase
        .channel('chat-laboratory-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chat_laboratory_messages' },
          () => loadMessages(currentConversationId)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentConversationId]);

  const loadBarModeSettings = async () => {
    try {
      const { data } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .single();

      if (data) {
        setIsBarMode(data.mode === 'bar');
        setSelectedElevenLabsAgents(data.active_elevenlabs_agents || []);
        setActiveKnowledgeBase(data.active_kb_id);
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni Bar Mode:', error);
    }
  };

  const initializeParticipants = async () => {
    const defaultParticipants: Participant[] = [
      { id: 'human-1', type: 'human', name: 'Tu', is_active: true },
      { id: 'chatgpt-1', type: 'chatgpt', name: 'ChatGPT', is_active: true, system_prompt: '' },
      { id: 'gemini-1', type: 'gemini', name: 'Gemini', is_active: true, system_prompt: '' },
      { id: 'claude-1', type: 'claude', name: 'Claude', is_active: true, system_prompt: '' },
    ];
    setParticipants(defaultParticipants);
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_messages')
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
        .from('chat_laboratory_conversations')
        .insert({
          titolo: `Discussione Multi-Agente ${new Date().toLocaleString()}`,
          active_participants: participants.filter(p => p.is_active).map(p => ({ type: p.type, name: p.name }))
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentConversationId(data.id);
      setMessages([]);

      // Salva partecipanti nella tabella participants
      for (const participant of participants.filter(p => p.is_active)) {
        await supabase
          .from('chat_laboratory_participants')
          .insert({
            conversation_id: data.id,
            type: participant.type,
            name: participant.name,
            system_prompt: participant.system_prompt,
            is_active: true
          });
      }
    } catch (error) {
      console.error('Errore creazione conversazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la conversazione.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      // Crea conversazione inline se non esiste
      let conversationId = currentConversationId;
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('chat_laboratory_conversations')
          .insert({
            titolo: `Discussione Multi-Agente ${new Date().toLocaleString()}`,
            active_participants: participants.filter(p => p.is_active).map(p => ({ type: p.type, name: p.name }))
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
        setCurrentConversationId(conversationId);

        // Salva partecipanti
        for (const participant of participants.filter(p => p.is_active)) {
          await supabase
            .from('chat_laboratory_participants')
            .insert({
              conversation_id: conversationId,
              type: participant.type,
              name: participant.name,
              system_prompt: participant.system_prompt,
              is_active: true
            });
        }
      }

      // Salva messaggio umano
      const { error: insertError } = await supabase
        .from('chat_laboratory_messages')
        .insert([{
          conversation_id: conversationId,
          sender_type: 'human',
          sender_name: 'Tu',
          content: currentPrompt,
          is_visible_to_ai: true,
          attachments: uploadedFiles as any,
          images: uploadedFiles.filter(f => f.isImage).map(f => f.url) as any,
          generated_images: generatedImage ? [generatedImage] as any : []
        }]);

      if (insertError) throw insertError;

      setUploadedFiles([]);
      setGeneratedImage(null);

      // Chiama orchestratore per tutti gli agenti in sequenza
      const activeAIParticipants = participants.filter(p => p.is_active && p.type !== 'human');
      
      for (let i = 0; i < activeAIParticipants.length; i++) {
        try {
          console.log(`🤖 Invocando agente ${i + 1}/${activeAIParticipants.length}...`);
          
          const { data, error } = await supabase.functions.invoke('chat-laboratory-orchestrator', {
            body: { 
              conversationId,
              userMessage: currentPrompt,
              participants: activeAIParticipants
            }
          });

          if (error) {
            console.error(`❌ Errore agente ${i + 1}:`, error);
            toast({
              title: `Errore Agente ${i + 1}`,
              description: error.message || 'Impossibile ottenere risposta',
              variant: "destructive",
            });
            break;
          }

          console.log(`✅ Agente ${i + 1} completato:`, data);
          
          // Ricarica messaggi dopo ogni risposta per mostrare aggiornamenti in tempo reale
          await loadMessages(conversationId);
          
          // Piccolo delay per evitare rate limiting
          if (i < activeAIParticipants.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (loopError) {
          console.error(`❌ Errore nel loop agente ${i + 1}:`, loopError);
          toast({
            title: "Errore di Comunicazione",
            description: "Si è verificato un problema nella catena di risposte",
            variant: "destructive",
          });
          break;
        }
      }

      console.log('🎉 Tutti gli agenti hanno risposto!');

    } catch (error) {
      console.error('Errore invio messaggio:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleParticipant = (participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, is_active: !p.is_active } : p
    ));
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-indigo-900/20 via-background to-violet-900/20">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <Button
                onClick={() => navigate('/chat')}
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shrink-0">
                  <Brain className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent truncate">
                    Chat Laboratory
                  </h1>
                  {!isMobile && (
                    <p className="text-sm text-muted-foreground">
                      Discussione Multi-Agente AI
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Button
                onClick={() => setViewMode(viewMode === 'classic' ? 'tabs' : 'classic')}
                variant="outline"
                size={isMobile ? "icon" : "sm"}
                className={isMobile ? "" : "gap-2"}
              >
                {viewMode === 'classic' ? <Layers className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
                {!isMobile && (viewMode === 'classic' ? 'Vista Tabs' : 'Vista Classica')}
              </Button>
              <LaboratoryPromptManager />
              <ParticipantSelector
                participants={participants}
                onToggle={toggleParticipant}
              />
            </div>
          </div>
          
          {/* Bar Mode Toggle - Centro Pagina */}
          <div className="flex justify-center items-center gap-4 mt-3 pb-2">
            <BarModeToggle
              conversationId={currentConversationId}
              isBarMode={isBarMode}
              onToggle={setIsBarMode}
            />
            {isBarMode && (
              <>
                <ElevenLabsAgentManager
                  conversationId={currentConversationId}
                  onAgentsChange={setSelectedElevenLabsAgents}
                />
                <KnowledgeBaseSelector
                  conversationId={currentConversationId}
                  onKBChange={setActiveKnowledgeBase}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'classic' ? (
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4"
          >
            <div className="container mx-auto max-w-4xl px-2 md:px-0">
              {messages.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 mt-5">
                <MessageSquare className="h-12 w-12 text-indigo-600" />
              </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Inizia una Discussione</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Gli agenti AI selezionati risponderanno in sequenza, ognuno con la propria prospettiva
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {messages.map((message) => (
                <MultiAgentMessage key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Gli agenti stanno elaborando...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <MessageTabsView messages={messages} />
        )}

        {/* New Messages Indicator */}
        {viewMode === 'classic' && showNewMessages && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
            <Button
              onClick={scrollToBottom}
              variant="secondary"
              size="sm"
              className="shadow-lg border border-border/40 gap-2 bg-card/95 backdrop-blur hover:bg-card"
            >
              <Badge variant="default" className="rounded-full px-1.5 py-0.5 min-w-[20px] text-xs">
                {newMessagesCount}
              </Badge>
              <span className="text-sm">Nuovi messaggi</span>
              <span className="text-lg">↓</span>
            </Button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-2 md:p-4">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-3">
            {/* Bar Mode Controls */}
            {isBarMode && (
              <BarModeControls
                conversationId={currentConversationId}
              />
            )}
            
            {/* File Uploads & Image Generator */}
            <div className="flex gap-1 md:gap-2 justify-center md:justify-start">
              <FileUploader
                onFilesUploaded={setUploadedFiles}
              />
              <ImageGenerator
                onImageGenerated={setGeneratedImage}
              />
                <VoiceRecorder
                  ref={voiceRecorderRef}
                  onTranscription={(text) => {
                    setPrompt(prompt + ' ' + text);
                    setRecordingState('idle');
                  }}
                  onRecordingStateChange={setRecordingState}
                />
            </div>

            {/* Textarea */}
            <div className="flex gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isMobile ? "Scrivi il messaggio..." : "Scrivi il tuo messaggio... Gli agenti AI risponderanno in sequenza"}
                className="min-h-[80px] md:min-h-[100px] resize-none text-sm md:text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || (!prompt.trim() && recordingState === 'idle')}
                  className="h-auto px-3 md:px-4 shrink-0"
                  onClick={(e) => {
                    if (recordingState !== 'idle' && recordingState !== 'processing') {
                      e.preventDefault();
                      voiceRecorderRef.current?.stopAndTranscribe();
                    }
                  }}
                >
                  <Send className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatLaboratory;
