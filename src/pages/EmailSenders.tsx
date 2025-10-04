import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Mail, Users, Tag, TrendingUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SenderStats {
  sender: string;
  count: number;
  group?: {
    id: string;
    name: string;
    color: string;
  };
  action?: {
    type: string;
    params: any;
  };
}

export default function EmailSenders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'sender' | 'count' | 'group'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const queryClient = useQueryClient();

  // Fetch sender statistics
  const { data: senderStats, isLoading: loadingStats } = useQuery({
    queryKey: ['sender-stats', searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      // Leggi tutte le email dal backup in Supabase
      const { data: emails, error } = await supabase
        .from('email_messages')
        .select('from_email');

      if (error) throw error;

      // Conta i mittenti
      const counts: Record<string, number> = {};
      emails?.forEach(email => {
        const sender = email.from_email;
        counts[sender] = (counts[sender] || 0) + 1;
      });

      // Get groups for each sender
      const { data: rules } = await supabase
        .from('email_sender_rules')
        .select('sender_email, group_id, email_sender_groups(id, nome_gruppo, colore)');

      // Get actions for each sender
      const { data: actions } = await supabase
        .from('email_sender_actions')
        .select('sender_email, action_type, action_params');

      const senderGroups: Record<string, any> = {};
      rules?.forEach(rule => {
        if (rule.email_sender_groups) {
          senderGroups[rule.sender_email] = {
            id: rule.group_id,
            name: (rule.email_sender_groups as any).nome_gruppo,
            color: (rule.email_sender_groups as any).colore,
          };
        }
      });

      const senderActions: Record<string, any> = {};
      actions?.forEach(action => {
        senderActions[action.sender_email] = {
          type: action.action_type,
          params: action.action_params,
        };
      });

      // Combina i dati e filtra per ricerca
      let stats: SenderStats[] = Object.entries(counts)
        .map(([sender, count]) => ({
          sender,
          count,
          group: senderGroups[sender],
          action: senderActions[sender],
        }))
        .filter(stat => !searchQuery || stat.sender.toLowerCase().includes(searchQuery.toLowerCase()));

      // Ordina i dati
      stats.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'sender') {
          comparison = a.sender.localeCompare(b.sender);
        } else if (sortBy === 'count') {
          comparison = a.count - b.count;
        } else if (sortBy === 'group') {
          const aGroup = a.group?.name || '';
          const bGroup = b.group?.name || '';
          comparison = aGroup.localeCompare(bGroup);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return stats;
    },
  });

  // Fetch groups
  const { data: groups } = useQuery({
    queryKey: ['sender-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sender_groups')
        .select('*')
        .order('nome_gruppo');
      
      if (error) throw error;
      return data;
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('email_sender_groups')
        .insert({
          nome_gruppo: newGroupName,
          descrizione: newGroupDescription,
          colore: newGroupColor,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender-groups'] });
      toast.success('Gruppo creato con successo');
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#3b82f6');
      setDialogOpen(false);
    },
    onError: () => {
      toast.error('Errore durante la creazione del gruppo');
    },
  });

  // Assign senders to group mutation
  const assignToGroupMutation = useMutation({
    mutationFn: async ({ groupId, senders }: { groupId: string; senders: string[] }) => {
      await supabase
        .from('email_sender_rules')
        .delete()
        .in('sender_email', senders);

      const rules = senders.map(sender => ({
        group_id: groupId,
        sender_email: sender,
      }));

      const { error } = await supabase
        .from('email_sender_rules')
        .insert(rules);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender-stats'] });
      toast.success('Mittenti assegnati al gruppo');
      setSelectedSenders([]);
    },
    onError: () => {
      toast.error('Errore durante l\'assegnazione');
    },
  });

  // Assign action to senders mutation
  const assignActionMutation = useMutation({
    mutationFn: async ({ actionType, senders }: { actionType: 'move_to_folder' | 'mark_as_read' | 'archive' | 'delete' | 'forward'; senders: string[] }) => {
      await supabase
        .from('email_sender_actions')
        .delete()
        .in('sender_email', senders);

      const actions = senders.map(sender => ({
        sender_email: sender,
        action_type: actionType,
        action_params: {},
      }));

      const { error } = await supabase
        .from('email_sender_actions')
        .insert(actions);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender-stats'] });
      toast.success('Azione assegnata ai mittenti');
      setSelectedSenders([]);
    },
    onError: () => {
      toast.error('Errore durante l\'assegnazione dell\'azione');
    },
  });

  const handleToggleSender = (sender: string) => {
    setSelectedSenders(prev =>
      prev.includes(sender)
        ? prev.filter(s => s !== sender)
        : [...prev, sender]
    );
  };

  const extractCompanyName = (email: string): string => {
    const match = email.match(/@([^.]+)\./);
    return match ? match[1] : '';
  };

  const handleSort = (column: 'sender' | 'count' | 'group') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const totalEmails = senderStats?.reduce((sum, s) => sum + s.count, 0) || 0;
  const uniqueSenders = senderStats?.length || 0;
  const groupedSenders = senderStats?.filter(s => s.group).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-background/50 to-blue-900/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gestione Mittenti
            </h1>
            <p className="text-muted-foreground mt-1">
              Raggruppa e organizza i mittenti delle tue email
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Gruppo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Gruppo</DialogTitle>
                <DialogDescription>
                  Crea un gruppo per organizzare i mittenti
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Gruppo</Label>
                  <Input
                    id="name"
                    placeholder="Es: Clienti, Fornitori, Newsletter..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrizione del gruppo..."
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Colore</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      className="w-20"
                    />
                    <Input
                      type="text"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => createGroupMutation.mutate()}
                  disabled={!newGroupName || createGroupMutation.isPending}
                  className="w-full"
                >
                  Crea Gruppo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="backdrop-blur-md bg-card/80 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Totali</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmails.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-md bg-card/80 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mittenti Unici</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueSenders}</div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-card/80 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mittenti Raggruppati</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groupedSenders}</div>
              <p className="text-xs text-muted-foreground">
                {uniqueSenders > 0 ? Math.round((groupedSenders / uniqueSenders) * 100) : 0}% organizzati
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-card/80 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gruppi Attivi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bulk Actions */}
          {selectedSenders.length > 0 && (
            <Card className="backdrop-blur-md bg-primary/10 border-primary/20 shadow-lg">
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(value) => {
                        assignToGroupMutation.mutate({
                          groupId: value,
                          senders: selectedSenders,
                        });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Assegna a gruppo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.colore }}
                              />
                              {group.nome_gruppo}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">{selectedSenders.length}</Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedSenders([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(value: 'move_to_folder' | 'mark_as_read' | 'archive' | 'delete' | 'forward') => {
                        assignActionMutation.mutate({
                          actionType: value,
                          senders: selectedSenders,
                        });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Assegna azione automatica..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="move_to_folder">
                          📁 Sposta in cartella
                        </SelectItem>
                        <SelectItem value="mark_as_read">
                          ✓ Marca come letto
                        </SelectItem>
                        <SelectItem value="archive">
                          📦 Archivia
                        </SelectItem>
                        <SelectItem value="delete">
                          🗑️ Elimina
                        </SelectItem>
                        <SelectItem value="forward">
                          ➡️ Inoltra
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Card className="backdrop-blur-md bg-card/80 border-white/10 shadow-lg md:col-span-1">
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cerca mittente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Senders Table */}
        <Card className="backdrop-blur-md bg-card/80 border-white/10 shadow-lg max-w-[50%]">
          <CardHeader>
            <CardTitle>Mittenti</CardTitle>
            <CardDescription>
              Clicca per selezionare i mittenti da raggruppare
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort('sender')}
                  >
                    Mittente {sortBy === 'sender' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:text-primary w-24"
                    onClick={() => handleSort('count')}
                  >
                    <Mail className="h-4 w-4 mx-auto" />
                    {sortBy === 'count' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:text-primary"
                    onClick={() => handleSort('group')}
                  >
                    Gruppo {sortBy === 'group' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStats ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : senderStats?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nessun mittente trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  senderStats?.map((stat) => (
                    <TableRow
                      key={stat.sender}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedSenders.includes(stat.sender) ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => handleToggleSender(stat.sender)}
                    >
                      <TableCell className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedSenders.includes(stat.sender)}
                          onChange={() => handleToggleSender(stat.sender)}
                          className="cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          {extractCompanyName(stat.sender) && (
                            <span className="font-bold text-base capitalize">{extractCompanyName(stat.sender)}</span>
                          )}
                          <span className="text-sm text-muted-foreground">{stat.sender}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-base font-semibold">{stat.count}</span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {stat.group && (
                          <Badge
                            className="text-xs"
                            style={{
                              backgroundColor: `${stat.group.color}20`,
                              color: stat.group.color,
                              borderColor: stat.group.color,
                            }}
                          >
                            {stat.group.name}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Groups List */}
        <Card className="backdrop-blur-md bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle>Gruppi Esistenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {groups?.map((group) => (
                <Card key={group.id} className="backdrop-blur-sm bg-card/60 border-2 shadow-md" style={{ borderColor: group.colore }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.colore }}
                      />
                      {group.nome_gruppo}
                    </CardTitle>
                    {group.descrizione && (
                      <CardDescription>{group.descrizione}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
              {groups?.length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  Nessun gruppo creato. Crea il primo gruppo per iniziare!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
