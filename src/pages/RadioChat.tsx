import { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu, LayoutGrid, MessageSquare, ChevronLeft, ChevronRight, Bug, X, Keyboard, FileText, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCRMLayout } from '@/contexts/CRMLayoutContext';
import { RadioSidebar } from '@/components/radio-chat/RadioSidebar';
import { RadioConversationsSidebar } from '@/components/radio-chat/RadioConversationsSidebar';
import { RadioMessageInput } from '@/components/radio-chat/RadioMessageInput';
import { RadioSendButton } from '@/components/radio-chat/RadioSendButton';
import { RadioMessageView } from '@/components/radio-chat/RadioMessageView';
import { RadioCarousel3D } from '@/components/radio-chat/RadioCarousel3D';
import { RadioParticipantSelector } from '@/components/radio-chat/RadioParticipantSelector';
import { RadioSidebarTrigger } from '@/components/radio-chat/RadioSidebarTrigger';
import { RadioParticipantIcon } from '@/components/radio-chat/RadioParticipantIcon';
import { AISidebarTrigger } from '@/components/ai/AISidebarTrigger';
import { AISidebarSlider } from '@/components/ai/AISidebarSlider';
import { useGlobalAICanvas } from '@/hooks/useGlobalAICanvas';
import { RadioMessagesView } from '@/components/radio-chat/RadioMessagesView';
import { RadioCarouselAudioPlayerWrapper } from '@/components/radio-chat/RadioCarouselAudioPlayerWrapper';
import { RadioAudioControls } from '@/components/radio-chat/RadioAudioControls';
import { RadioMicTrigger } from '@/components/radio-chat/RadioMicTrigger';
import { useRadioAudioPlayback } from '@/hooks/useRadioAudioPlayback';
import { useAudioPreference } from '@/hooks/useAudioPreference';
import { RadioMessage } from '@/types/radio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { debounce } from 'lodash';
import { RadioAudioPlayerProvider } from '@/contexts/RadioAudioPlayerContext';
import { FloatingZoomControl } from '@/components/email/management/FloatingZoomControl';

// Import avatar assets
import albertGif from '@/assets/albert-mining.gif';
import albertStatic from '@/assets/albert-static.png';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import pitagoraStatic from '@/assets/pitagora-static.png';
import archimedeGif from '@/assets/archimede-stones.gif';
import archimedeStatic from '@/assets/archimede-static.png';

interface RadioParticipant {
  id: string;
  type: 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
  voice_id?: string;
}

const RadioChat = () => {
  return (
    <RadioAudioPlayerProvider>
      <RadioChatContent />
    </RadioAudioPlayerProvider>
  );
};

