import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoomSelector } from '@/components/intranet/RoomSelector';
import { ChatMessages } from '@/components/intranet/ChatMessages';
import { MessageInput } from '@/components/intranet/MessageInput';
import { useIntranetPresence } from '@/hooks/useIntranetPresence';
import { supabase } from '@/integrations/supabase/client';
import { Users, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const Intranet = () => {
  const navigate = useNavigate();
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string>('');
  const { onlineUsers } = useIntranetPresence(selectedRoomId || '');

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/intranet-auth');
      } else {
        setUserEmail(session.user.email || '');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/intranet-auth');
      } else {
        setUserEmail(session.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout effettuato con successo');
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast.error('Errore durante il logout: ' + error.message);
    }
  };

  return (
    <div className="container mx-auto p-4 h-screen flex gap-4">
      {/* Sidebar con lista stanze */}
      <div className="w-80 flex-shrink-0">
        <Card className="h-full">
          <div className="p-4">
            <RoomSelector
              onRoomSelect={setSelectedRoomId}
              selectedRoomId={selectedRoomId}
            />
          </div>
        </Card>
      </div>

      {/* Area chat principale */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          {selectedRoomId ? (
            <>
              {/* Header con utenti online */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold">Chat Intranet</h1>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {onlineUsers.length} online
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messaggi */}
              <ChatMessages roomId={selectedRoomId} />

              {/* Input messaggio */}
              <MessageInput roomId={selectedRoomId} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Seleziona una stanza per iniziare a chattare</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Intranet;
