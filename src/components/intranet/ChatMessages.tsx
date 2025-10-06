import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