const RadioChatContent = () => {
  const { menuOpen: crmMenuOpen, setMenuOpen: setCrmMenuOpen } = useCRMLayout();
  const { state: aiCanvasState } = useGlobalAICanvas();
  const [sidebarOpen, setSidebarOpen] = useState(true); // ✅ Open by default to show chat selector
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [messageViewVisible, setMessageViewVisible] = useState(false);
  const [messages, setMessages] = useState<RadioMessage[]>([]);
  // ✅ Fix 2: Persist conversationId in localStorage
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    const saved = localStorage.getItem('radio-current-conversation-id');
    return saved || null;
  });
  const [conversations, setConversations] = useState<any[]>([]); // ✅ Lista chat
  
  // ⚡ LIVELLO 2: Cache prompts client-side
  const [cachedPrompts, setCachedPrompts] = useState<any>(null);
  
  // ✅ Fix 2: Persist viewMode in localStorage
  const [viewMode, setViewMode] = useState<'carousel' | 'messages'>(() => {
    const saved = localStorage.getItem('radio-view-mode');
    return (saved as 'carousel' | 'messages') || 'carousel';
  });
  
  const [participants, setParticipants] = useState<RadioParticipant[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Persist auto-advance in localStorage
  const [isAutoAdvanceEnabled, setIsAutoAdvanceEnabled] = useState(() => {
    const saved = localStorage.getItem('radio-auto-advance');
    return saved ? JSON.parse(saved) : true;
  });
  
  // Persist carousel zoom in localStorage
  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('radio-carousel-zoom');
    return saved ? parseFloat(saved) : 1.0; // Default 100%
  });
  
  // Persist carousel vertical offset in localStorage
  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(() => {
    const saved = localStorage.getItem('radio-carousel-vertical-offset');
    return saved ? parseFloat(saved) : 0; // Default 0px
  });
  
  // ✅ Ghost Icons: proximity detection
  const [isNearLeftEdge, setIsNearLeftEdge] = useState(false);
  
  // ✅ Central Input Zone: hover detection
  const [isHoveringInputZone, setIsHoveringInputZone] = useState(false);
  
  // Sync vertical offset to localStorage
  useEffect(() => {
    localStorage.setItem('radio-carousel-vertical-offset', carouselVerticalOffset.toString());
  }, [carouselVerticalOffset]);
  
  const [debugPopupOpen, setDebugPopupOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'conversations' | 'settings'>('settings'); // ✅ Tab selector - opens on Settings by default
  const [showAudioControls, setShowAudioControls] = useState(false); // 🎤 Audio controls popup
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false); // 🤖 AI Assistant sidebar
  
  const { toast } = useToast();
  
  // Hotkey Ctrl+M per toggle audio controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowAudioControls(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Hooks audio dedicati per Radio Chat
  const { 
    isAudioPlaying, 
    currentPlayingId,
    canPlayAudio,
    handleAudioStart, 
    handleAudioEnd,
    stopCurrentAudio
  } = useRadioAudioPlayback();
  
  const { isAudioEnabled } = useAudioPreference();
  const isMobile = useIsMobile();
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔐 [AUTH] Current user:', {
        userId: user?.id,
        email: user?.email,
        isAuthenticated: !!user
      });
      setCurrentUser(user);
      
      if (!user) {
        toast({
          title: "⚠️ Non autenticato",
          description: "Devi essere loggato per usare Radio Chat",
          variant: "destructive"
        });
      }
    };
    checkAuth();
  }, [toast]);
  
  // Listener per apertura debug popup da header
  useEffect(() => {
    const handleToggleDebug = () => {
      setDebugPopupOpen(prev => !prev);
    };
    
    window.addEventListener('toggle-debug-popup', handleToggleDebug);
    return () => window.removeEventListener('toggle-debug-popup', handleToggleDebug);
  }, []);
  
  // Load participants from elevenlabs_agents
  useEffect(() => {
    console.log('🚀 [MOUNT] RadioChat useEffect triggered, supabase ready:', !!supabase);
    
    const loadParticipants = async () => {
      try {
        console.log('🔍 [DEBUG] Inizio caricamento participants...');
        
        const { data, error } = await supabase
          .from('elevenlabs_agents')
          .select('id, name, is_active, elevenlabs_agent_id, voice_id')
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        
        console.log('🔍 [DEBUG] Query result:', { 
          hasData: !!data, 
          count: data?.length || 0,
          data: data,
          hasError: !!error,
          error: error
        });
        
        if (error) {
          console.error('❌ Errore query:', error);
          toast({
            title: "Errore caricamento agenti",
            description: error.message,
            variant: "destructive"
          });
          return;
        }
        
        if (!data || data.length === 0) {
          console.warn('⚠️ Nessun agente con is_active=true');
          toast({
            title: "Nessun agente disponibile",
            description: "Attiva almeno un agente nelle impostazioni AI",
            variant: "destructive"
          });
          return;
        }
        
        const mapped: RadioParticipant[] = data.map(agent => {
          let type: 'chatgpt' | 'gemini' | 'claude' = 'gemini';
          const nameLower = agent.name.toLowerCase();
          
          if (nameLower.includes('gpt')) type = 'chatgpt';
          else if (nameLower.includes('claude') || nameLower.includes('anthropic')) type = 'claude';
          else if (nameLower.includes('gemini')) type = 'gemini';
          
          // Map type to character names based on GIF animations
          const displayName = type === 'chatgpt' ? 'Albert' 
                            : type === 'gemini' ? 'Pitagora' 
                            : 'Archimede';
          
          console.log('🔍 [MAP]', { 
            name: agent.name, 
            type, 
            id: agent.elevenlabs_agent_id 
          });
          
          return {
            id: agent.elevenlabs_agent_id || agent.id,
            type,
            name: displayName,
            is_active: true,
            voice_id: agent.voice_id
          };
        });
        
        console.log('✅ [SUCCESS] Participants caricati:', mapped);
        setParticipants(mapped);
        
        toast({
          title: "Agenti caricati",
          description: `${mapped.length} agenti disponibili`,
        });
        
      } catch (err) {
        console.error('💥 [FATAL]', err);
        toast({
          title: "Errore critico",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive"
        });
      }
    };
    
    loadParticipants();
  }, [supabase]);
  
  // ✅ Save conversationId to localStorage when it changes
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('radio-current-conversation-id', currentConversationId);
    } else {
      localStorage.removeItem('radio-current-conversation-id');
    }
  }, [currentConversationId]);
  
  // ✅ Load conversations list on mount and restore conversation
  useEffect(() => {
    if (currentUser?.id) {
      loadConversations();
      
      // Restore conversation from localStorage if exists
      const savedConvId = localStorage.getItem('radio-current-conversation-id');
      if (savedConvId) {
        console.log('🔄 Restoring conversation from localStorage:', savedConvId);
        loadMessages(savedConvId);
        loadCachedPrompts(savedConvId);
      }
    }
  }, [currentUser]);
  
  // Load conversations from DB
  const loadConversations = async () => {
    if (!currentUser?.id) return;
    
    try {
      // 1️⃣ Recupera conversazioni con tutti i campi necessari
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .select('id, titolo, created_at, updated_at, riassunto_contesto, active_participants')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // 2️⃣ Calcola statistiche per ogni conversazione
      const conversationsWithStats = await Promise.all(
        (data || []).map(async (conv) => {
          // Conta messaggi
          const { count } = await supabase
            .from('chat_laboratory_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          // Recupera token da tutti i messaggi
          const { data: messagesData } = await supabase
            .from('chat_laboratory_messages')
            .select('token_input, token_output')
            .eq('conversation_id', conv.id);

          // Somma token totali
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
      console.log('✅ Loaded conversations with stats:', conversationsWithStats.length);
    } catch (err) {
      console.error('❌ Error loading conversations:', err);
      toast({
        title: "Errore",
        description: "Impossibile caricare conversazioni",
        variant: "destructive"
      });
    }
  };
  
  // Handle conversation selection
  const handleSelectConversation = async (conversationId: string) => {
    console.log('✅ Selecting conversation:', conversationId);
    setCurrentConversationId(conversationId);
    await loadMessages(conversationId);
    loadCachedPrompts(conversationId);
    setSidebarOpen(false);
    // Chiudi menu CRM se è aperto
    if (crmMenuOpen) setCrmMenuOpen(false);
  };
  
  // Handle new conversation (Pattern identico ChatLaboratory)
  const handleNewConversation = async () => {
    if (!currentUser?.id) return;
    
    try {
      console.log('🆕 Creating new conversation...');
      
      // 1️⃣ Crea conversazione nel DB (come ChatLaboratory)
      const { data: newConv, error: createError } = await supabase
        .from('chat_laboratory_conversations')
        .insert({
          user_id: currentUser.id,
          titolo: 'Radio Chat ' + new Date().toLocaleDateString()
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      console.log('✅ New conversation created:', newConv.id);
      
      // 2️⃣ Imposta nuovo ID (come ChatLaboratory)
      setCurrentConversationId(newConv.id);
      
      // 3️⃣ Pulisce messaggi e UI (come ChatLaboratory)
      setActiveMessageId(''); // ← PRIMA resetta il messaggio attivo
      setMessages([]); // ← POI svuota i messaggi
      setInputValue('');
      setInputVisible(false);
      setMessageViewVisible(false);
      
      // 4️⃣ Carica dati (come ChatLaboratory)
      loadCachedPrompts(newConv.id);
      await loadConversations();
      setSidebarOpen(false);
      // Chiudi menu CRM se è aperto
      if (crmMenuOpen) setCrmMenuOpen(false);
      
      toast({
        title: "✨ Nuova conversazione",
        description: "Inizia a chattare!",
      });
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare conversazione",
        variant: "destructive"
      });
    }
  };
  
  // Handle delete conversation
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) throw error;
      
      if (conversationId === currentConversationId) {
        setCurrentConversationId(null);
        setMessages([]);
        localStorage.removeItem('radio-current-conversation-id');
      }
      
      await loadConversations();
      
      toast({
        title: "Conversazione eliminata",
        description: "La conversazione è stata eliminata con successo"
      });
    } catch (err) {
      console.error('❌ Error deleting conversation:', err);
      toast({
        title: "Errore",
        description: "Impossibile eliminare conversazione",
        variant: "destructive"
      });
    }
  };
  
  // Handle update title
  const handleUpdateTitle = async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ titolo: title })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      await loadConversations();
      
      toast({
        title: "Titolo aggiornato",
        description: "Il titolo è stato modificato con successo"
      });
    } catch (err) {
      console.error('❌ Error updating title:', err);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare titolo",
        variant: "destructive"
      });
    }
  };
  
  // Handle generate summary
  const handleGenerateSummary = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-chunked-summary', {
        body: {
          conversationId,
          chunkSize: 20,
          includeAll: false
        }
      });

      if (error) throw error;

      if (data.messagesSummarized === 0) {
        toast({
          title: "ℹ️ Nessun messaggio da riassumere",
          description: data.message || "La conversazione non ha abbastanza messaggi per generare un riassunto",
        });
        return;
      }

      toast({
        title: "✅ Riassunto generato",
        description: `${data.messagesSummarized} messaggi analizzati`,
      });

      // Ricarica conversazioni per aggiornare riassunto_contesto
      loadConversations();
    } catch (err) {
      console.error('❌ Error generating summary:', err);
      toast({
        title: "❌ Errore",
        description: "Impossibile generare il riassunto",
        variant: "destructive"
      });
    }
  };

  // Handle generate full report
  const handleGenerateFullReport = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-chunked-summary', {
        body: {
          conversationId,
          chunkSize: 50,
          includeAll: true
        }
      });

      if (error) throw error;

      // Genera e scarica Markdown
      const markdown = generateMarkdownReport(data);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `riassunto-conversazione-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "📋 Report scaricato",
        description: "File Markdown salvato",
      });
    } catch (err) {
      console.error('❌ Error generating report:', err);
      toast({
        title: "❌ Errore",
        description: "Impossibile generare il report",
        variant: "destructive"
      });
    }
  };

  // Helper function to generate Markdown report
  const generateMarkdownReport = (data: any) => {
    let markdown = `# Riassunto Conversazione\n\n`;
    markdown += `**Data:** ${new Date().toLocaleDateString('it-IT', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;
    markdown += `**Messaggi analizzati:** ${data.messagesSummarized}\n\n`;
    markdown += `---\n\n`;
    markdown += `## Sintesi Generale\n\n${data.finalSummary}\n\n`;
    
    if (data.chunks && data.chunks.length > 1) {
      markdown += `## Dettagli per Sezione\n\n`;
      data.chunks.forEach((chunk: any, idx: number) => {
        markdown += `### Sezione ${idx + 1} (Messaggi ${chunk.messageRange[0] + 1}-${chunk.messageRange[1] + 1})\n\n`;
        markdown += `**Partecipanti:** ${chunk.participants.join(', ')}\n\n`;
        markdown += `${chunk.summary}\n\n`;
        if (chunk.keyPoints.length > 0) {
          markdown += `**Punti Chiave:**\n\n`;
          chunk.keyPoints.forEach((point: string) => {
            markdown += `- ${point}\n`;
          });
          markdown += `\n`;
        }
      });
    }
    
    return markdown;
  };
  
  // ⚡ LIVELLO 2: Load prompts client-side (save 300-500ms per message)
  const loadCachedPrompts = async (conversationId: string) => {
    console.log('⚡ [LIVELLO 2] Caricamento prompt dal DB (una sola volta)...');
    
    try {
      // Load conversation-specific prompt
      const { data: conv } = await supabase
        .from('chat_laboratory_conversations')
        .select('composed_prompt_id, system_prompt_id, personality_section_id')
        .eq('id', conversationId)
        .single();
      
      let conversationPrompt: string | null = null;
      let conversationPersonality: string | null = null;
      
      // Check for composed prompt
      if (conv?.composed_prompt_id) {
        const { data: composedPrompt } = await supabase
          .from('chat_laboratory_composed_prompts')
          .select('content')
          .eq('id', conv.composed_prompt_id)
          .single();
        
        if (composedPrompt?.content) {
          conversationPrompt = composedPrompt.content;
        }
      }
      // Otherwise check for system prompt
      else if (conv?.system_prompt_id) {
        const { data: specificPrompt } = await supabase
          .from('chat_laboratory_system_prompts')
          .select('contenuto')
          .eq('id', conv.system_prompt_id)
          .single();
        
        if (specificPrompt?.contenuto) {
          conversationPrompt = specificPrompt.contenuto;
        }
      }
      
      // Load conversation-specific personality
      if (conv?.personality_section_id) {
        const { data: personalitySection } = await supabase
          .from('chat_laboratory_prompt_sections')
          .select('content')
          .eq('id', conv.personality_section_id)
          .single();
        
        if (personalitySection?.content) {
          conversationPersonality = personalitySection.content;
        }
      }
      
      // Load global prompts
      const [globalData, baseData, personalityData, styleData, orchestratorData] = await Promise.all([
        supabase.from('chat_laboratory_system_prompts')
          .select('contenuto')
          .eq('attivo', true)
          .limit(1)
          .maybeSingle(),
        
        supabase.from('chat_laboratory_prompt_sections')
          .select('content')
          .eq('section_type', 'BASE')
          .eq('is_active', true)
          .order('order_priority', { ascending: true }),
        
        supabase.from('chat_laboratory_prompt_sections')
          .select('section_name, content')
          .eq('section_type', 'AGENT_PERSONALITY')
          .eq('is_active', true),
        
        supabase.from('chat_laboratory_prompt_sections')
          .select('section_name, content')
          .eq('section_type', 'CONVERSATION_STYLE')
          .eq('is_active', true),
        
        supabase.from('chat_laboratory_prompt_sections')
          .select('content')
          .eq('section_type', 'ORCHESTRATOR_RULES')
          .eq('is_active', true)
          .maybeSingle()
      ]);
      
      // Build agentPersonalities and conversationStyles as objects (not Map)
      const agentPersonalities: Record<string, string> = {};
      personalityData.data?.forEach((p: any) => {
        agentPersonalities[p.section_name.toLowerCase()] = p.content;
      });
      
      const conversationStyles: Record<string, string> = {};
      styleData.data?.forEach((s: any) => {
        conversationStyles[s.section_name.toLowerCase()] = s.content;
      });
      
      const prompts = {
        globalPrompt: conversationPrompt || globalData.data?.contenuto || 'Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.',
        baseSections: baseData.data?.map((s: any) => s.content).join('\n\n') || '',
        agentPersonalities,
        conversationStyles,
        orchestratorRules: orchestratorData.data?.content || 'Leggi l\'ultimo messaggio. Se contiene una DOMANDA o RICHIESTA verso altri, rispondi TRUE. Altrimenti FALSE.',
        conversationPersonality,
        timestamp: Date.now()
      };
      
      setCachedPrompts(prompts);
      console.log('✅ [LIVELLO 2] Prompt caricati nel client:', {
        globalPromptLength: prompts.globalPrompt.length,
        agentPersonalitiesCount: Object.keys(prompts.agentPersonalities).length
      });
    } catch (error) {
      console.error('❌ [LIVELLO 2] Errore caricamento prompt:', error);
    }
  };
  
  // Persist auto-advance changes to localStorage
  useEffect(() => {
    localStorage.setItem('radio-auto-advance', JSON.stringify(isAutoAdvanceEnabled));
  }, [isAutoAdvanceEnabled]);
  
  // ✅ Fix 2: Persist viewMode changes to localStorage
  useEffect(() => {
    localStorage.setItem('radio-view-mode', viewMode);
  }, [viewMode]);
  
  // 🔒 Chiusura reciproca: se apro CRM menu, chiudo sidebar RadioChat
  useEffect(() => {
    if (crmMenuOpen && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [crmMenuOpen]);
  
  
  // Persist carousel zoom changes to localStorage with debouncing
  const debouncedSetCarouselZoom = useCallback(
    debounce((zoom: number) => {
      setCarouselZoom(zoom);
      localStorage.setItem('radio-carousel-zoom', zoom.toString());
    }, 50),
    []
  );
  
  const handleZoomChange = (zoom: number) => {
    console.log(`🔄 Zoom slider: ${zoom.toFixed(2)}`);
    debouncedSetCarouselZoom(zoom);
  };
  
  // Calculate AI messages
  const aiMessages = messages.filter(m => m.sender_type !== 'human');
  
  // Simple state for carousel navigation (only used in carousel mode)
  const [activeMessageId, setActiveMessageId] = useState<string>('');
  
  // ✅ FIX AUDIO: useMemo per stabilità firstAiMessageId
  const firstAiMessageId = useMemo(() => {
    return aiMessages.length > 0 ? aiMessages[0].id : '';
  }, [aiMessages.length]);
  
  // Auto-set first AI message as active for carousel
  useEffect(() => {
    if (firstAiMessageId && !activeMessageId) {
      console.log(`🎯 [RadioChat] Setting first AI message: ${aiMessages[0]?.sender_name}`);
      setActiveMessageId(firstAiMessageId);
    }
  }, [firstAiMessageId, activeMessageId]);
  
  // ✅ FIX AUDIO: useMemo per stabilità currentMessage (previene undefined transitorio)
  const currentMessage = useMemo(() => {
    return messages.find(m => m.id === activeMessageId) || null;
  }, [messages, activeMessageId]);
  
  // ✅ Handler carousel: semplicissimo - avanza al prossimo
  const handleCarouselAudioEnd = () => {
    handleAudioEnd(); // Stop audio state (async)
    
    if (!isAutoAdvanceEnabled) return;
    
    // ✅ P0 FIX: Delay per aspettare che isAudioPlaying = false
    setTimeout(() => {
      const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
      const nextMessage = aiMessages[currentIndex + 1];
      
      if (nextMessage) {
        console.log('➡️ [RadioChat] Auto-advance to:', nextMessage.sender_name);
        setActiveMessageId(nextMessage.id);
      }
    }, 50);
  };

  // Navigazione manuale per carousel
  const handlePrevCard = () => {
    if (aiMessages.length === 0) return;
    
    // ✅ P0 FIX: Stop audio se sta suonando
    if (isAudioPlaying) {
      stopCurrentAudio();
    }
    
    const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    const newIndex = (currentIndex - 1 + aiMessages.length) % aiMessages.length;
    setActiveMessageId(aiMessages[newIndex].id);
  };
  
  const handleNextCard = () => {
    if (aiMessages.length === 0) return;
    
    // ✅ P0 FIX: Stop audio se sta suonando
    if (isAudioPlaying) {
      stopCurrentAudio();
    }
    
    const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    const newIndex = (currentIndex + 1) % aiMessages.length;
    setActiveMessageId(aiMessages[newIndex].id);
  };

  // ============= TRACKPAD/SWIPE SUPPORT =============
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const swipeThreshold = 75;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > swipeThreshold) handleNextCard();
    else if (distance < -swipeThreshold) handlePrevCard();
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Rileva scroll orizzontale del trackpad
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      if (e.deltaX > 30) handleNextCard();
      else if (e.deltaX < -30) handlePrevCard();
    }
  };

  // Load messages from DB
  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_laboratory_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Errore caricamento messaggi:', error);
      return;
    }
    
    // Cast to correct types
    const typedMessages: RadioMessage[] = (data || []).map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_type: msg.sender_type as 'human' | 'chatgpt' | 'gemini' | 'claude',
      sender_name: msg.sender_name,
      content: msg.content,
      audio_url: msg.audio_url,
      token_input: msg.token_input,
      token_output: msg.token_output,
      tempo_risposta_ms: msg.tempo_risposta_ms,
      attachments: msg.attachments,
      images: (Array.isArray(msg.images) ? msg.images : []) as string[],
      generated_images: (Array.isArray(msg.generated_images) ? msg.generated_images : []) as string[],
      is_visible_to_ai: msg.is_visible_to_ai ?? true,
      created_at: msg.created_at
    }));
    
    setMessages(typedMessages);
  };

  // Create conversation on first send
  const createConversation = async () => {
    const { data, error } = await supabase
      .from('chat_laboratory_conversations')
      .insert({
        titolo: `Radio Chat ${new Date().toLocaleString()}`,
        active_participants: participants.map(p => ({ name: p.name, type: p.type })),
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Errore creazione conversazione:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile creare la conversazione',
        variant: 'destructive'
      });
      return null;
    }
    
    return data.id;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    
    const messageToSend = inputValue;
    setInputValue('');
    setInputVisible(false); // Nascondi textarea dopo invio
    setIsSending(true);
    
    console.log('📤 Sending message:', messageToSend);
    
    try {
      // 1. Create conversation if not exists
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
        if (!convId) return;
        setCurrentConversationId(convId);
      }
      
      // 2. Save human message
      const { error: humanError } = await supabase
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: convId,
          sender_type: 'human',
          sender_name: 'You',
          content: messageToSend
        });
      
      if (humanError) {
        console.error('❌ Errore salvataggio messaggio:', humanError);
        toast({
          title: 'Errore',
          description: 'Impossibile inviare il messaggio',
          variant: 'destructive'
        });
        return;
      }
      
      if (!convId) {
        console.error('❌ convId is null dopo createConversation');
        return;
      }
      
      // 3. Call orchestrator with correct format
      const activeParticipants = participants
        .filter(p => p.is_active)
        .map(p => ({
          id: p.id,
          type: p.type,
          name: p.name,
          is_active: true,
          voiceId: p.voice_id
        }));
      
      console.log('🎯 Calling radio-chat-orchestrator with participants:', activeParticipants);
      
      // ⚡ LIVELLO 2: Include cached prompts in request body (if available)
      const requestBody: any = {
        conversationId: convId,
        userMessage: messageToSend,
        participants: activeParticipants
      };
      
      if (cachedPrompts) {
        requestBody.cachedPrompts = cachedPrompts;
        console.log('⚡ [LIVELLO 2] Invio prompt dal client (skip DB query)');
      }
      
      // Create orchestrator promise with timeout
      const orchestratorPromise = supabase.functions.invoke('radio-chat-orchestrator', {
        body: requestBody
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: AI non risponde')), 90000)
      );

      try {
        const { data, error } = await Promise.race([orchestratorPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('❌ Errore orchestrator:', error);
          toast({
            title: 'Errore AI',
            description: error.message,
            variant: 'destructive'
          });
        } else {
          console.log('✅ Orchestrator completato:', data);
        }
      } catch (timeoutError: any) {
        console.error('⏱️ Timeout orchestrator:', timeoutError);
        toast({
          title: 'Timeout',
          description: 'Le AI stanno impiegando troppo tempo',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('❌ Errore handleSend:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante invio',
        variant: 'destructive'
      });
      setIsSending(false);
    }
  };

  const handleToggleParticipant = (id: string) => {
    // ✅ Toggle SOLO stato locale (attivo/disattivo in questa conversazione)
    // NON modifica il DB (disponibilità globale gestita in /settings)
    const participant = participants.find(p => p.id === id);
    if (!participant) return;
    
    const newState = !participant.is_active;
    
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, is_active: newState } : p
    ));
    
    console.log(`✅ Agent ${participant.name} → attivo in conversazione: ${newState}`);
    toast({
      title: newState ? 'Agente attivato' : 'Agente disattivato',
      description: `${participant.name} è ${newState ? 'attivo' : 'disattivo'} in questa conversazione`,
    });
  };

  // Real-time subscription
  useEffect(() => {
    if (!currentConversationId) return;
    
    loadMessages(currentConversationId);
    
    const channel = supabase
      .channel(`radio-chat-${currentConversationId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_laboratory_messages',
          filter: `conversation_id=eq.${currentConversationId}`
        },
        (payload) => {
          console.log('🔔 New message received:', payload);
          
          // Aggiungi solo il nuovo messaggio invece di ricaricare tutto
          const newMsg = payload.new;
          const typedMessage: RadioMessage = {
            id: newMsg.id,
            conversation_id: newMsg.conversation_id,
            sender_type: newMsg.sender_type as 'human' | 'chatgpt' | 'gemini' | 'claude',
            sender_name: newMsg.sender_name,
            content: newMsg.content,
            audio_url: newMsg.audio_url,
            token_input: newMsg.token_input,
            token_output: newMsg.token_output,
            tempo_risposta_ms: newMsg.tempo_risposta_ms,
            attachments: newMsg.attachments,
            images: (Array.isArray(newMsg.images) ? newMsg.images : []) as string[],
            generated_images: (Array.isArray(newMsg.generated_images) ? newMsg.generated_images : []) as string[],
            is_visible_to_ai: newMsg.is_visible_to_ai ?? true,
            created_at: newMsg.created_at
          };
          
          // Previeni duplicati (può succedere con ottimistic update)
          setMessages(prev => {
            if (prev.some(m => m.id === typedMessage.id)) {
              console.log('⏭️ [RadioChat] Messaggio già presente, skip');
              return prev;
            }
            return [...prev, typedMessage];
          });
          
          // ✅ Sblocca input dopo PRIMO messaggio AI ricevuto
          if (newMsg.sender_type !== 'human') {
            console.log('🔓 [Realtime] Messaggio AI ricevuto → Sblocco input');
            setIsSending(false);
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_laboratory_messages',
          filter: `conversation_id=eq.${currentConversationId}`
        },
        (payload) => {
          console.log('🔄 Message updated with audio:', payload);
          
          const updatedMsg = payload.new;
          
          // ✅ FIX AUDIO: verifica se QUALSIASI campo rilevante è cambiato
          setMessages(prev => {
            const existingMsg = prev.find(m => m.id === updatedMsg.id);
            
            // Skip se NESSUN campo rilevante è cambiato
            if (
              existingMsg?.audio_url === updatedMsg.audio_url &&
              existingMsg?.token_input === updatedMsg.token_input &&
              existingMsg?.token_output === updatedMsg.token_output
            ) {
              console.log('⏭️ [RadioChat] Nessun campo cambiato, skip update');
              return prev; // NO re-render
            }
            
            console.log('🔄 [RadioChat] Campi aggiornati:', {
              audio_changed: existingMsg?.audio_url !== updatedMsg.audio_url,
              tokens_changed: existingMsg?.token_input !== updatedMsg.token_input
            });
            
            return prev.map(msg =>
              msg.id === updatedMsg.id
                ? {
                    ...msg,
                    audio_url: updatedMsg.audio_url,
                    token_input: updatedMsg.token_input,
                    token_output: updatedMsg.token_output,
                    tempo_risposta_ms: updatedMsg.tempo_risposta_ms
                  }
                : msg
            );
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversationId]);

  // ✅ Ghost Icons: Global mouse listener for proximity detection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Zona di attivazione: 0-100px dal bordo sinistro
      setIsNearLeftEdge(e.clientX <= 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ✅ Calcola visibilità icone laterali
  // Visibilità generale: mouse vicino bordo sinistro O sidebar/menu aperti
  // Ogni icona gestisce individualmente la propria visibilità quando il suo pannello è attivo
  const shouldShowLeftIcons = isNearLeftEdge || sidebarOpen || crmMenuOpen;

  return (
    <div className="relative h-full">
        {(() => {
          console.log('🔍 [DEBUG] Rendering RadioSidebar con participants:', participants);
          return null;
        })()}
        
        {/* Dual Sidebar: Conversations + Settings */}
        <div className={cn(
          "fixed left-0 top-24 md:top-28 h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] w-[320px] bg-transparent border-r border-border/40 z-50 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Tab Navigation */}
          <div className="flex border-b border-border/40">
            <button
              onClick={() => setActiveSidebarTab('conversations')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeSidebarTab === 'conversations' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveSidebarTab('settings')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeSidebarTab === 'settings' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Impostazioni
            </button>
          </div>
          
          {/* Tab Content */}
          {activeSidebarTab === 'conversations' ? (
            <RadioConversationsSidebar
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateTitle={handleUpdateTitle}
              onCloseSidebar={() => setSidebarOpen(false)}
              onGenerateSummary={handleGenerateSummary}
              onGenerateFullReport={handleGenerateFullReport}
            />
          ) : (
            <RadioSidebar 
              isOpen={true}
              onClose={() => {
                setSidebarOpen(false);
                // Chiudi menu CRM se è aperto
                if (crmMenuOpen) setCrmMenuOpen(false);
              }}
              conversationId={currentConversationId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              isAutoAdvanceEnabled={isAutoAdvanceEnabled}
              onAutoAdvanceChange={setIsAutoAdvanceEnabled}
              participants={participants}
              onToggleParticipant={handleToggleParticipant}
              carouselZoom={carouselZoom}
              onCarouselZoomChange={handleZoomChange}
            />
          )}
        </div>
      {/* AI Assistant Trigger - Fifth Tab (sopra RadioSidebarTrigger) */}
      <AISidebarTrigger
        className={cn(
          "fixed left-0 bottom-[24rem] z-40 transition-all duration-300",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && !aiSidebarOpen && "opacity-0 pointer-events-none",
          (shouldShowLeftIcons || aiSidebarOpen) && "opacity-100"
        )}
        isOpen={aiSidebarOpen}
        onToggle={() => setAiSidebarOpen(!aiSidebarOpen)}
        hasActiveConversation={aiCanvasState.messages.length > 0}
      />

      {/* Hamburger Sidebar - Bottom Left */}
      <RadioSidebarTrigger
        className={cn(
          "fixed left-0 bottom-[18.5rem] z-40 transition-all duration-300",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && "opacity-0 pointer-events-none",
          shouldShowLeftIcons && !sidebarOpen && "opacity-100"
        )}
        isOpen={sidebarOpen}
        onToggle={() => {
          const newState = !sidebarOpen;
          setSidebarOpen(newState);
          // Se apro la sidebar, chiudo il menu CRM
          if (newState && crmMenuOpen) setCrmMenuOpen(false);
        }}
        isAudioEnabled={isAudioEnabled}
        isAutoAdvanceEnabled={isAutoAdvanceEnabled}
      />

      {/* FileText Icon - Below Keyboard */}
      <button
        onClick={() => setMessageViewVisible(!messageViewVisible)}
        className={cn(
          "fixed left-0 bottom-[13rem] z-40 w-12 h-20 bg-transparent rounded-r-lg border border-white/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-white/5",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && !messageViewVisible && "opacity-0 pointer-events-none",
          (shouldShowLeftIcons || messageViewVisible) && "opacity-100"
        )}
        aria-label="Toggle message view"
      >
        <FileText 
          className={cn(
            "w-6 h-6 transition-colors",
            messageViewVisible ? 'text-cyan-400' : (currentMessage ? 'text-cyan-400' : 'text-gray-500')
          )}
          strokeWidth={1}
        />
      </button>

      {/* Mic Icon - Between FileText and Keyboard */}
        <RadioMicTrigger
          className={cn(
            "fixed left-0 bottom-[7.5rem] z-40 transition-all duration-300",
            sidebarOpen && "translate-x-[320px]",
            !shouldShowLeftIcons && !showAudioControls && "opacity-0 pointer-events-none",
            (shouldShowLeftIcons || showAudioControls) && "opacity-100"
          )}
          isActive={showAudioControls}
          onClick={() => setShowAudioControls(!showAudioControls)}
        />

      {/* Keyboard Icon - Above Hamburger */}
      <button
        onClick={() => setInputVisible(!inputVisible)}
        className={cn(
          "fixed left-0 bottom-8 z-40 w-12 h-20 bg-transparent rounded-r-lg border border-white/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-white/5",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && !inputVisible && "opacity-0 pointer-events-none",
          (shouldShowLeftIcons || inputVisible) && "opacity-100"
        )}
        aria-label="Toggle input"
      >
        <Keyboard 
          className={cn(
            "w-6 h-6 transition-colors",
            inputVisible ? 'text-cyan-400' : 'text-gray-500'
          )}
          strokeWidth={1}
        />
      </button>

      {/* ✅ CENTRAL INPUT ZONE - 300x150px Interactive Area */}
      <div
        onMouseEnter={() => setIsHoveringInputZone(true)}
        onMouseLeave={() => setIsHoveringInputZone(false)}
        onDoubleClick={() => setInputVisible(true)}
        className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-30",
          "w-[300px] h-[150px]"
        )}
        style={{
          cursor: isHoveringInputZone 
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2322d3ee' stroke-width='2'%3E%3Cpath d='M10 8h.01M14 8h.01M8 12h.01M12 12h.01M16 12h.01M9 16h6M6 4h12c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/%3E%3C/svg%3E") 12 12, pointer`
            : 'default'
        }}
        aria-label="Double click to open text input"
      />

      {/* Main Content Area */}
        <div className="pt-4 pb-[200px]">
        
        {/* Carousel View - Sempre montato, nascosto quando inattivo */}
        <div className={viewMode === 'carousel' ? 'block' : 'hidden'}>
          <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] md:min-h-[700px] lg:min-h-[850px]">
            {/* Carousel Container - Flex 1 */}
            <div 
              className="relative flex-1 min-h-0 overflow-visible"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              {/* Carousel 3D */}
              <div className="absolute inset-0 z-10">
                <RadioCarousel3D 
                  messages={messages}
                  activeMessageId={activeMessageId}
                  zoom={carouselZoom}
                  verticalOffset={carouselVerticalOffset}
                />
              </div>
              
              {/* 🎛️ Controlli Zoom e Vertical Offset - POSIZIONE SINISTRA */}
              {!sidebarOpen && !crmMenuOpen && (
                <FloatingZoomControl
                  zoom={carouselZoom}
                  onZoomChange={setCarouselZoom}
                  verticalOffset={carouselVerticalOffset}
                  onVerticalOffsetChange={setCarouselVerticalOffset}
                  position="left"
                />
              )}

              {/* ✅ AREE CLICCABILI INVISIBILI (25% sinistra e destra) */}
              {aiMessages.length > 1 && (
                <>
                  {/* Area sinistra - vai indietro */}
                  <button
                    onClick={handlePrevCard}
                    className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer group"
                    aria-label="Previous message"
                  />
                  
                  {/* Area destra - vai avanti */}
                  <button
                    onClick={handleNextCard}
                    className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer group"
                    aria-label="Next message"
                  />
                </>
              )}

              {/* ✅ AVATAR NAVIGATION COLUMN - Solo desktop */}
              {aiMessages.length > 1 && (
                <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-4">
                  {aiMessages.map((msg) => {
                    const isActive = msg.id === activeMessageId;
                    
                    // Determina tipo agente
                    const agentType = msg.sender_type === 'human' 
                      ? 'chatgpt' // fallback
                      : msg.sender_type;
                    
                    // Mapping type → avatar
                    const avatarConfig = {
                      chatgpt: { gif: albertGif, static: albertStatic, name: 'Albert' },
                      gemini: { gif: pitagoraGif, static: pitagoraStatic, name: 'Pitagora' },
                      claude: { gif: archimedeGif, static: archimedeStatic, name: 'Archimede' }
                    };
                    
                    const config = avatarConfig[agentType as keyof typeof avatarConfig] || avatarConfig.chatgpt;
                    
                    return (
                      <button
                        key={msg.id}
                        onClick={() => setActiveMessageId(msg.id)}
                        className={cn(
                          "relative w-14 h-14 rounded-full overflow-hidden",
                          "transition-all duration-300 cursor-pointer",
                          "shadow-lg",
                          isActive 
                            ? "scale-110 shadow-white/40" 
                            : "opacity-50 hover:opacity-80 hover:scale-105"
                        )}
                        aria-label={`Go to ${config.name}'s message`}
                        title={config.name}
                      >
                        {/* GIF animata se attivo, frame statico + grayscale se no */}
                        <img 
                          src={isActive ? config.gif : config.static}
                          alt={config.name}
                          className={cn(
                            "w-full h-full object-cover transition-all",
                            !isActive && "grayscale brightness-75"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            
              {/* Message View - Sovrapposto al carousel */}
              {messageViewVisible && currentMessage ? (
                <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[40%] overflow-y-auto bg-gradient-to-t from-background via-background/95 to-transparent p-6 animate-in slide-in-from-bottom-4 duration-200">
                  <RadioMessageView
                    message={currentMessage}
                    onAudioEnd={handleCarouselAudioEnd}
                    onAudioStart={(msgId) => handleAudioStart(msgId)}
                    isAudioEnabled={isAudioEnabled}
                    canAutoPlay={true}
                    showAudioPlayer={false}
                  />
                </div>
              ) : messages.length > 0 && !currentMessage && (
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 text-center text-white/50">
                  Invia un messaggio per iniziare
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages View - Sempre montato, nascosto quando inattivo */}
        <div className={viewMode === 'messages' ? 'block' : 'hidden'}>
          <div className="w-full h-full pt-20 pb-24">
            <RadioMessagesView 
              messages={messages}
              isAutoAdvanceEnabled={isAutoAdvanceEnabled}
              isAudioEnabled={isAudioEnabled}
            />
          </div>
        </div>
        
      </div>

      {/* Input Area - Fixed bottom con altezza definita */}
      {inputVisible && (
        <div className="fixed bottom-[30px] left-0 right-0 h-[200px] z-30 bg-gradient-to-t from-background via-background/80 to-transparent p-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="w-[90%] max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto relative h-full">
            {isSending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-10">
                <div className="text-white">Invio in corso...</div>
              </div>
            )}
            <RadioMessageInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              onClose={() => setInputVisible(false)}
              disabled={isSending}
              className="h-full"
            />
            
            <RadioSendButton
              onSend={handleSend}
              disabled={!inputValue.trim() || isSending}
              visible={inputValue.trim().length > 0}
            />
          </div>
        </div>
      )}

      {/* Debug Popup - Solo in development */}
      {import.meta.env.DEV && debugPopupOpen && (
        <div className="fixed top-[140px] right-4 bg-black/95 text-white text-xs p-4 rounded-lg shadow-lg z-[60] max-w-[250px] border border-white/20">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/20">
            <span className="font-bold text-sm">Debug Info</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugPopupOpen(false)}
              className="h-6 w-6 p-0 hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <div>Mode: {viewMode}</div>
            <div>Active: {activeMessageId?.substring(0, 8) || 'NONE'}</div>
            <div>Current Msg: {currentMessage?.sender_name || 'NONE'}</div>
            <div>Sending: {isSending ? 'YES' : 'NO'}</div>
            <div>Queue: N/A</div>
            <div>Audio: {isAudioPlaying ? 'Playing' : 'Stopped'}</div>
            <div>Playing ID: {currentPlayingId?.substring(0, 8) || 'NONE'}</div>
            <div>Total: {messages.length}</div>
            <div>AI: {aiMessages.length}</div>
            <div>Participants: {participants.filter(p => p.is_active).map(p => p.name).join(', ')}</div>
          </div>
        </div>
      )}

      {/* Fixed container: Audio Player + Controls - Posizionamento dinamico */}
      <div className={cn(
        "fixed left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 transition-all duration-200",
        inputVisible ? "bottom-[-4px]" : "bottom-[78px]"
      )}>
        {/* Audio Player - Carousel mode only */}
        {viewMode === 'carousel' && currentMessage && currentMessage.audio_url && (
          <RadioCarouselAudioPlayerWrapper
            message={currentMessage}
            onAudioEnd={handleCarouselAudioEnd}
            isAudioEnabled={isAudioEnabled}
            className={messageViewVisible ? 'opacity-0 pointer-events-none' : ''}
          />
        )}

        {/* Audio Controls - Always visible when active */}
        {currentConversationId && showAudioControls && (
          <RadioAudioControls
            conversationId={currentConversationId}
            onClose={() => setShowAudioControls(false)}
            participants={participants}
            cachedPrompts={cachedPrompts}
          />
        )}
      </div>

      {/* AI Assistant Sidebar */}
      <AISidebarSlider
        isOpen={aiSidebarOpen}
        onClose={() => setAiSidebarOpen(false)}
        onToggle={() => setAiSidebarOpen(!aiSidebarOpen)}
        enableAudio={true}
        conversationId={currentConversationId}
        hideButton={true}
      />
    </div>
  );
};

export default RadioChat;
