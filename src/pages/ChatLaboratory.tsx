import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, User, Settings, Brain, Cpu, Sparkles, ArrowLeft, LayoutList, Layers, Menu, X, Layout, ChevronDown, Phone, Columns, MessagesSquare, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ParticipantSelector } from '@/components/chat-laboratory/ParticipantSelector';
import { MultiAgentMessage, StructuredAttachments } from '@/components/chat-laboratory/MultiAgentMessage';
import { LaboratoryPromptManager } from '@/components/chat-laboratory/LaboratoryPromptManager';
import { FileUploader, UploadedFile } from '@/components/chat/FileUploader';
import { ImageGenerator } from '@/components/chat/ImageGenerator';
import { VoiceRecorder, type VoiceRecorderRef } from '@/components/chat/VoiceRecorder';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageTabsView } from '@/components/chat-laboratory/MessageTabsView';
import { CollapsibleBarSection } from '@/components/chat-laboratory/CollapsibleBarSection';
import { ConversationsSidebar } from '@/components/chat-laboratory/ConversationsSidebar';
import { OnlineUsersList } from '@/components/chat-laboratory/OnlineUsersList';
import { LabHeaderControls } from '@/components/chat-laboratory/LabHeaderControls';
import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { ExportSummaryButton } from '@/components/chat/ExportSummaryButton';
import { SyncPricingButton } from '@/components/chat-laboratory/SyncPricingButton';
import { BarModeTabsControls } from '@/components/chat-laboratory/BarModeTabsControls';
import { InterruptButton } from '@/components/chat-laboratory/InterruptButton';
import { EconomyModeToggleCompact } from '@/components/chat-laboratory/EconomyModeToggleCompact';
import { EconomyModeToggle } from '@/components/chat-laboratory/EconomyModeToggle';
// import { BarChatSettings } from '@/components/chat-laboratory/BarChatSettings'; // 🗑️ Deprecato - funzionalità in BarModeControls
import { BarModeControls } from '@/components/chat-laboratory/BarModeControls';
import { MessageNavigationBar } from '@/components/chat-laboratory/MessageNavigationBar';
import { ConversationSummaryPanel } from '@/components/chat-laboratory/ConversationSummaryPanel';
import { LabMainControls } from '@/components/chat-laboratory/LabMainControls';
import { SummaryGenerationButton } from '@/components/chat-laboratory/SummaryGenerationButton';
import { Link } from 'react-router-dom';
import { useSummaryAutoGenerator } from '@/hooks/useSummaryAutoGenerator';
import { ConvergenceIndicator } from '@/components/chat-laboratory/ConvergenceIndicator';
import { IntentBadges } from '@/components/chat-laboratory/IntentBadges';
import { KnowledgeGraphViewer } from '@/components/chat-laboratory/KnowledgeGraphViewer';
import { TokenWarningBanner } from '@/components/chat-laboratory/TokenWarningBanner';
import { TokenUsageChart } from '@/components/chat-laboratory/TokenUsageChart';
import { BarModeToggle } from '@/components/chat-laboratory/BarModeToggle';
import { AudioModeSelector } from '@/components/chat-laboratory/AudioModeSelector';
import { CompactControlBar } from '@/components/chat-laboratory/CompactControlBar';
import { WordLimitSliderCompact } from '@/components/chat-laboratory/WordLimitSliderCompact';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  is_visible_to_ai: boolean;
  attachments?: UploadedFile[] | StructuredAttachments;
  images?: string[];
  generated_images?: string[];
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  intent_tags?: string[];
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
  summary_chunks?: any;
  last_summarized_at?: string | null;
  last_message_summarized?: number;
  economy_mode?: boolean;
}

