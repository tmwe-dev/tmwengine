import { useState, useEffect } from 'react';
import { Menu, LayoutGrid, MessageSquare } from 'lucide-react';
import { RadioSidebar } from '@/components/radio-chat/RadioSidebar';
import { RadioMessageInput } from '@/components/radio-chat/RadioMessageInput';
import { RadioSendButton } from '@/components/radio-chat/RadioSendButton';
import { RadioMessageView } from '@/components/radio-chat/RadioMessageView';
import { RadioCarousel3D } from '@/components/radio-chat/RadioCarousel3D';
import { RadioParticipantSelector } from '@/components/radio-chat/RadioParticipantSelector';
import { RadioMessagesView } from '@/components/radio-chat/RadioMessagesView';
import { useRadioMessages } from '@/hooks/useRadioMessages';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
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
  const [messages, setMessages] = useState<RadioMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'carousel' | 'messages'>('carousel');
  const [participants, setParticipants] = useState<RadioParticipant[]>([
    { id: 'chatgpt-1', type: 'chatgpt', name: 'ChatGPT', is_active: true },
    { id: 'gemini-1', type: 'gemini', name: 'Gemini', is_active: true },
    { id: 'claude-1', type: 'claude', name: 'Claude', is_active: true }
  ]);
  const [navIndex, setNavIndex] = useState(0);
  
  const { toast } = useToast();
  
  const { isAudioPlaying, handleAudioStart, handleAudioEnd: audioEnd } = useAudioPlayback();
  
  const {
    activeMessageId,
    currentMessage,
    handleAudioEnd: messageSwitch,
    unseenMessagesQueue
  } = useRadioMessages({
    messages,
    isAudioPlaying
  });
  
  const onAudioEndComplete = () => {
    audioEnd();
    setTimeout(() => messageSwitch(), 50);
  };

  const handleCarouselRotationComplete = () => {
    setTimeout(() => handleAudioStart(), 200);
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
      
      // 3. Call orchestrator
      const activeParticipants = participants
        .filter(p => p.is_active)
        .map(p => ({
          id: p.id,
          type: p.type,
          name: p.name,
          is_active: true
        }));
      
      console.log('🎯 Calling orchestrator with participants:', activeParticipants);
      
      const { data, error } = await supabase.functions.invoke('radio-chat-orchestrator', {
        body: {
          conversationId: convId,
          userMessage: messageToSend,
          participants: activeParticipants
        }
      });
      
      if (error) {
        console.error('❌ Errore orchestrator:', error);
        toast({
          title: 'Errore AI',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleParticipant = (id: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, is_active: !p.is_active } : p
    ));
  };

  const handleVoiceInput = (transcription: string) => {
    console.log('🎤 Voice input received:', transcription);
    setInputValue(transcription);
    setSidebarOpen(false);
  };

  const handlePrevMessage = () => {
    const aiMessages = messages.filter(m => m.sender_type !== 'human');
    if (aiMessages.length === 0) return;
    const currentIdx = aiMessages.findIndex(m => m.id === activeMessageId);
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : aiMessages.length - 1;
    setNavIndex(prevIdx);
  };

  const handleNextMessage = () => {
    const aiMessages = messages.filter(m => m.sender_type !== 'human');
    if (aiMessages.length === 0) return;
    const currentIdx = aiMessages.findIndex(m => m.id === activeMessageId);
    const nextIdx = (currentIdx + 1) % aiMessages.length;
    setNavIndex(nextIdx);
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
          
          setMessages(prev => [...prev, typedMessage]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversationId]);

  return (
    <div className="min-h-screen relative">
      {/* Header - Fixed with proper height */}
      <div className="fixed top-14 left-0 right-0 h-[70px] z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Participant Selector */}
          <RadioParticipantSelector
            participants={participants}
            onToggle={handleToggleParticipant}
            className="flex-1 justify-center"
          />
          
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'carousel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('carousel')}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Carousel
            </Button>
            <Button
              variant={viewMode === 'messages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('messages')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </Button>
          </div>
        </div>
      </div>

      <RadioSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        conversationId={currentConversationId}
        onVoiceInput={handleVoiceInput}
      />

      {/* Main Content Area - Spazio centrale calcolato */}
      <div className="pt-[calc(56px+70px)] pb-[200px] border-2 border-purple-500">
        {viewMode === 'carousel' ? (
          <div className="relative h-[calc(100vh-56px-70px-200px)] min-h-[400px] flex flex-col border-2 border-orange-500">
            {/* Carousel Container */}
            <div className="flex-1 border-2 border-green-500">
              <RadioCarousel3D 
                messages={messages}
                activeMessageId={activeMessageId}
                onRotationComplete={handleCarouselRotationComplete}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-4 py-3 border-t bg-muted/20 border-2 border-yellow-500">
              <button
                onClick={handlePrevMessage}
                className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                {navIndex + 1} / {messages.filter(m => m.sender_type !== 'human').length || 0}
              </span>
              <button
                onClick={handleNextMessage}
                className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next
              </button>
            </div>
            
            {/* Message View - Sovrapposto al carousel */}
            {currentMessage ? (
              <div className="max-h-[40%] overflow-y-auto bg-gradient-to-t from-background via-background/95 to-transparent p-6 border-2 border-blue-500">
                <RadioMessageView
                  message={currentMessage}
                  onAudioEnd={onAudioEndComplete}
                  onAudioStart={handleAudioStart}
                />
              </div>
            ) : messages.length > 0 && (
              <div className="p-6 text-center text-white/50 border-2 border-red-500">
                Seleziona un messaggio dal carousel
              </div>
            )}
          </div>
        ) : (
          /* Messages View */
          <RadioMessagesView messages={messages} />
        )}
      </div>

      {/* Input Area - Fixed bottom con altezza definita */}
      <div className="fixed bottom-0 left-0 right-0 h-[200px] z-30 bg-gradient-to-t from-background via-background/80 to-transparent p-4">
        <div className="w-full max-w-2xl mx-auto relative h-full">
          {isSending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-10">
              <div className="text-white">Invio in corso...</div>
            </div>
          )}
          <RadioMessageInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
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

      {/* Debug Info - Solo in development */}
      {import.meta.env.DEV && (
        <div className="fixed top-[140px] right-4 bg-black/90 text-white text-xs p-3 rounded z-[60] max-w-[200px]">
          <div>Mode: {viewMode}</div>
          <div>Conv ID: {currentConversationId?.substring(0, 8)}</div>
          <div>Active: {activeMessageId.substring(0, 8)}</div>
          <div>Current Msg: {currentMessage?.sender_name || 'NONE'}</div>
          <div>Sending: {isSending ? 'YES' : 'NO'}</div>
          <div>Queue: {unseenMessagesQueue.length}</div>
          <div>Audio: {isAudioPlaying ? 'Playing' : 'Stopped'}</div>
          <div>Total: {messages.length}</div>
          <div>AI: {messages.filter(m => m.sender_type !== 'human').length}</div>
          <div>Nav Index: {navIndex}</div>
          <div>Participants: {participants.filter(p => p.is_active).map(p => p.name).join(', ')}</div>
        </div>
      )}
    </div>
  );
};

export default RadioChat;
