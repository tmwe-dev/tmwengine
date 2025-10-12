import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, User, Settings, Brain, Cpu, Sparkles, ArrowLeft, LayoutList, Layers, Menu, X, Layout, ChevronDown } from 'lucide-react';
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
import { CollapsibleBarSection } from '@/components/chat-laboratory/CollapsibleBarSection';
import { ConversationsSidebar } from '@/components/chat-laboratory/ConversationsSidebar';
import { LabHeaderControls } from '@/components/chat-laboratory/LabHeaderControls';
import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { ExportSummaryButton } from '@/components/chat/ExportSummaryButton';
import { BarChatAudioControls } from '@/components/chat-laboratory/BarChatAudioControls';
import { EconomyModeToggleCompact } from '@/components/chat-laboratory/EconomyModeToggleCompact';
import { EconomyModeToggle } from '@/components/chat-laboratory/EconomyModeToggle';
import { MessageNavigationBar } from '@/components/chat-laboratory/MessageNavigationBar';

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

interface Conversation {
  id: string;
  titolo: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  total_tokens?: number;
  riassunto_contesto?: string | null;
  active_participants?: Array<{name: string, type: string}>;
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
  
  // Sidebar States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(!useIsMobile());
  
  // Bar Mode States
  const [isBarMode, setIsBarMode] = useState(false);
  const [activeKnowledgeBase, setActiveKnowledgeBase] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  
  // Settings Drawer State
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Full Screen Mode State
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [audioMode, setAudioMode] = useState<'continuous' | 'full-duplex' | 'push-to-talk'>('push-to-talk');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorderRef>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousMessagesLengthRef = useRef(0);