const ChatLaboratory = () => {
  const [prompt, setPrompt] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'tabs'>('classic');
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'processing'>('idle');
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [isTokenLimitReached, setIsTokenLimitReached] = useState(false);
  
  // Sidebar States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Bar Mode States
  const [isBarMode, setIsBarMode] = useState(false);
  const [activeKnowledgeBase, setActiveKnowledgeBase] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [conversationMode, setConversationMode] = useState<'ptt' | 'continuous'>('ptt');
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(true);
  const [globalMaxWords, setGlobalMaxWords] = useState(60); // ✅ NUOVO: Limite parole globale

  // Forza vista tabs quando Bar Mode è attivo
  useEffect(() => {
    if (isBarMode) {
      setViewMode('tabs');
    }
  }, [isBarMode]);
  
  // Settings Drawer State
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Full Screen Mode State
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [audioMode, setAudioMode] = useState<'stable' | 'v2_hybrid'>(() => {
    const stored = localStorage.getItem('global-audio-mode');
    return (stored as 'stable' | 'v2_hybrid') || 'stable';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('global-audio-mode');
      if (stored) {
        setAudioMode(stored as 'stable' | 'v2_hybrid');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check immediato al mount
    const stored = localStorage.getItem('global-audio-mode');
    if (stored) {
      setAudioMode(stored as 'stable' | 'v2_hybrid');
    }
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // ✅ Lock orchestrator per evitare chiamate parallele
  const isOrchestratorRunning = useRef(false);
  
  // ⚡ NUOVO: Ref per tracking placeholder message ID
  const lastPlaceholderMessageIdRef = useRef<string | null>(null);
  
  // Summary States
  const [conversationData, setConversationData] = useState<Conversation | null>(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [convergenceRefreshKey, setConvergenceRefreshKey] = useState(0);
  
  const SUBMIT_TIMEOUT = 300000; // 300 secondi (5 minuti)
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorderRef>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousMessagesLengthRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // ⚠️ Safety timeout per prevenire lock permanenti (ma non durante riproduzione audio)
  useEffect(() => {
    if (isSubmitting && !isAISpeaking) {
      const timer = setTimeout(() => {
        console.warn('⚠️ Timeout submit forzato dopo 5 minuti');
        setIsSubmitting(false);
        setIsLoading(false);
        toast({
          title: "Timeout",
          description: "L'operazione ha impiegato troppo tempo.",
          variant: "destructive",
        });
      }, SUBMIT_TIMEOUT);
      
      return () => clearTimeout(timer);
    }
  }, [isSubmitting, isAISpeaking, toast, SUBMIT_TIMEOUT]);

  // Auto-summary hook
  useSummaryAutoGenerator({
    conversationId: currentConversationId,
    messageCount: messages.length,
    lastMessageSummarized: conversationData?.last_message_summarized || 0,
    economyMode: conversationData?.economy_mode || false,
    onSummaryGenerated: () => {
      setSummaryRefreshKey(prev => prev + 1);
      if (currentConversationId) {
        loadMessages(currentConversationId);
      }
    }
  });

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
    const initialize = async () => {
      initializeParticipants();
      await loadConversations();
      
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }

      // Auto-crea nuova conversazione se non esiste
      if (!currentConversationId) {
        console.log('🆕 Nessuna conversazione attiva - creazione automatica...');
        await createNewConversation();
      }
    };
    
    initialize();
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
          async (payload) => {
            console.log('🔔 Real-time update ricevuto:', payload);
            const newMessage = payload.new as any;
            
            // 🚫 Ignora messaggi di altre conversazioni
            if (newMessage.conversation_id !== currentConversationId) {
              console.log('🚫 Messaggio ignorato: appartiene a conversazione diversa');
              return;
            }
            
            // ✅ Auto-play audio se presente e Bar Mode attivo
            if (newMessage.audio_url && isBarMode && newMessage.sender_type === 'ai') {
              console.log('🔊 Auto-playing audio:', newMessage.audio_url);
              try {
                await playAudio(newMessage.audio_url);
              } catch (err) {
                console.warn('⚠️ Audio autoplay bloccato dal browser:', err);
              }
            }
            
            // ✅ Sprint 1 P0: Progressive streaming rendering
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedMessage = payload.new as any;
              
              // Update message in state immediately for streaming effect
              setMessages(prev => prev.map(msg => 
                msg.id === updatedMessage.id 
                  ? { ...msg, ...updatedMessage }
                  : msg
              ));
              
              // If message is still streaming, don't reload all messages
              if (updatedMessage.is_streaming) {
                console.log('📝 Streaming in corso, aggiornamento progressivo...');
                return;
              }
            }
            
            // For other events or completed streaming, reload all messages
            await loadMessages(currentConversationId);
            
            // ✅ Auto-play audio se presente
            if (payload.eventType === 'INSERT' && payload.new) {
              const newMessage = payload.new as any;
              if (newMessage.audio_url && newMessage.sender_type !== 'human') {
                console.log('🔊 Auto-play audio:', newMessage.audio_url);
                playAudio(newMessage.audio_url);
              }
            }
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

      console.log('🎯 STATO BAR MODE:', {
        isBarMode,
        barModeConfig: data,
        mode: data?.mode
      });

      if (data) {
        setIsBarMode(data.mode === 'bar');
        setActiveKnowledgeBase(data.active_kb_id);
      }

      // ✅ NUOVO: Carica max_words dal primo voice agent attivo
      const { data: voiceAgent } = await supabase
        .from('elevenlabs_agents')
        .select('max_words_per_response')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (voiceAgent?.max_words_per_response) {
        setGlobalMaxWords(voiceAgent.max_words_per_response);
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni Bar Mode:', error);
    }
  };

  const initializeParticipants = async () => {
    try {
      // ✅ Carica agenti disponibili dal DB
      const { data, error } = await supabase
        .from('elevenlabs_agents')
        .select('id, name, is_active, elevenlabs_agent_id')
        .eq('is_active', true) // ✅ Solo agenti disponibili nel sistema
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error('❌ Errore caricamento agents:', error);
        // Fallback a default se errore
        const defaultParticipants: Participant[] = [
          { id: 'human-1', type: 'human', name: 'Tu', is_active: true },
          { id: 'chatgpt-1', type: 'chatgpt', name: 'ChatGPT', is_active: true, system_prompt: '' },
          { id: 'gemini-1', type: 'gemini', name: 'Gemini', is_active: true, system_prompt: '' },
          { id: 'claude-1', type: 'claude', name: 'Claude', is_active: true, system_prompt: '' },
        ];
        setParticipants(defaultParticipants);
        return;
      }
      
      // Map agents to participants
      const aiParticipants: Participant[] = (data || []).map(agent => {
        let type: 'chatgpt' | 'gemini' | 'claude' = 'gemini';
        const nameLower = agent.name.toLowerCase();
        
        if (nameLower.includes('chatgpt') || nameLower.includes('gpt')) {
          type = 'chatgpt';
        } else if (nameLower.includes('claude') || nameLower.includes('anthropic')) {
          type = 'claude';
        } else if (nameLower.includes('gemini')) {
          type = 'gemini';
        }
        
        return {
          id: agent.elevenlabs_agent_id || agent.id,
          type,
          name: agent.name, // ✅ FIX: usa nome completo dal DB
          is_active: true, // ✅ Attivi in conversazione di default
          system_prompt: ''
        };
      });
      
      // Aggiungi sempre l'utente umano
      const allParticipants: Participant[] = [
        { id: 'human-1', type: 'human', name: 'Tu', is_active: true },
        ...aiParticipants
      ];
      
      console.log('✅ Participants caricati in ChatLaboratory:', allParticipants);
      setParticipants(allParticipants);
    } catch (err) {
      console.error('❌ Errore in initializeParticipants:', err);
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .select('id, titolo, created_at, updated_at, riassunto_contesto, active_participants, summary_chunks, last_summarized_at, last_message_summarized, economy_mode')
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
      .select('*, intent_tags')
      .eq('conversation_id', conversationId)
      .order('message_sequence', { ascending: true })
      .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messages = (data || []).map(msg => ({
        ...msg,
        images: Array.isArray(msg.images) ? msg.images as string[] : [],
        attachments: Array.isArray(msg.attachments) 
          ? msg.attachments as unknown as UploadedFile[] 
          : (msg.attachments || {}),
        generated_images: Array.isArray(msg.generated_images) ? msg.generated_images as string[] : []
      })) as Message[];
      
      setMessages(messages);

      // Load conversation data for summary
      const { data: convData } = await supabase
        .from('chat_laboratory_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (convData) {
        setConversationData({
          ...convData,
          active_participants: Array.isArray(convData.active_participants) 
            ? convData.active_participants as Array<{name: string, type: string}>
            : []
        } as Conversation);
      }
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
          active_participants: participants.filter(p => p.is_active).map(p => ({ type: p.type, name: p.name })),
          riassunto_contesto: null, // ✅ FIX 4: Esplicitamente NULL per nuove conversazioni
          last_message_summarized: 0,
          last_summarized_at: null, // ✅ FIX 4: Timestamp nullo
          summary_chunks: [], // ✅ FIX 4: Array vuoto per chunks
          economy_mode: true,
          token_count_current: 0, // ✅ FIX 4: Reset token contatore
          token_count_total: 0 // ✅ FIX 4: Reset token totale
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
            active_kb_id: null,
            kb_navigation_history: [],
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
      // toast({
      //   title: "Errore",
      //   description: "Impossibile creare la conversazione.",
      //   variant: "destructive",
      // });
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

        // ✅ CRITICAL FIX: Se voice_enabled è true, forza mode: 'bar'
        // Questo previene l'errore "Questa funzione è dedicata alla modalità Bar Chat"
        const finalMode = mode === 'bar' ? 'bar' : 'laboratory';
        const voiceEnabled = mode === 'bar';
        
        console.log('🔧 [transferPendingSettings] Mode setup:', { 
          rawMode: mode, 
          finalMode, 
          voiceEnabled 
        });

        await supabase.from('chat_laboratory_bar_mode').insert({
          conversation_id: conversationId,
          user_id: user.id,
          mode: finalMode,
          voice_enabled: voiceEnabled,
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
      // toast({
      //   title: "Errore",
      //   description: "Impossibile creare la conversazione.",
      //   variant: "destructive",
      // });
    }
  };

  const handleSubmit = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    
    if (isTokenLimitReached) {
      toast({
        title: "⛔ Limite Token Raggiunto",
        description: `Hai raggiunto il limite di 100.000 token per questa conversazione (${totalTokensUsed.toLocaleString()} token usati). Crea una nuova conversazione per continuare.`,
        variant: "destructive",
        duration: 6000,
      });
      return;
    }
    
    // ✅ Previeni invii multipli concorrenti
    if (isSubmitting) {
      console.log('⏸️ Submit già in corso, ignoro richiesta duplicata');
      return;
    }
    
    // ⚡ FIX #2: Rilevamento PRIMA di qualsiasi altra operazione
    const textToSave = overrideText || prompt.trim();
    const isPlaceholder = textToSave === '🎤 Trascrizione in corso...';
    const isUpdate = textToSave.includes('|||UPDATE|||');
    const cleanText = isUpdate ? textToSave.replace('|||UPDATE|||', '').trim() : textToSave;
    
    console.log('🔍 [ChatLaboratory] handleSubmit chiamato:', { 
      isPlaceholder, 
      isUpdate, 
      textToSave: cleanText.substring(0, 50) 
    });
    
    if (!cleanText) return;

    // ⚡ STEP 1: Se è update, esegui subito e ESCI
    if (isUpdate && lastPlaceholderMessageIdRef.current) {
      try {
        console.log('✅ [ChatLaboratory] UPDATE - Aggiorno messaggio esistente:', lastPlaceholderMessageIdRef.current);
        
        await supabase
          .from('chat_laboratory_messages')
          .update({ content: cleanText })
          .eq('id', lastPlaceholderMessageIdRef.current);

        lastPlaceholderMessageIdRef.current = null;
        await loadMessages(currentConversationId!);
        
        console.log('✅ [ChatLaboratory] Messaggio aggiornato con trascrizione reale');
      } catch (error) {
        console.error('❌ Errore aggiornamento messaggio:', error);
      }
      return; // ⚡ ESCI SUBITO - non eseguire il resto
    }

    // ⚡ STEP 2: Se è placeholder, inserisci e ESCI (senza far partire orchestrator)
    if (isPlaceholder) {
      try {
        console.log('⚡ [ChatLaboratory] PLACEHOLDER - Inserisco messaggio temporaneo');
        
        // Crea conversazione se necessario
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

          // ✅ Se Bar Mode attivo, abilita audio automaticamente
          const { data: { user } } = await supabase.auth.getUser();
          if (isBarMode && user) {
            await supabase
              .from('chat_laboratory_bar_mode')
              .upsert({
                conversation_id: conversationId,
                mode: 'bar',
                voice_enabled: true,
                user_id: user.id,
                updated_at: new Date().toISOString()
              }, { onConflict: 'conversation_id' });
          }

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
        }

        const { data: maxSeq } = await supabase
          .from('chat_laboratory_messages')
          .select('message_sequence')
          .eq('conversation_id', conversationId)
          .order('message_sequence', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextSequence = (maxSeq?.message_sequence || 0) + 1;

        const { data: savedMessage } = await supabase
          .from('chat_laboratory_messages')
          .insert([{
            conversation_id: conversationId,
            message_sequence: nextSequence,
            intent_tags: [],
            sender_type: 'human',
            sender_name: 'Tu',
            content: cleanText,
            is_visible_to_ai: true,
          }])
          .select()
          .single();

        if (savedMessage) {
          lastPlaceholderMessageIdRef.current = savedMessage.id;
          console.log('⚡ [ChatLaboratory] Placeholder salvato, ID:', savedMessage.id);
          
          // ⚡ Ottimistic update
          setMessages(prev => [...prev, savedMessage as unknown as Message]);
          
          await loadMessages(conversationId);
        }

        return; // ⚡ ESCI SUBITO - l'update arriverà tra poco
      } catch (error) {
        console.error('❌ Errore inserimento placeholder:', error);
        return;
      }
    }

    // ⚡ STEP 3: Messaggio normale - continua con la logica esistente
    setIsLoading(true);
    setIsSubmitting(true);
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

        // ✅ Se Bar Mode attivo, abilita audio automaticamente
        const { data: { user } } = await supabase.auth.getUser();
        if (isBarMode && user) {
          await supabase
            .from('chat_laboratory_bar_mode')
            .upsert({
              conversation_id: conversationId,
              mode: 'bar',
              voice_enabled: true,
              user_id: user.id,
              updated_at: new Date().toISOString()
            }, { onConflict: 'conversation_id' });
        }

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

      // Get next sequence number
      const { data: maxSeq } = await supabase
        .from('chat_laboratory_messages')
        .select('message_sequence')
        .eq('conversation_id', conversationId)
        .order('message_sequence', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSequence = (maxSeq?.message_sequence || 0) + 1;

      // Salva messaggio umano
      const { data: savedUserMessage, error: insertError } = await supabase
        .from('chat_laboratory_messages')
        .insert([{
          conversation_id: conversationId,
          message_sequence: nextSequence,
          intent_tags: [],
          sender_type: 'human',
          sender_name: 'Tu',
          content: cleanText,
          is_visible_to_ai: true,
          attachments: uploadedFiles as any,
          images: uploadedFiles.filter(f => f.isImage).map(f => f.url) as any,
          generated_images: generatedImage ? [generatedImage] as any : []
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // ⚡ FIX #1: OTTIMISTIC UPDATE - Aggiungi immediatamente il messaggio allo state React
      if (savedUserMessage) {
        console.log('⚡ [FIX #1] Ottimistic update: aggiungo messaggio HUMAN allo state locale');
        setMessages(prev => [...prev, savedUserMessage as unknown as Message]);
        
        await loadMessages(conversationId);
        
        // ✅ Forza apertura tab se in modalità tabs
        if (viewMode === 'tabs') {
          console.log('✅ Attivazione immediata tab dopo invio messaggio user (FIX #1 applicato)');
        }
      }

      setUploadedFiles([]);
      setGeneratedImage(null);

      // ✅ FASE 1: Single Invocation per Bar Mode
      const activeAIParticipants = participants.filter(p => p.is_active && p.type !== 'human');
      
      console.log('🔍 DEBUG PRE-INVOCAZIONE:', {
        isBarMode,
        conversationId,
        activeAIParticipants: activeAIParticipants.length,
        currentPrompt,
        hasSupabase: !!supabase,
        participantsDetails: activeAIParticipants.map(p => ({ type: p.type, name: p.name }))
      });
      
      if (isBarMode) {
        // 🍹 BAR MODE: sempre modalità sequenziale (1 agente alla volta con contesto completo)
        console.log('🎯 Bar Mode - Modalità Sequenziale');
        
        // 🎯 Determina quale agente deve rispondere (round-robin)
        const lastAIMessage = messages?.find(m => m.sender_type !== 'human');
        const lastSpeaker = lastAIMessage?.sender_type;
        
        let targetParticipantType = null;
        let actualResponseMode = 'auto';
        
        if (activeAIParticipants.length === 1) {
          // Un solo agente: usa 'single'
          actualResponseMode = 'single';
          targetParticipantType = activeAIParticipants[0].type;
        } else if (activeAIParticipants.length > 1) {
          // Multi-agente: round-robin
          const currentIndex = activeAIParticipants.findIndex(p => p.type === lastSpeaker);
          const nextIndex = (currentIndex + 1) % activeAIParticipants.length;
          targetParticipantType = activeAIParticipants[nextIndex].type;
          actualResponseMode = 'single'; // ✅ Un agente alla volta
        }
        
        console.log('📤 Turno calcolato:', { actualResponseMode, targetParticipantType, lastSpeaker });
        
        abortControllerRef.current = new AbortController();
        
        const { data, error } = await supabase.functions.invoke('bar-chat-orchestrator', {
          body: { 
            conversationId,
            userMessage: currentPrompt,
            participants: activeAIParticipants,
            response_mode: actualResponseMode,
            targetParticipantType: targetParticipantType
          }
        });

        
        console.log('📥 Risposta da bar-chat-orchestrator:', { data, error });
        
        if (error) {
          // 🆕 Gestione specifica per pausa
          if (error.context?.status === 423) {
            return; // Non mostrare errore generico
          }
          
          console.error('❌ ERRORE Bar Mode:', JSON.stringify(error, null, 2));
          toast({
            title: '❌ Errore Bar Mode',
            description: error.message || 'Errore durante l\'invocazione dell\'orchestrator',
            variant: 'destructive',
          });
        } else {
          console.log('✅ Risposta completata:', data);
          
          if (data?.audioGenerating && data?.messageId) {
            console.log('🔊 Triggering async audio generation');
            await triggerAudioGeneration(data.messageId);
          }
        }
      } else {
        // ✅ MODALITÀ TESTUALE: SEMPRE sequenziale (1 agente alla volta con contesto completo)
        console.log(`🔄 SEQUENTIAL MODE: ${activeAIParticipants.length} agenti con contesto progressivo`);
        
        const pauseMs = 800; // TODO: Load from conversation settings
        let successCount = 0;
        
        for (let i = 0; i < activeAIParticipants.length; i++) {
          const participant = activeAIParticipants[i];
          console.log(`⏳ [${i + 1}/${activeAIParticipants.length}] Chiamata ${participant.name}...`);
          
          abortControllerRef.current = new AbortController();
          
          const { data, error } = await supabase.functions.invoke('chat-laboratory-orchestrator', {
            body: { 
              conversationId,
              userMessage: currentPrompt,
              participants: [participant], // ✅ Solo questo AI - vede tutte le risposte precedenti
              sequentialMode: true
            }
          });

          if (error) {
            console.error(`❌ Errore ${participant.name}:`, error);
          } else {
            successCount++;
            console.log(`✅ ${participant.name} completato (${data.responses?.[0]?.tokenOutput || 0} token)`);
          }

          // Pausa tra chiamate (tranne l'ultima)
          if (i < activeAIParticipants.length - 1) {
            await new Promise(resolve => setTimeout(resolve, pauseMs));
          }
        }

        console.log(`🎯 Sequential orchestration completata: ${successCount}/${activeAIParticipants.length} successi`);
        setConvergenceRefreshKey(prev => prev + 1);
      }

      console.log('🎉 Completato!');

    } catch (error) {
      console.error('Errore invio messaggio:', error);
      // toast({
      //   title: "Errore",
      //   description: "Impossibile inviare il messaggio. Riprova.",
      //   variant: "destructive",
      // });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, is_active: !p.is_active } : p
    ));
  };

  // ✅ Opzione D: Trigger async audio generation con retry logic
  const triggerAudioGeneration = async (messageId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [0, 2000, 4000]; // 0s, 2s, 4s

    try {
      console.log(`🎵 [Tentativo ${retryCount + 1}/${MAX_RETRIES}] Generazione audio per messageId:`, messageId);
      
      const { data, error } = await supabase.functions.invoke('generate-audio', {
        body: { messageId }
      });

      if (error) {
        console.error('❌ Errore generate-audio:', error);
        
        // Retry se retryable e non superato max tentativi
        if (data?.retryable && retryCount < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[retryCount + 1];
          console.log(`⏳ Retry in ${delay}ms...`);
          setTimeout(() => {
            triggerAudioGeneration(messageId, retryCount + 1);
          }, delay);
        } else {
          console.warn('⚠️ Generazione audio fallita definitivamente, continuo senza audio');
        }
        return;
      }

      if (data?.success) {
        console.log('✅ Audio generato con successo:', data.audioUrl);
      }
    } catch (err) {
      console.error('❌ Errore chiamata generate-audio:', err);
      // Non blocca l'UI, solo log
    }
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
      // toast({
      //   title: "Generazione riassunto...",
      //   description: "Sto analizzando la conversazione"
      // });
      
      const { data, error } = await supabase.functions.invoke(
        'generate-conversation-summary',
        { body: { conversationId, type: 'summary' } }
      );
      
      if (error) throw error;
      
      await loadConversations();
      
      // toast({
      //   title: "✅ Riassunto generato",
      //   description: data.summary
      // });
    } catch (error) {
      console.error('Errore:', error);
      // toast({
      //   title: "Errore",
      //   description: "Impossibile generare il riassunto",
      //   variant: "destructive"
      // });
    }
  };

  const handleGenerateFullReport = async (conversationId: string) => {
    try {
      // toast({
      //   title: "Generazione report...",
      //   description: "Sto creando il documento completo"
      // });
      
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
      
      // toast({
      //   title: "✅ Report generato",
      //   description: "Il documento è stato scaricato"
      // });
    } catch (error) {
      console.error('Errore:', error);
      // toast({
      //   title: "Errore",
      //   description: "Impossibile generare il report",
      //   variant: "destructive"
      // });
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.onplay = () => setIsAISpeaking(true);
    audio.onended = () => setIsAISpeaking(false);
    audio.onerror = () => {
      console.error('❌ Errore riproduzione audio');
      setIsAISpeaking(false);
    };
    audio.play().catch(err => console.error('❌ Play failed:', err));
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

      // toast({
      //   title: "Conversazione eliminata",
      //   description: "La conversazione è stata eliminata con successo.",
      // });
    } catch (error) {
      console.error('Errore eliminazione:', error);
      // toast({
      //   title: "Errore",
      //   description: "Impossibile eliminare la conversazione.",
      //   variant: "destructive",
      // });
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

      // toast({
      //   title: "Titolo aggiornato",
      //   description: "Il titolo è stato modificato con successo.",
      // });
    } catch (error) {
      console.error('Errore aggiornamento titolo:', error);
      // toast({
      //   title: "Errore",
      //   description: "Impossibile aggiornare il titolo.",
      //   variant: "destructive",
      // });
    }
  };

  // Calcola se la modalità full screen è abilitabile
  const canEnableFullScreen = isBarMode && audioMode === 'v2_hybrid';

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-900/20 via-background to-violet-900/20 p-0 m-0">
    {/* Sidebar Conversazioni - UNIFORMATO */}
    <ConversationsSidebar
      isOpen={sidebarOpen && !isFullScreenMode}
      conversations={conversations}
      currentConversationId={currentConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
      onUpdateTitle={handleUpdateTitle}
      onGenerateSummary={handleGenerateSummary}
      onGenerateFullReport={handleGenerateFullReport}
      onCloseSidebar={() => setSidebarOpen(false)}
      onFocusTextarea={() => textareaRef.current?.focus()}
    />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full pt-0 mt-0">
        {/* Header */}
        <div className="border-b border-border/40 shrink-0">
          <div className="container mx-auto px-3 pt-0">
            {/* Title above - separated */}
            <div className="pt-0 pb-0">
              <h1 className="text-sm md:text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                ChatLab
              </h1>
            </div>
            
            {/* Icons row below */}
            <div className="py-0 md:py-0.5 flex items-center justify-between gap-2">
              {/* Left side - Navigation button and Export */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  title="Conversazioni"
                >
                  <Layout className="h-4 w-4" />
                </Button>
                
                {currentConversationId && (
                  <ExportSummaryButton
                    labConversationId={currentConversationId}
                    variant="laboratory"
                    iconOnly
                  />
                )}
              </div>

              {/* Center - empty space */}
              <div className="flex items-center gap-1"></div>

              {/* Right side - Participant, View Mode, Maximize and Settings */}
              <div className="flex items-center gap-1">
                <ParticipantSelector
                  participants={participants}
                  onToggle={toggleParticipant}
                />
                
                <Button
                  onClick={() => setViewMode(viewMode === 'classic' ? 'tabs' : 'classic')}
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  title={viewMode === 'classic' ? 'Vista Tabs' : 'Vista Classica'}
                >
                  {viewMode === 'classic' ? <Columns className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />}
                </Button>
                
                
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

                {/* Calibration Icon */}
                <Button
                  onClick={() => navigate('/chat-laboratory/calibration')}
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  title="AI Calibration"
                >
                  <Settings2 className="h-5 w-5" />
                </Button>

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
                {/* Ottimizzazione Token - PRIMA (sempre visibile) */}
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
                
                {/* Bar Mode - SECONDA */}
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
                      onTranscriptionComplete={(text) => {
                        if (text.trim()) {
                          handleSubmit({ preventDefault: () => {} } as any, text);
                        }
                      }}
                      isAISpeaking={isAISpeaking}
                      audioMode={audioMode}
                      onAudioModeChange={(mode) => {
                        console.log('📥 ChatLaboratory: Received audioMode change:', mode);
                        setAudioMode(mode);
                        console.log('✅ ChatLaboratory: audioMode state updated to:', mode);
                      }}
                    />
                  </CardContent>
                </Card>
                {/* Stats - QUARTA (in fondo, con placeholder se no conversazione) */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Statistiche</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentConversationId ? (
                      <>
                        <TokenCounterBadge
                          labConversationId={currentConversationId}
                          variant="laboratory"
                          alertThreshold={15000}
                        />
                        <ConversationCostBadge labConversationId={currentConversationId} />
                        <SyncPricingButton />
                      </>
                    ) : (
                      <p className="text-white/50 text-sm text-center py-4">
                        Avvia una conversazione per vedere le statistiche
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Utenti Online */}
                {currentConversationId && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Utenti Online</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <OnlineUsersList
                        conversationId={currentConversationId}
                        currentUserId={currentUserId}
                        onCallUser={(userId) => navigate(`/call-room?userId=${userId}&roomId=${currentConversationId}`)}
                      />
                    </CardContent>
                  </Card>
                )}
                
                {/* Link Impostazioni Globali */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Impostazioni Memoria Globali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-white/60 mb-3">
                      Gestisci i controlli di memoria per tutte le chat dalla sezione Impostazioni.
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
            className="h-full overflow-y-auto p-1 md:p-1.5 space-y-1 md:space-y-1.5"
          >
            <div className="container mx-auto max-w-5xl">
              {/* Summary Panel */}
              {conversationData && conversationData.riassunto_contesto && (
                <ConversationSummaryPanel
                  finalSummary={conversationData.riassunto_contesto}
                  chunks={Array.isArray(conversationData.summary_chunks) ? conversationData.summary_chunks : []}
                  lastSummarizedAt={conversationData.last_summarized_at || null}
                  totalMessages={messages.length}
                  lastMessageSummarized={conversationData.last_message_summarized || 0}
                />
              )}

              {/* Summary Generation Button */}
              {currentConversationId && messages.length >= 5 && (
                <div className="mb-4 flex justify-end">
                  <SummaryGenerationButton
                    conversationId={currentConversationId}
                    onSummaryGenerated={() => {
                      setSummaryRefreshKey(prev => prev + 1);
                      loadMessages(currentConversationId);
                    }}
                  />
                </div>
              )}

              {/* Token Warning Banner */}
              {currentConversationId && (
                <TokenWarningBanner conversationId={currentConversationId} />
              )}

              {/* Token Usage Chart Miniatura - Centrato sopra la sezione */}
              {currentConversationId && messages.length > 0 && (
                <div className="flex justify-center">
                  <div style={{ transform: 'scale(0.6)', transformOrigin: 'top center' }}>
                    <TokenUsageChart 
                      conversationId={currentConversationId}
                      compact
                      onTotalTokensChange={setTotalTokensUsed}
                    />
                  </div>
                  {totalTokensUsed > 50000 && (
                    <div className={`ml-2 px-2 py-1 rounded-full text-xs font-bold self-start ${
                      totalTokensUsed >= 100000 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-yellow-500 text-black'
                    }`}>
                      {totalTokensUsed >= 100000 ? '⛔ BLOCCATO' : '⚠️ ' + Math.round((totalTokensUsed / 100000) * 100) + '%'}
                    </div>
                  )}
                </div>
              )}

              {/* Convergence Indicator */}
              {currentConversationId && messages.length >= 10 && (
                <div className="mb-4">
                  <ConvergenceIndicator 
                    conversationId={currentConversationId}
                    refreshTrigger={convergenceRefreshKey}
                  />
                </div>
              )}

              {/* Knowledge Graph Viewer */}
              {currentConversationId && messages.length >= 15 && (
                <div className="mb-4">
                  <KnowledgeGraphViewer 
                    conversationId={currentConversationId}
                    height={350}
                  />
                </div>
              )}

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
                  <CardContent className="py-6 md:py-8 px-4 text-center">
                    <div className="flex flex-col items-center gap-2">
              <div className="p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                <MessageSquare className="h-12 w-12 md:h-16 md:w-16 text-indigo-600" />
              </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold mb-2">Inizia una Discussione</h3>
                        <p className="text-sm md:text-base text-muted-foreground max-w-md">
                          Gli agenti AI selezionati risponderanno in sequenza, ognuno con la propria prospettiva
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {messages.map((message) => (
                <div key={message.id}>
                  <MultiAgentMessage 
                    message={message}
                    onAudioEnd={() => {}}
                  />
                  {message.intent_tags && message.intent_tags.length > 0 && (
                    <div className="ml-16 -mt-2 mb-3">
                      <IntentBadges intents={message.intent_tags} />
                    </div>
                  )}
                </div>
              ))}


              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <MessageTabsView 
            messages={messages}
            isAutoFollowEnabled={isAutoFollowEnabled}
            onAutoFollowChange={setIsAutoFollowEnabled}
          />
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
      <div className="border-t border-border/40 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30 p-1 min-h-fit">
        <div className="container mx-auto max-w-5xl px-2 md:px-3">

          {/* Compact Control Bar TOP - Solo elementi selezionati */}
          {!isMobile && (
            <div className="mb-2 flex justify-start">
              <CompactControlBar
                position="top"
                conversationId={currentConversationId}
                isBarMode={isBarMode}
                isAISpeaking={isAISpeaking}
                isProcessing={isLoading}
                audioMode={audioMode}
                onToggleBarMode={setIsBarMode}
                globalMaxWords={globalMaxWords}
                onMaxWordsChange={setGlobalMaxWords}
                onInterrupt={() => {
                  console.log('🛑 Interruzione AI richiesta');
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  setIsAISpeaking(false);
                  setIsLoading(false);
                }}
                onTranscriptionComplete={(text) => {
                  if (text.trim()) {
                    handleSubmit({ preventDefault: () => {} } as any, text);
                  }
                }}
                isAutoFollowEnabled={isAutoFollowEnabled}
                onAutoFollowChange={setIsAutoFollowEnabled}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-0.5">
            {/* Textarea con microfono */}
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isTokenLimitReached 
                  ? "⛔ Limite 100K token raggiunto - Crea nuova conversazione" 
                  : (isMobile ? "Scrivi il messaggio..." : "Scrivi il tuo messaggio... Gli agenti AI risponderanno in sequenza")}
                disabled={isTokenLimitReached}
                className={`min-h-[40px] md:min-h-[60px] resize-none text-sm md:text-base ${isTokenLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              {/* Microfono Standard - Sempre visibile */}
              <VoiceRecorder
                ref={voiceRecorderRef}
                onTranscription={(text) => {
                  if (text.trim()) {
                    handleSubmit({ preventDefault: () => {} } as any, text);
                  }
                }}
                onRecordingStateChange={setRecordingState}
                conversationId={currentConversationId}
              />

              <Button 
                type="submit" 
                size="icon"
                disabled={isSubmitting || isLoading || (!prompt.trim() && recordingState === 'idle')}
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

          {/* Compact Control Bar BOTTOM - Resto degli elementi */}
          {!isMobile && (
            <div className="mt-2 w-full flex items-center justify-between gap-2">
              <CompactControlBar
                key={`compact-bar-bottom-${audioMode}`}
                position="bottom"
                conversationId={currentConversationId}
                isBarMode={isBarMode}
                isAISpeaking={isAISpeaking}
                isProcessing={isLoading}
                audioMode={audioMode}
                onToggleBarMode={setIsBarMode}
                onInterrupt={() => {
                  console.log('🛑 Interruzione audio AI richiesta');
                  setIsAISpeaking(false);
                }}
                onTranscriptionComplete={(text) => {
                  if (text.trim()) {
                    handleSubmit({ preventDefault: () => {} } as any, text);
                  }
                }}
              />
              
              {/* Icone a destra */}
              <div className="flex items-center gap-1">
                <FileUploader
                  onFilesUploaded={setUploadedFiles}
                />
                <ImageGenerator
                  onImageGenerated={setGeneratedImage}
                />
              </div>
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
