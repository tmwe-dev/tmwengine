import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Users, Plus, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SharedEmailAccount {
  id: string;
  email: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface SharedEmailMember {
  id: string;
  user_id: string;
  can_send: boolean;
  can_read: boolean;
  joined_at: string;
  user_profiles?: {
    display_name: string | null;
    tmwe_email: string;
  };
}

export default function SharedEmails() {
  const [sharedAccounts, setSharedAccounts] = useState<SharedEmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SharedEmailAccount | null>(null);
  const [members, setMembers] = useState<SharedEmailMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAccountDialog, setNewAccountDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    email: '',
    display_name: '',
    description: ''
  });

  useEffect(() => {
    checkAdminAndLoadAccounts();
  }, []);

  const checkAdminAndLoadAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Verifica ruolo admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');
    setIsAdmin(hasAdminRole || false);

    await loadSharedAccounts();
  };

  const loadSharedAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shared_email_accounts')
        .select('*')
        .eq('is_active', true)
        .order('email');

      if (error) throw error;
      setSharedAccounts(data || []);
    } catch (error: any) {
      console.error('Error loading shared accounts:', error);
      toast.error('Errore nel caricamento degli account condivisi');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('shared_email_members')
        .select('*')
        .eq('shared_email_id', accountId);

      if (error) throw error;
      
      // Carica i profili utente separatamente
      if (data) {
        const membersWithProfiles = await Promise.all(
          data.map(async (member) => {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('display_name, tmwe_email')
              .eq('user_id', member.user_id)
              .single();
            
            return {
              ...member,
              user_profiles: profile || { display_name: 'Unknown', tmwe_email: '' }
            };
          })
        );
        setMembers(membersWithProfiles as any);
      }
    } catch (error: any) {
      console.error('Error loading members:', error);
      toast.error('Errore nel caricamento dei membri');
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccount.email || !newAccount.display_name) {
      toast.error('Email e nome visualizzato sono obbligatori');
      return;
    }

    try {
      const { error } = await supabase
        .from('shared_email_accounts')
        .insert({
          email: newAccount.email,
          display_name: newAccount.display_name,
          description: newAccount.description || null
        });

      if (error) throw error;

      toast.success('Account condiviso creato con successo');
      setNewAccountDialog(false);
      setNewAccount({ email: '', display_name: '', description: '' });
      loadSharedAccounts();
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error('Errore nella creazione dell\'account');
    }
  };

  const handleAddMember = async (accountId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('shared_email_members')
        .insert({
          shared_email_id: accountId,
          user_id: userId,
          can_send: true,
          can_read: true
        });

      if (error) throw error;

      toast.success('Membro aggiunto con successo');
      loadMembers(accountId);
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error('Errore nell\'aggiunta del membro');
    }
  };

  const handleRemoveMember = async (memberId: string, accountId: string) => {
    try {
      const { error } = await supabase
        .from('shared_email_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Membro rimosso con successo');
      loadMembers(accountId);
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Errore nella rimozione del membro');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Caricamento email aziendali...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Aziendali Condivise</h1>
          <p className="text-muted-foreground">
            Gestisci gli account email condivisi accessibili a più dipendenti
          </p>
        </div>
        {isAdmin && (
          <Dialog open={newAccountDialog} onOpenChange={setNewAccountDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuovo Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Account Condiviso</DialogTitle>
                <DialogDescription>
                  Aggiungi un nuovo indirizzo email aziendale condiviso
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Indirizzo Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="booking@tmwe.it"
                    value={newAccount.email}
                    onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Nome Visualizzato *</Label>
                  <Input
                    id="display_name"
                    placeholder="Booking TMWE"
                    value={newAccount.display_name}
                    onChange={(e) => setNewAccount({ ...newAccount, display_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    placeholder="Email per prenotazioni e preventivi"
                    value={newAccount.description}
                    onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateAccount} className="w-full">
                  Crea Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sharedAccounts.map((account) => (
          <Card
            key={account.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => {
              setSelectedAccount(account);
              loadMembers(account.id);
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{account.display_name}</CardTitle>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-mono text-muted-foreground">{account.email}</p>
              {account.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {account.description}
                </p>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Membri con accesso
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sharedAccounts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nessun account condiviso</h3>
            <p className="text-muted-foreground mb-4">
              Gli account email condivisi permettono a più utenti di accedere alla stessa casella di posta
            </p>
            {isAdmin && (
              <Button onClick={() => setNewAccountDialog(true)}>
                Crea il primo account condiviso
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog per gestire membri */}
      <Dialog open={selectedAccount !== null} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {selectedAccount?.display_name}
            </DialogTitle>
            <DialogDescription>
              {selectedAccount?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Membri con Accesso</h3>
              {isAdmin && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun membro con accesso a questo account
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {member.user_profiles?.display_name || 'Utente'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.user_profiles?.tmwe_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.can_read && (
                            <Badge variant="secondary">Lettura</Badge>
                          )}
                          {member.can_send && (
                            <Badge variant="secondary">Invio</Badge>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id, selectedAccount!.id)}
                            >
                              Rimuovi
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