  // Listener per beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentConversationId && messages.length >= 5) {
        generateConversationTitle(currentConversationId);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentConversationId, messages.length]);

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
    loadConversations();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('lab-conversations-list')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_laboratory_conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      loadBarModeSettings();
      
      const channel = supabase
        .channel(`chat-laboratory-${currentConversationId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'chat_laboratory_messages',
            filter: `conversation_id=eq.${currentConversationId}`
          },
          (payload) => {
            console.log('🔔 Real-time update ricevuto:', payload);
            loadMessages(currentConversationId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Carica impostazioni pending da localStorage
      const pending = localStorage.getItem('bar-mode-pending');
      if (pending) {
        const { mode } = JSON.parse(pending);
        setIsBarMode(mode === 'bar');
      }
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

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .select('id, titolo, created_at, updated_at, riassunto_contesto, active_participants')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsWithStats = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('chat_laboratory_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          const { data: messagesData } = await supabase
            .from('chat_laboratory_messages')
            .select('token_input, token_output')
            .eq('conversation_id', conv.id);

          const totalTokens = (messagesData || []).reduce((sum, msg) => 
            sum + (msg.token_input || 0) + (msg.token_output || 0), 0
          );

          return {
            ...conv,
            message_count: count || 0,
            total_tokens: totalTokens,
            active_participants: (conv.active_participants as any) || []
          };
        })
      );

      setConversations(conversationsWithStats);
    } catch (error) {
      console.error('Errore caricamento conversazioni:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    console.log('📥 Caricamento messaggi per conversazione:', conversationId);
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
      
      // ✅ Se Bar Mode attivo, abilita audio automaticamente
      if (isBarMode) {
        await supabase
          .from('chat_laboratory_bar_mode')
          .upsert({
            conversation_id: data.id,
            mode: 'bar',
            voice_enabled: true,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            updated_at: new Date().toISOString()
          }, { onConflict: 'conversation_id' });
      }
      setMessages([]);
      await loadConversations();

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

      // Trasferisci impostazioni pending da localStorage al DB
      await transferPendingSettings(data.id);
    } catch (error) {
      console.error('Errore creazione conversazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la conversazione.",
        variant: "destructive",
      });
    }
  };

  const transferPendingSettings = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Recupera tutte le impostazioni pending
      const pendingMode = localStorage.getItem('bar-mode-pending');
      const pendingKB = localStorage.getItem('bar-mode-kb-pending');
      const pendingControls = localStorage.getItem('bar-mode-controls-pending');

      if (pendingMode) {
        const { mode } = JSON.parse(pendingMode);
        const kb = pendingKB ? JSON.parse(pendingKB) : null;
        const controls = pendingControls ? JSON.parse(pendingControls) : {
          conversation_pace: 'normal',
          enable_interruptions: true,
          auto_play_audio: true,
        };

        await supabase.from('chat_laboratory_bar_mode').insert({
          conversation_id: conversationId,
          user_id: user.id,
          mode: mode,
          voice_enabled: false,
          active_kb_id: kb,
          ...controls,
        });

        // Pulisci localStorage
        localStorage.removeItem('bar-mode-pending');
        localStorage.removeItem('bar-mode-kb-pending');
        localStorage.removeItem('bar-mode-controls-pending');
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

  const handleSubmit = async (e: React.FormEvent, overrideText?: string) => {
    e.preventDefault();
    
    // ✅ Usa overrideText se fornito (da trascrizione), altrimenti usa prompt
    const currentPrompt = overrideText || prompt.trim();
    if (!currentPrompt) return;

    setIsLoading(true);
    setPrompt(''); // ✅ Pulisci sempre textarea

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

        // Trasferisci impostazioni pending
        await transferPendingSettings(conversationId);
        await loadMessages(conversationId);
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
          
          // Determina quale orchestratore usare in base alla modalità
          const orchestratorName = isBarMode
            ? 'bar-chat-orchestrator'        // Modalità Bar Chat vocale (1 agente per turno)
            : 'chat-laboratory-orchestrator'; // Modalità testuale normale (tutti gli agenti)

          console.log(`🎯 Usando orchestratore: ${orchestratorName}`);
          
          const { data, error } = await supabase.functions.invoke(orchestratorName, {
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
          
          // Se c'è un audio URL, mostra notifica
          if (data?.audioUrl) {
            console.log('🎵 Audio disponibile:', data.audioUrl);
            toast({
              title: "🎤 Risposta vocale disponibile",
              description: `${data.speaker || 'Agente'} ha risposto con audio`,
            });
          } else if (isBarMode) {
            console.log('⚠️ Nessun audio generato per modalità Bar');
          }
          
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

  const generateConversationTitle = async (conversationId: string) => {
    try {
      // Prendi primi 5 messaggi
      const { data: messagesData } = await supabase
        .from('chat_laboratory_messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(5);
      
      if (!messagesData || messagesData.length === 0) return;
      
      // Verifica se ha già un titolo personalizzato
      const { data: conv } = await supabase
        .from('chat_laboratory_conversations')
        .select('titolo')
        .eq('id', conversationId)
        .single();
      
      // Se ha già titolo non auto-generato, non sovrascrivere
      if (conv?.titolo && !conv.titolo.includes('Discussione Multi-Agente')) {
        return;
      }
      
      const conversationStart = messagesData.map(m => m.content).join('\n\n');
      
      const { data, error } = await supabase.functions.invoke(
        'generate-conversation-summary',
        { 
          body: { 
            conversationId, 
            type: 'title_and_summary',
            conversationText: conversationStart
          } 
        }
      );
      
      if (error) {
        console.error('Errore generazione titolo:', error);
        return;
      }
      
      if (data?.title && data?.summary) {
        await supabase
          .from('chat_laboratory_conversations')
          .update({
            titolo: data.title,
            riassunto_contesto: data.summary,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
        
        loadConversations();
      }
      
    } catch (error) {
      console.error('Error generating title:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    // Se stavo in una conversazione con >5 messaggi, genera titolo
    if (currentConversationId && messages.length >= 5) {
      generateConversationTitle(currentConversationId);
    }
    
    setCurrentConversationId(id);
    loadMessages(id);
    setSidebarOpen(false);
    
    // Focus textarea dopo un breve delay
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleGenerateSummary = async (conversationId: string) => {
    try {
      toast({
        title: "Generazione riassunto...",
        description: "Sto analizzando la conversazione"
      });
      
      const { data, error } = await supabase.functions.invoke(
        'generate-conversation-summary',
        { body: { conversationId, type: 'summary' } }
      );
      
      if (error) throw error;
      
      await loadConversations();
      
      toast({
        title: "✅ Riassunto generato",
        description: data.summary
      });
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare il riassunto",
        variant: "destructive"
      });
    }
  };

  const handleGenerateFullReport = async (conversationId: string) => {
    try {
      toast({
        title: "Generazione report...",
        description: "Sto creando il documento completo"
      });
      
      const { data, error } = await supabase.functions.invoke(
        'generate-conversation-summary',
        { body: { conversationId, type: 'full_report' } }
      );
      
      if (error) throw error;
      
      // Download come file
      const blob = new Blob([data.report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${conversationId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "✅ Report generato",
        description: "Il documento è stato scaricato"
      });
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare il report",
        variant: "destructive"
      });
    }
  };

  const handleNewConversation = () => {
    createNewConversation();
    if (isMobile) setSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await supabase.from('chat_laboratory_messages').delete().eq('conversation_id', id);
      await supabase.from('chat_laboratory_participants').delete().eq('conversation_id', id);
      await supabase.from('chat_laboratory_bar_mode').delete().eq('conversation_id', id);
      
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }

      loadConversations();

      toast({
        title: "Conversazione eliminata",
        description: "La conversazione è stata eliminata con successo.",
      });
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la conversazione.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ titolo: title })
        .eq('id', id);

      if (error) throw error;

      loadConversations();

      toast({
        title: "Titolo aggiornato",
        description: "Il titolo è stato modificato con successo.",
      });
    } catch (error) {
      console.error('Errore aggiornamento titolo:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il titolo.",
        variant: "destructive",
      });
    }
  };

  // Calcola se la modalità full screen è abilitabile
  const canEnableFullScreen = isBarMode && (audioMode === 'continuous' || audioMode === 'full-duplex');

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-900/20 via-background to-violet-900/20">
    {/* Sidebar Conversazioni - Card Style Overlay */}
    {!isFullScreenMode && sidebarOpen && (
      <>
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed left-4 top-4 bottom-4 w-80 z-50 bg-card/95 backdrop-blur border border-border/40 rounded-lg shadow-lg">
          <ConversationsSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onUpdateTitle={handleUpdateTitle}
            onGenerateSummary={handleGenerateSummary}
            onGenerateFullReport={handleGenerateFullReport}
          />
        </div>
      </>
    )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border/40">
          <div className="container mx-auto px-3 py-1.5 md:py-2">
            <div className="flex items-center justify-between gap-2">
              {/* Left side - Navigation buttons and title */}
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => navigate('/chat')}
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    title="Conversazioni"
                  >
                    <Layout className="h-4 w-4" />
                  </Button>
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

              {/* Right side - Maximize and Settings */}
              <div className="flex items-center gap-1">
                {/* Maximize Button - sempre visibile */}
                <MessageNavigationBar
                  currentIndex={0}
                  totalMessages={0}
                  onPrevious={() => {}}
                  onNext={() => {}}
                  canEnableFullScreen={true}
                  isFullScreenMode={isFullScreenMode}
                  onToggleFullScreen={() => setIsFullScreenMode(!isFullScreenMode)}
                />
                
                {/* Settings Icon */}
                <Button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  title="Impostazioni"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Settings Drawer */}
      {settingsOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={() => setSettingsOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-black/90 border-l border-white/10 z-[101] overflow-y-auto animate-slide-in-right">
            <div className="p-6 space-y-6">
              {/* Header Drawer */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">⚙️ Impostazioni</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSettingsOpen(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Sezioni */}
              <div className="space-y-4">
                {/* Vista */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Vista</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 text-sm">Modalità visualizzazione</span>
                      <Button
                        onClick={() => setViewMode(viewMode === 'classic' ? 'tabs' : 'classic')}
                        variant="outline"
                        size="sm"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        {viewMode === 'classic' ? '📑 Tabs' : '💬 Classica'}
                      </Button>
                    </div>
                    {currentConversationId && (
                      <ExportSummaryButton
                        labConversationId={currentConversationId}
                        variant="laboratory"
                      />
                    )}
                  </CardContent>
                </Card>
                
                {/* Partecipanti & Prompts */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">AI & Prompts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <LaboratoryPromptManager />
                    <ParticipantSelector
                      participants={participants}
                      onToggle={toggleParticipant}
                    />
                  </CardContent>
                </Card>
                
                {/* Bar Mode */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Bar Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CollapsibleBarSection
                      conversationId={currentConversationId}
                      isBarMode={isBarMode}
                      onBarModeToggle={setIsBarMode}
                      onKBChange={setActiveKnowledgeBase}
                    />
                  </CardContent>
                </Card>
                
                {/* Stats */}
                {currentConversationId && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Statistiche</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <TokenCounterBadge
                        labConversationId={currentConversationId}
                        variant="laboratory"
                        alertThreshold={15000}
                      />
                      <ConversationCostBadge labConversationId={currentConversationId} />
                    </CardContent>
                  </Card>
                )}
                
                {/* Ottimizzazione Token */}
                {currentConversationId && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Ottimizzazione Token</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EconomyModeToggle 
                        conversationId={currentConversationId}
                        onSettingsChange={(settings) => {
                          console.log('Economy settings updated:', settings);
                        }}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Messaggi */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'classic' ? (
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto p-1.5 md:p-2 space-y-1.5 md:space-y-2"
          >
            <div className="container mx-auto max-w-full">
              {/* Navigation bar per full screen quando in Bar Mode */}
              {isBarMode && messages.length > 0 && (
                <MessageNavigationBar
                  currentIndex={messages.length - 1}
                  totalMessages={messages.length}
                  onPrevious={() => {
                    const container = messagesContainerRef.current;
                    if (container) {
                      container.scrollTop = Math.max(0, container.scrollTop - 400);
                    }
                  }}
                  onNext={() => {
                    const container = messagesContainerRef.current;
                    if (container) {
                      container.scrollTop += 400;
                    }
                  }}
                  canEnableFullScreen={canEnableFullScreen}
                  isFullScreenMode={isFullScreenMode}
                  onToggleFullScreen={() => setIsFullScreenMode(!isFullScreenMode)}
                />
              )}
              
              {messages.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6 md:p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 mt-2">
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
                <MultiAgentMessage 
                  key={message.id} 
                  message={message}
                  onAIPlayStateChange={setIsAISpeaking}
                />
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

      {/* Input Area - nascosta in full screen */}
      {!isFullScreenMode && (
      <div className="border-t border-border/40 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30 p-1.5 md:p-2">
        <div className="container mx-auto max-w-[95vw] xl:max-w-[1600px] px-3">
          <form onSubmit={handleSubmit} className="space-y-1">
            {/* Textarea con icone a sinistra */}
            <div className="flex gap-2">
              {/* Icone verticali a sinistra */}
              <div className="flex flex-col gap-1">
                <FileUploader
                  onFilesUploaded={setUploadedFiles}
                />
                <ImageGenerator
                  onImageGenerated={setGeneratedImage}
                />
              </div>
              
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isMobile ? "Scrivi il messaggio..." : "Scrivi il tuo messaggio... Gli agenti AI risponderanno in sequenza"}
                className="min-h-[50px] md:min-h-[70px] resize-none text-sm md:text-base"
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

          {/* Bar Chat Audio Controls - Inline quando Bar Mode attivo */}
          {isBarMode && (
            <div className="mt-2">
              <BarChatAudioControls
                conversationId={currentConversationId}
                isAISpeaking={isAISpeaking}
                onTranscriptionComplete={async (text) => {
                  console.log('🎤 Trascrizione vocale ricevuta:', text);
                  
                  if (!text.trim()) {
                    console.warn('⚠️ Testo vuoto, invio annullato');
                    return;
                  }
                  
                  setIsLoading(true);
                  
                  try {
                    let conversationId = currentConversationId;
                    
                    // Crea conversazione se non esiste
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

                      await transferPendingSettings(conversationId);
                      await loadMessages(conversationId);
                    }

                    // Salva messaggio umano
                    const { error: insertError } = await supabase
                      .from('chat_laboratory_messages')
                      .insert([{
                        conversation_id: conversationId,
                        sender_type: 'user',
                        sender_name: 'Tu',
                        content: text,
                        is_visible_to_ai: true
                      }]);

                    if (insertError) throw insertError;
                    
                    console.log('✅ Messaggio vocale salvato nel DB');

                    // Ricarica messaggi SUBITO per mostrare il messaggio utente
                    await loadMessages(conversationId);
                    
                    toast({
                      title: "✓ Messaggio inviato",
                      description: "In attesa della risposta AI..."
                    });

                    // Chiama orchestratore
                    const activeAIParticipants = participants.filter(p => p.is_active && p.type !== 'human');
                    
                    const orchestratorName = isBarMode
                      ? 'bar-chat-orchestrator'
                      : 'chat-laboratory-orchestrator';

                    console.log(`🎯 Invoco ${orchestratorName}...`);
                    
                    const { data, error } = await supabase.functions.invoke(orchestratorName, {
                      body: { 
                        conversationId,
                        userMessage: text,
                        participants: activeAIParticipants
                      }
                    });

                    if (error) throw error;
                    
                    console.log('✅ Risposta AI ricevuta:', data);
                    
                    // Ricarica messaggi per mostrare la risposta AI
                    await loadMessages(conversationId);
                    
                    toast({
                      title: "✓ Risposta AI ricevuta",
                      description: "La conversazione è aggiornata"
                    });
                    
                  } catch (error) {
                    console.error('❌ Errore invio messaggio vocale:', error);
                    toast({
                      title: "Errore",
                      description: "Impossibile inviare il messaggio vocale",
                      variant: "destructive"
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                onInterrupt={async () => {
                  if (currentConversationId) {
                    await supabase
                      .from('chat_laboratory_bar_mode')
                      .update({ interrupt_requested: true })
                      .eq('conversation_id', currentConversationId);
                    
                    setIsAISpeaking(false);
                    toast({ title: "⛔ AI interrotta" });
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
      )}
      </div>
    </div>
  );
};

export default ChatLaboratory;
