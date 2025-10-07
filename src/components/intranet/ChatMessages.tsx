import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { TranslateButton } from './TranslateButton';
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

interface ChatMessagesProps {
  roomId: string;
}

export const ChatMessages = ({ roomId }: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
        setTimeout(() => scrollToBottom(), 100);
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

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('intranet_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data && !error) {
      setMessages(data);
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getUserInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase();
  };

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.user_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className={isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                  {getUserInitials(message.user_id)}
                </AvatarFallback>
              </Avatar>
              <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''} max-w-[70%]`}>
                <div
                  className={`rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.message_type === 'image' && message.attachment_url && (
                    <img 
                      src={message.attachment_url} 
                      alt="Image" 
                      className="max-w-xs rounded-lg mb-2 cursor-pointer"
                      onClick={() => window.open(message.attachment_url, '_blank')}
                    />
                  )}
                  
                  {message.message_type === 'audio' && message.attachment_url && (
                    <audio 
                      controls 
                      className="max-w-xs mb-2"
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
                      <TranslateButton 
                        messageContent={message.content}
                        messageId={message.id}
                      />
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {format(new Date(message.created_at), 'HH:mm', { locale: it })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
};
