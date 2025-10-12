import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { TranslateButton } from './TranslateButton';
import { SpeakButton } from './SpeakButton';
import { useAutoSpeaker } from '@/hooks/useAutoSpeaker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRoomAISettings } from '@/hooks/useRoomAISettings';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  user_id: string | null;
  created_at: string;
  message_type: string;
  attachment_url?: string;
  is_system_message?: boolean;
}

interface UserProfile {
  display_name: string;
  preferred_language: string;
}

interface ChatMessagesProps {
  roomId: string;
  isLayoutInverted?: boolean;
  shouldHideHeader?: boolean;
}

export const ChatMessages = ({ roomId, isLayoutInverted = false, shouldHideHeader = false }: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [messageTokens, setMessageTokens] = useState<Record<string, { input: number; output: number; total: number }>>({});
  const [showSummariesOnly, setShowSummariesOnly] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useUserProfile();
  const { settings } = useRoomAISettings(roomId);
  
  // Auto-speaker per lettura automatica messaggi
  const { stopSpeaking, isSpeaking } = useAutoSpeaker({ messages, currentUserId });

  // Load show_summaries_only setting from room
  useEffect(() => {
    const loadShowSummaries = async () => {
      const { data } = await supabase
        .from('intranet_rooms')
        .select('show_summaries_only')
        .eq('id', roomId)
        .single();
      
      if (data) {
        setShowSummariesOnly(data.show_summaries_only ?? true);
      }
    };
    
    loadShowSummaries();
  }, [roomId]);

  useEffect(() => {
    // Salva l'ID della stanza corrente nel sessionStorage per il TranslateButton
    sessionStorage.setItem('current_room_id', roomId);
  }, [roomId]);

  useEffect(() => {
    if (!isLayoutInverted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLayoutInverted]);

  useEffect(() => {
    loadMessages();
    getCurrentUser();

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'intranet_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  useEffect(() => {
    // Cleanup: ferma la lettura quando il componente viene smontato
    return () => {
      stopSpeaking();
    };
  }, []);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('intranet_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data && !error) {
      setMessages(data);
      
      // Carica i profili utente (escludi messaggi di sistema)
      const userIds = [...new Set(data.filter(m => m.user_id).map(m => m.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, preferred_language')
          .in('user_id', userIds);
        
        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => {
            profileMap[p.user_id] = {
              display_name: p.display_name || 'User',
              preferred_language: p.preferred_language || 'it'
            };
          });
          setUserProfiles(profileMap);
        }
      }
    }
  };

  const getLanguageFlag = (languageCode: string): string => {
    const flags: Record<string, string> = {
      'it': '🇮🇹',
      'en': '🇬🇧',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ar': '🇸🇦'
    };
    return flags[languageCode] || '🌐';
  };

  const getUserDisplayInfo = (userId: string | null, isSystemMessage?: boolean) => {
    if (isSystemMessage) {
      return {
        name: '🤖 Albert AI',
        flag: ''
      };
    }
    
    if (!userId) {
      return {
        name: 'User',
        flag: ''
      };
    }
    
    const profile = userProfiles[userId];
    return {
      name: profile?.display_name || 'User',
      flag: getLanguageFlag(profile?.preferred_language || 'it')
    };
  };

  // Traduzione automatica dei messaggi quando necessario
  useEffect(() => {
    if (!profile || !settings?.enableTranslation || profile.translationMode === 'none') return;
    
    const autoTranslateModes = ['read_only', 'both', 'dual_view'];
    if (!autoTranslateModes.includes(profile.translationMode)) return;

    messages.forEach(async (message) => {
      // Non tradurre i propri messaggi o messaggi già tradotti
      if (message.user_id === currentUserId || translatedMessages[message.id]) return;
      
      const sourceLanguage = message.user_id ? userProfiles[message.user_id]?.preferred_language : undefined;
      
      // Solo se lingua diversa dalla propria
      if (sourceLanguage && sourceLanguage !== profile.readingLanguage && message.content) {
        try {
          const { data, error } = await supabase.functions.invoke('intranet-ai-processor', {
            body: {
              roomId,
              messageContent: message.content,
              sourceLanguage,
              targetLanguage: profile.readingLanguage,
              action: 'translate',
              userId: currentUserId
            }
          });

          if (!error && data?.translatedText) {
            setTranslatedMessages(prev => ({
              ...prev,
              [message.id]: data.translatedText
            }));
            
            // Salva i token ricevuti
            if (data.tokens) {
              setMessageTokens(prev => ({
                ...prev,
                [message.id]: data.tokens
              }));
            }
          }
        } catch (error) {
          console.error('Auto-translation error:', error);
        }
      }
    });
  }, [messages, profile, settings, currentUserId, userProfiles]);

  const displayMessages = isLayoutInverted ? [...messages].reverse() : messages;

  return (
    <>
      {displayMessages.map((message) => {
        const isOwnMessage = message.user_id === currentUserId;
        return (
          <div
            key={message.id}
            className={`flex gap-3 ${shouldHideHeader ? 'mb-3' : ''} ${isOwnMessage ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''} flex-1`}>
              <div
                className={`rounded-lg px-4 py-2 border ${
                  isOwnMessage
                    ? 'bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent border-purple-500/20'
                    : 'bg-gradient-to-l from-orange-500/10 via-orange-500/5 via-35% to-transparent border-orange-500/20'
                }`}
              >
                {message.message_type === 'image' && message.attachment_url && (
                  <img 
                    src={message.attachment_url} 
                    alt="Image" 
                    className="w-full rounded-lg mb-2 cursor-pointer"
                    onClick={() => window.open(message.attachment_url, '_blank')}
                  />
                )}
                
                {message.message_type === 'audio' && message.attachment_url && (
                  <audio 
                    controls 
                    className="w-full mb-2"
                    src={message.attachment_url}
                  />
                )}
                
                {message.message_type === 'file' && message.attachment_url && (
                  <a 
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mb-2 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Scarica file</span>
                    <Download className="h-3 w-3" />
                  </a>
                )}
                
                {message.content && (
                  <>
                    {/* Mostra traduzione per modalità read_only o both se disponibile */}
                    {(profile?.translationMode === 'read_only' || profile?.translationMode === 'both') && 
                     translatedMessages[message.id] && 
                     !isOwnMessage ? (
                      <p className="text-sm whitespace-pre-wrap break-words">{translatedMessages[message.id]}</p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    
                    {/* Mostra traduzione automatica se disponibile e modalità dual_view */}
                    {translatedMessages[message.id] && profile?.translationMode === 'dual_view' && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-sm border-l-2 border-primary/50">
                        <p className="text-xs text-muted-foreground mb-1">
                          🌐 {profile.readingLanguage}:
                        </p>
                        <p className="whitespace-pre-wrap break-words">{translatedMessages[message.id]}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-1 flex-wrap mt-1 items-center justify-between">
                      <div className="flex gap-1">
                        {/* Pulsante solo per modalità none */}
                        {profile?.translationMode === 'none' && (
                          <TranslateButton
                            messageContent={message.content}
                            messageId={message.id}
                            sourceLanguage={message.user_id ? userProfiles[message.user_id]?.preferred_language : undefined}
                            roomId={roomId}
                          />
                        )}
                        {!isOwnMessage && profile && (
                          <SpeakButton 
                            text={translatedMessages[message.id] || message.content}
                            language={profile.readingLanguage}
                          />
                        )}
                      </div>
                      
                      {/* Mostra token in basso a destra */}
                      {messageTokens[message.id] && (
                        <span className="text-xs text-muted-foreground/60 ml-auto">
                          {messageTokens[message.id].total} tokens
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-1 flex gap-2 items-center justify-end">
                <span>{format(new Date(message.created_at), 'dd/MM HH:mm', { locale: it })}</span>
                <span>•</span>
                <span>{getUserDisplayInfo(message.user_id, message.is_system_message).name}</span>
                <span>{getUserDisplayInfo(message.user_id, message.is_system_message).flag}</span>
              </span>
            </div>
          </div>
        );
      })}
      {!isLayoutInverted && <div ref={messagesEndRef} />}
      <div ref={messagesEndRef} />
    </>
  );
};