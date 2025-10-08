import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { TranslateButton } from './TranslateButton';
import { SpeakButton } from './SpeakButton';
import { useAutoSpeaker } from '@/hooks/useAutoSpeaker';
import { useUserProfile } from '@/hooks/useUserProfile';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  message_type: string;
  attachment_url?: string;
}

interface UserProfile {
  display_name: string;
  preferred_language: string;
}

interface ChatMessagesProps {
  roomId: string;
  isLayoutInverted?: boolean;
}

export const ChatMessages = ({ roomId, isLayoutInverted = false }: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const { profile } = useUserProfile();
  
  // Auto-speaker per lettura automatica messaggi
  const { stopSpeaking } = useAutoSpeaker({ messages, currentUserId });

  useEffect(() => {
    // Salva l'ID della stanza corrente nel sessionStorage per il TranslateButton
    sessionStorage.setItem('current_room_id', roomId);
  }, [roomId]);

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
        if (!isLayoutInverted) {
          setTimeout(() => scrollToBottom(), 100);
        }
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
      
      // Carica i profili utente
      const userIds = [...new Set(data.map(m => m.user_id))];
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
      
      if (!isLayoutInverted) {
        setTimeout(() => scrollToBottom(), 100);
      }
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current && !isLayoutInverted) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
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

  const getUserDisplayInfo = (userId: string) => {
    const profile = userProfiles[userId];
    return {
      name: profile?.display_name || 'User',
      flag: getLanguageFlag(profile?.preferred_language || 'it')
    };
  };

  return (
    <CardContent className={`flex-1 px-3 min-h-0 overflow-y-auto`}>
      <div className={isLayoutInverted ? 'flex flex-col-reverse space-y-reverse' : ''}>
        {messages.map((message) => {
          const isOwnMessage = message.user_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''} flex-1`}>
                <div
                  className={`rounded-lg px-4 border ${
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
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        <TranslateButton 
                          messageContent={message.content}
                          messageId={message.id}
                        />
                        {!isOwnMessage && profile && (
                          <SpeakButton 
                            text={message.content}
                            language={profile.readingLanguage}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-1 flex gap-2 items-center justify-end">
                  <span>{format(new Date(message.created_at), 'dd/MM HH:mm', { locale: it })}</span>
                  <span>•</span>
                  <span>{getUserDisplayInfo(message.user_id).name}</span>
                  <span>{getUserDisplayInfo(message.user_id).flag}</span>
                </span>
              </div>
            </div>
          );
        })}
        {!isLayoutInverted && <div ref={scrollRef} />}
      </div>
    </CardContent>
  );
};
