import { useState, useEffect } from 'react';
import { Menu, LayoutGrid, MessageSquare, ChevronLeft, ChevronRight, Bug, X, Keyboard, FileText } from 'lucide-react';
import { RadioSidebar } from '@/components/radio-chat/RadioSidebar';
import { RadioMessageInput } from '@/components/radio-chat/RadioMessageInput';
import { RadioSendButton } from '@/components/radio-chat/RadioSendButton';
import { RadioMessageView } from '@/components/radio-chat/RadioMessageView';
import { RadioCarousel3D } from '@/components/radio-chat/RadioCarousel3D';
import { RadioParticipantSelector } from '@/components/radio-chat/RadioParticipantSelector';
import { RadioSidebarTrigger } from '@/components/radio-chat/RadioSidebarTrigger';
import { RadioParticipantIcon } from '@/components/radio-chat/RadioParticipantIcon';
import { RadioMessagesView } from '@/components/radio-chat/RadioMessagesView';
import { RadioCarouselAudioPlayerWrapper } from '@/components/radio-chat/RadioCarouselAudioPlayerWrapper';
import { useRadioAudioPlayback } from '@/hooks/useRadioAudioPlayback';
import { useAudioPreference } from '@/hooks/useAudioPreference';
import { RadioMessage } from '@/types/radio';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface RadioParticipant {
  id: string;
  type: 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
}

