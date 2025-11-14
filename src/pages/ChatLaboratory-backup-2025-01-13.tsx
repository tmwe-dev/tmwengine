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
import { ConversationSummaryPanel } from '@/components/chat-laboratory/ConversationSummaryPanel';
import { LabMainControls } from '@/components/chat-laboratory/LabMainControls';
import { SummaryGenerationButton } from '@/components/chat-laboratory/SummaryGenerationButton';
import { Link } from 'react-router-dom';
import { useSummaryAutoGenerator } from '@/hooks/useSummaryAutoGenerator';
import { ConvergenceIndicator } from '@/components/chat-laboratory/ConvergenceIndicator';
import { IntentBadges } from '@/components/chat-laboratory/IntentBadges';
import { KnowledgeGraphViewer } from '@/components/chat-laboratory/KnowledgeGraphViewer';

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
  
  // Summary States
  const [conversationData, setConversationData] = useState<Conversation | null>(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [convergenceRefreshKey, setConvergenceRefreshKey] = useState(0);
  
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
          async (payload) => {
            console.log('🔔 Real-time update ricevuto:', payload);
            
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
        attachments: Array.isArray(msg.attachments) ? msg.attachments as unknown as UploadedFile[] : [],
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
      // toast({
      //   title: "Errore",
      //   description: "Impossibile creare la conversazione.",
      //   variant: "destructive",
      // });
    }
  };

  const handleSubmit = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    
    // ✅ Previeni invii multipli concorrenti
    if (isSubmitting) {
      console.log('⏸️ Submit già in corso, ignoro richiesta duplicata');
      return;
    }
    
    // ✅ Usa overrideText se fornito (da trascrizione), altrimenti usa prompt
    const currentPrompt = overrideText || prompt.trim();
    if (!currentPrompt) return;

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
      const { error: insertError } = await supabase
        .from('chat_laboratory_messages')
        .insert([{
          conversation_id: conversationId,
          message_sequence: nextSequence,
          intent_tags: [],
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

      // ✅ FASE 1: Single Invocation per Bar Mode
      const activeAIParticipants = participants.filter(p => p.is_active && p.type !== 'human');
      
      if (isBarMode) {
        // ✅ UNA SOLA CHIAMATA per Bar Mode - l'orchestrator decide chi parla
        console.log('🍹 Bar Mode: invocazione singola orchestrator con streaming');
        
        const { data, error } = await supabase.functions.invoke('bar-chat-orchestrator', {
          body: { 
            conversationId,
            userMessage: currentPrompt,
            participants: activeAIParticipants
          }
        });
        
        if (error) {
          console.error('❌ Errore Bar Mode:', error);
        } else {
          console.log('✅ Risposta ricevuta:', data);
          
          // ✅ messageId returned for real-time tracking
          // Real-time subscription will handle progressive updates
          if (data?.messageId) {
            console.log('📝 Messaggio creato con ID:', data.messageId, '- real-time updates attivi');
          }
          
          // ✅ Trigger async audio generation se necessario
          if (data?.audioGenerating && data?.messageId) {
            console.log('🎵 Trigger generazione audio asincrona per messageId:', data.messageId);
            triggerAudioGeneration(data.messageId);
          }
          
          setConvergenceRefreshKey(prev => prev + 1);
        }
      } else {
        // ✅ LOOP PER MODALITÀ TESTUALE (tutti gli agenti rispondono)
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
              // toast({
              //   title: `Errore Agente ${i + 1}`,
              //   description: error.message || 'Impossibile ottenere risposta',
              //   variant: "destructive",
              // });
              break;
            }

            console.log(`✅ Agente ${i + 1} completato:`, data);
            
            // Ricarica messaggi dopo ogni risposta
            await loadMessages(conversationId);
            setConvergenceRefreshKey(prev => prev + 1);
            
            // Piccolo delay per evitare rate limiting
            if (i < activeAIParticipants.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
          } catch (loopError) {
            console.error(`❌ Errore nel loop agente ${i + 1}:`, loopError);
            // toast({
            //   title: "Errore di Comunicazione",
            //   description: "Si è verificato un problema nella catena di risposte",
            //   variant: "destructive",
            // });
            break;
          }
        }
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
            isOpen={sidebarOpen}
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

              {/* Center Controls */}
              <LabMainControls
                currentConversationId={currentConversationId}
                viewMode={viewMode}
                setViewMode={setViewMode}
                participants={participants}
                toggleParticipant={toggleParticipant}
              />

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
                      onTranscriptionComplete={(text) => {
                        if (text.trim()) {
                          handleSubmit({ preventDefault: () => {} } as any, text);
                        }
                      }}
                      isAISpeaking={isAISpeaking}
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
            className="h-full overflow-y-auto p-1.5 md:p-2 space-y-1.5 md:space-y-2"
          >
            <div className="container mx-auto max-w-full">
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
                <LaboratoryPromptManager />
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

          {/* Bar Chat Audio Controls - Inline quando Bar Mode attivo */}
          {isBarMode && (
            <div className="mt-2">
              <BarChatAudioControls
                conversationId={currentConversationId}
                isAISpeaking={isAISpeaking}
                onTranscriptionComplete={async (text) => {
                  console.log('✅ Trascrizione ricevuta:', text);
                  
                  // ✅ Invio diretto passando il testo (no setPrompt asincrono)
                  const fakeEvent = new Event('submit') as any;
                  await handleSubmit(fakeEvent, text);
                  
                  // toast({ title: "✓ Messaggio inviato alla chat" });
                }}
                onInterrupt={async () => {
                  if (currentConversationId) {
                    await supabase
                      .from('chat_laboratory_bar_mode')
                      .update({ interrupt_requested: true })
                      .eq('conversation_id', currentConversationId);
                    
                    setIsAISpeaking(false);
                    // toast({ title: "⛔ AI interrotta" });
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
