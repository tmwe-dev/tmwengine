import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Mail, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminEmails() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Query per tutti gli utenti con conteggio email
  const { data: usersWithEmails } = useQuery({
    queryKey: ['admin-users-emails'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_email_counts');
      if (error) throw error;
      return data || [];
    }
  });

  // Query per email dell'utente selezionato
  const { data: emails, isLoading: emailsLoading } = useQuery({
    queryKey: ['admin-emails', selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];
      
      // Usa query normale - le RLS policies admin permetteranno l'accesso
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('user_email', selectedUser)
        .order('data_ricezione', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUser
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="h-8 w-8 text-red-500" />
        <h1 className="text-3xl font-bold">Admin - Gestione Email Tutti gli Utenti</h1>
        <Badge variant="destructive" className="text-sm">ADMIN ONLY</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar utenti */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Utenti ({usersWithEmails?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {usersWithEmails?.map((user: any) => (
                  <div
                    key={user.email}
                    onClick={() => setSelectedUser(user.email)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all hover:bg-accent border",
                      selectedUser === user.email && "bg-accent border-primary"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="text-sm truncate">{user.email}</span>
                      </div>
                      <Badge variant="secondary" className="shrink-0 ml-2">
                        {user.count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Lista email */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {selectedUser ? (
                <>
                  Email di {selectedUser}
                  <Badge className="ml-2">{emails?.length || 0}</Badge>
                </>
              ) : (
                'Seleziona un utente'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <ScrollArea className="h-[600px]">
                {emailsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : emails && emails.length > 0 ? (
                  <div className="space-y-3">
                    {emails.map((email: any) => (
                      <div 
                        key={email.id} 
                        className="p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {email.subject || 'Senza oggetto'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              Da: {email.from_email}
                            </p>
                            {email.to_email && (
                              <p className="text-sm text-muted-foreground truncate">
                                A: {email.to_email}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {email.cartella || 'INBOX'}
                              </Badge>
                              <Badge 
                                variant={email.direzione === 'in' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {email.direzione === 'in' ? 'Ricevuta' : 'Inviata'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(email.data_ricezione).toLocaleDateString('it-IT')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(email.data_ricezione).toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna email trovata per questo utente</p>
                  </div>
                )}
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Seleziona un utente dalla lista per vedere le sue email</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