const RadioChat = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [messageViewVisible, setMessageViewVisible] = useState(false);
  const [messages, setMessages] = useState<RadioMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'carousel' | 'messages'>('carousel');
  const [participants, setParticipants] = useState<RadioParticipant[]>([
    { id: 'chatgpt-1', type: 'chatgpt', name: 'ChatGPT', is_active: true },
    { id: 'gemini-1', type: 'gemini', name: 'Gemini', is_active: true },
    { id: 'claude-1', type: 'claude', name: 'Claude', is_active: true }
  ]);
  
  const [isAutoAdvanceEnabled, setIsAutoAdvanceEnabled] = useState(true);
  const [debugPopupOpen, setDebugPopupOpen] = useState(false);
  
  const { toast } = useToast();
  
  // Hooks audio dedicati per Radio Chat
  // Hooks audio dedicati per Radio Chat
  const { 
    isAudioPlaying, 
    currentPlayingId,
    canPlayAudio,
    handleAudioStart, 
    handleAudioEnd
  } = useRadioAudioPlayback();
  
  const { isAudioEnabled } = useAudioPreference();
  
  // Calculate AI messages
  const aiMessages = messages.filter(m => m.sender_type !== 'human');
  
  // Simple state for carousel navigation (only used in carousel mode)
  const [activeMessageId, setActiveMessageId] = useState<string>('');
  
  // Auto-set first AI message as active for carousel
  useEffect(() => {
    if (aiMessages.length > 0 && !activeMessageId) {
      setActiveMessageId(aiMessages[0].id);
    }
  }, [aiMessages.length, activeMessageId]);
  
  const currentMessage = messages.find(m => m.id === activeMessageId) || null;
  

  // Handler for carousel audio end with auto-advance (replica Chat Laboratory)
  const handleCarouselAudioEnd = () => {
    if (!isAutoAdvanceEnabled) return;
    
    handleAudioEnd(); // Stop audio
    
    const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    
    if (currentIndex !== -1 && currentIndex < aiMessages.length - 1) {
      const nextMessage = aiMessages[currentIndex + 1];
      console.log('➡️ [RadioChat] Advancing to:', nextMessage.sender_name);
      setActiveMessageId(nextMessage.id); // ✅ CAMBIO IMMEDIATO
    }
  };

  // Navigazione manuale per carousel
  const handlePrevCard = () => {
    if (aiMessages.length === 0) return;
    const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    const newIndex = (currentIndex - 1 + aiMessages.length) % aiMessages.length;
    setActiveMessageId(aiMessages[newIndex].id);
  };
  
  const handleNextCard = () => {
    if (aiMessages.length === 0) return;
    const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    const newIndex = (currentIndex + 1) % aiMessages.length;
    setActiveMessageId(aiMessages[newIndex].id);
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
      
      // 3. Call orchestrator with correct format
      const activeParticipants = participants
        .filter(p => p.is_active)
        .map(p => ({
          id: p.id,
          type: p.type,
          name: p.name,
          is_active: true
        }));
      
      console.log('🎯 Calling radio-chat-orchestrator with participants:', activeParticipants);
      
      // Create orchestrator promise with timeout
      const orchestratorPromise = supabase.functions.invoke('radio-chat-orchestrator', {
        body: {
          conversationId: convId,
          userMessage: messageToSend,
          participants: activeParticipants
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: AI non risponde')), 30000)
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
    } finally {
      console.log('🔄 Finally block: resetting isSending');
      setIsSending(false);
    }
  };

  const handleToggleParticipant = (id: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, is_active: !p.is_active } : p
    ));
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
          
          // Verifica se audio_url è effettivamente cambiato
          setMessages(prev => {
            const existingMsg = prev.find(m => m.id === updatedMsg.id);
            
            if (existingMsg?.audio_url === updatedMsg.audio_url) {
              console.log('⏭️ [RadioChat] Audio URL non cambiato, skip update');
              return prev; // Nessun cambio = nessun re-render
            }
            
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

  return (
    <div className="relative h-full">
      <RadioSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        conversationId={currentConversationId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isAutoAdvanceEnabled={isAutoAdvanceEnabled}
        onAutoAdvanceChange={setIsAutoAdvanceEnabled}
        participants={participants}
        onToggleParticipant={handleToggleParticipant}
      />

      {/* Debug Icon - Above Toggle Buttons (Solo in development) */}
      {import.meta.env.DEV && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDebugPopupOpen(!debugPopupOpen)}
          className="fixed left-4 top-24 z-35"
        >
          <Bug className="w-4 h-4" />
        </Button>
      )}

      {/* Hamburger Sidebar - Bottom Left */}
      <RadioSidebarTrigger
        className="fixed left-0 bottom-8 z-40"
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(true)}
      />

      {/* FileText Icon - Below Keyboard */}
      <button
        onClick={() => setMessageViewVisible(!messageViewVisible)}
        className="fixed left-0 bottom-64 z-40 w-12 h-20 bg-transparent rounded-r-lg border border-white/20 flex items-center justify-center transition-all duration-200 hover:bg-white/5"
        aria-label="Toggle message view"
      >
        <FileText 
          className={`w-6 h-6 transition-colors ${
            messageViewVisible ? 'text-gray-500' : (currentMessage ? 'text-cyan-400' : 'text-gray-500')
          }`}
          strokeWidth={1}
        />
      </button>

      {/* Keyboard Icon - Above Hamburger */}
      <button
        onClick={() => setInputVisible(!inputVisible)}
        className="fixed left-0 bottom-36 z-40 w-12 h-20 bg-black rounded-r-lg flex items-center justify-center transition-all duration-200 hover:w-14"
        aria-label="Toggle input"
      >
        <Keyboard 
          className={`w-6 h-6 transition-colors ${
            inputVisible ? 'text-purple-400' : 'text-gray-500'
          }`} 
        />
      </button>

      {/* Main Content Area */}
      <div className="pt-0 pb-[200px]">
        {viewMode === 'carousel' ? (
          <>
            <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] md:min-h-[700px] lg:min-h-[850px]">
            {/* Carousel Container - Flex 1 */}
            <div className="relative flex-1 min-h-0 overflow-visible">
              <div className="absolute inset-0 z-10">
                <RadioCarousel3D 
                  messages={messages}
                  activeMessageId={activeMessageId}
                />
              </div>
            
            {/* Navigation Buttons */}
            {aiMessages.length > 1 && (
              <>
                <button
                  onClick={handlePrevCard}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
                  aria-label="Previous message"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={handleNextCard}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
                  aria-label="Next message"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
            
            {/* Indicator Dots - Below Right Arrow */}
            {aiMessages.length > 1 && (
              <div className="absolute right-4 top-[calc(50%+60px)] z-35 flex flex-col gap-2">
                {aiMessages.map((msg, idx) => (
                  <button
                    key={msg.id}
                    onClick={() => setActiveMessageId(msg.id)}
                    className={`h-3 w-3 rounded-full transition-all cursor-pointer ${
                      msg.id === activeMessageId
                        ? 'bg-white scale-125' 
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to message ${idx + 1}`}
                  />
                ))}
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
                    canAutoPlay={canPlayAudio(currentMessage.id)}
                    showAudioPlayer={true}
                  />
                </div>
              ) : messages.length > 0 && !currentMessage && (
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 text-center text-white/50">
                  Invia un messaggio per iniziare
                </div>
              )}
            </div>
          </div>
          </>
        ) : (
          (() => {
            console.log('🔊 [RadioChat] Audio settings:', {
              isAudioEnabled,
              isAutoAdvanceEnabled,
              totalMessages: messages.length
            });
            return null;
          })(),
          /* Messages View - Full overlay con background */
          <div className="w-full h-full pt-20 pb-24">
            <RadioMessagesView 
              messages={messages}
              isAutoAdvanceEnabled={isAutoAdvanceEnabled}
              isAudioEnabled={isAudioEnabled}
            />
          </div>
        )}
      </div>

      {/* Input Area - Fixed bottom con altezza definita */}
      {inputVisible && (
        <div className="fixed bottom-0 left-0 right-0 h-[200px] z-30 bg-gradient-to-t from-background via-background/80 to-transparent p-4 animate-in slide-in-from-bottom-4 duration-200">
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

      {/* Audio Player - Completely independent fixed element */}
      {viewMode === 'carousel' && currentMessage && (
        <RadioCarouselAudioPlayerWrapper
          message={currentMessage}
          onAudioEnd={handleCarouselAudioEnd}
          className={messageViewVisible ? 'opacity-0 pointer-events-none' : ''}
        />
      )}
    </div>
  );
};

export default RadioChat;
