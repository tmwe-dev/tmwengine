import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Mail, Users, Tag, TrendingUp, X, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [confirmGroupDialog, setConfirmGroupDialog] = useState(false);
  const [selectedGroupForAssignment, setSelectedGroupForAssignment] = useState<{ id: string; name: string } | null>(null);
  const [sortBy, setSortBy] = useState<'sender' | 'count' | 'group' | 'company'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [timelineWindowStart, setTimelineWindowStart] = useState(0);
  const [currentSenderIndex, setCurrentSenderIndex] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<'move_to_folder' | 'mark_as_read' | 'archive' | 'delete' | 'forward' | ''>('');
  const MONTHS_TO_SHOW = 12;
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
        } else if (sortBy === 'company') {
          const aCompany = a.sender.match(/@([^.]+)\./)?.[1] || '';
          const bCompany = b.sender.match(/@([^.]+)\./)?.[1] || '';
          comparison = aCompany.localeCompare(bCompany);
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

  const handleSort = (column: 'sender' | 'count' | 'group' | 'company') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleGroupCardClick = (groupId: string, groupName: string) => {
    if (selectedSenders.length > 0) {
      setSelectedGroupForAssignment({ id: groupId, name: groupName });
      setConfirmGroupDialog(true);
    }
  };

  const confirmGroupAssignment = () => {
    if (selectedGroupForAssignment) {
      assignToGroupMutation.mutate({
        groupId: selectedGroupForAssignment.id,
        senders: selectedSenders,
      });
      setConfirmGroupDialog(false);
      setSelectedGroupForAssignment(null);
    }
  };

  // Get current sender for chart
  const currentChartSender = senderStats?.[currentSenderIndex]?.sender;

  // Fetch email timeline for current chart sender
  const { data: emailTimelineAll, isLoading: loadingTimeline } = useQuery({
    queryKey: ['email-timeline', currentChartSender],
    queryFn: async () => {
      if (!currentChartSender) return [];

      const { data, error } = await supabase
        .from('email_messages')
        .select('data_ricezione')
        .eq('from_email', currentChartSender)
        .order('data_ricezione', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthCounts: Record<string, number> = {};
      data?.forEach(email => {
        const date = new Date(email.data_ricezione);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });

      return Object.entries(monthCounts)
        .map(([month, count]) => ({
          month,
          count,
          displayMonth: new Date(month + '-01').toLocaleDateString('it-IT', { 
            year: 'numeric', 
            month: 'short' 
          })
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },
    enabled: !!currentChartSender && chartDialogOpen,
  });

  // Get windowed data for chart
  const emailTimeline = emailTimelineAll?.slice(timelineWindowStart, timelineWindowStart + MONTHS_TO_SHOW) || [];
  const canScrollLeft = timelineWindowStart > 0;
  const canScrollRight = emailTimelineAll && timelineWindowStart + MONTHS_TO_SHOW < emailTimelineAll.length;

  // Navigation functions
  const handlePreviousSender = () => {
    if (currentSenderIndex > 0) {
      setCurrentSenderIndex(currentSenderIndex - 1);
      setTimelineWindowStart(0);
    }
  };

  const handleNextSender = () => {
    if (senderStats && currentSenderIndex < senderStats.length - 1) {
      setCurrentSenderIndex(currentSenderIndex + 1);
      setTimelineWindowStart(0);
    }
  };

  // Assignment functions
  const handleAssignGroup = async () => {
    if (!selectedGroupId || !currentChartSender) return;
    
    await supabase
      .from('email_sender_rules')
      .delete()
      .eq('sender_email', currentChartSender);

    const { error } = await supabase
      .from('email_sender_rules')
      .insert({
        group_id: selectedGroupId,
        sender_email: currentChartSender,
      });

    if (!error) {
      toast.success('Gruppo assegnato');
      queryClient.invalidateQueries({ queryKey: ['sender-stats'] });
      setSelectedGroupId('');
    } else {
      toast.error('Errore durante l\'assegnazione');
    }
  };

  const handleAssignAction = async () => {
    if (!selectedActionType || !currentChartSender) return;
    
    await supabase
      .from('email_sender_actions')
      .delete()
      .eq('sender_email', currentChartSender);

    const { error } = await supabase
      .from('email_sender_actions')
      .insert({
        sender_email: currentChartSender,
        action_type: selectedActionType,
        action_params: {},
      });

    if (!error) {
      toast.success('Azione assegnata');
      queryClient.invalidateQueries({ queryKey: ['sender-stats'] });
      setSelectedActionType('');
    } else {
      toast.error('Errore durante l\'assegnazione dell\'azione');
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Mittenti</CardTitle>
                <Badge variant="secondary">{uniqueSenders}</Badge>
              </div>
              {selectedSenders.length === 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const index = senderStats?.findIndex(s => s.sender === selectedSenders[0]) || 0;
                    setCurrentSenderIndex(index);
                    setChartDialogOpen(true);
                  }}
                  className="h-8 w-8"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardDescription>
              Clicca per selezionare i mittenti da raggruppare
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort('company')}
                  >
                    Azienda {sortBy === 'company' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                  senderStats?.map((stat, index) => (
                    <TableRow
                      key={stat.sender}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedSenders.includes(stat.sender) ? 'border-l-4 border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleToggleSender(stat.sender)}
                    >
                      <TableCell className="py-2 font-semibold text-muted-foreground">
                        {index + 1}
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
                <Card 
                  key={group.id} 
                  className={`backdrop-blur-sm bg-card/60 border-2 shadow-md ${selectedSenders.length > 0 ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
                  style={{ borderColor: group.colore }}
                  onClick={() => handleGroupCardClick(group.id, group.nome_gruppo)}
                >
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

        {/* Confirm Group Assignment Dialog */}
        <Dialog open={confirmGroupDialog} onOpenChange={setConfirmGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma Assegnazione</DialogTitle>
              <DialogDescription>
                Vuoi assegnare {selectedSenders.length} mittent{selectedSenders.length > 1 ? 'i' : 'e'} al gruppo "{selectedGroupForAssignment?.name}"?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmGroupDialog(false)}>
                Annulla
              </Button>
              <Button onClick={confirmGroupAssignment}>
                Conferma
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Timeline Chart Dialog */}
        <Dialog open={chartDialogOpen} onOpenChange={(open) => {
          setChartDialogOpen(open);
          if (!open) {
            setTimelineWindowStart(0);
            setSelectedGroupId('');
            setSelectedActionType('');
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <DialogTitle>Timeline Email</DialogTitle>
                </div>

                {/* Assignment Controls - In Header */}
                <div className="flex items-center gap-3">
                  {/* Group Assignment */}
                  <div className="flex items-center gap-1">
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Gruppo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {groups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: group.colore }}
                              />
                              <span className="text-xs">{group.nome_gruppo}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAssignGroup}
                      disabled={!selectedGroupId}
                      size="sm"
                      className="h-8 text-xs px-2"
                    >
                      Assegna
                    </Button>
                  </div>

                  {/* Action Assignment */}
                  <div className="flex items-center gap-1">
                    <Select value={selectedActionType} onValueChange={(value: any) => setSelectedActionType(value)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Azione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="move_to_folder"><span className="text-xs">📁 Sposta</span></SelectItem>
                        <SelectItem value="mark_as_read"><span className="text-xs">✓ Letto</span></SelectItem>
                        <SelectItem value="archive"><span className="text-xs">📦 Archivia</span></SelectItem>
                        <SelectItem value="delete"><span className="text-xs">🗑️ Elimina</span></SelectItem>
                        <SelectItem value="forward"><span className="text-xs">➡️ Inoltra</span></SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAssignAction}
                      disabled={!selectedActionType}
                      size="sm"
                      className="h-8 text-xs px-2"
                    >
                      Assegna
                    </Button>
                  </div>
                </div>
              </div>
              <DialogDescription className="truncate">
                {currentChartSender}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {loadingTimeline ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Caricamento...</div>
                </div>
              ) : !emailTimelineAll || emailTimelineAll.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Nessun dato disponibile
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={emailTimeline}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="displayMonth" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#barGradient)"
                        radius={[8, 8, 0, 0]}
                        name="Email"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Sender Navigation - Below Chart */}
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousSender}
                      disabled={currentSenderIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Mittente Precedente
                    </Button>
                    <div className="text-sm text-muted-foreground min-w-[150px] text-center">
                      {currentSenderIndex + 1} / {senderStats?.length || 0}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextSender}
                      disabled={!senderStats || currentSenderIndex >= senderStats.length - 1}
                    >
                      Mittente Successivo
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                  
                  {/* Time Navigation Controls */}
                  <div className="flex items-center justify-center gap-4 border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineWindowStart(Math.max(0, timelineWindowStart - MONTHS_TO_SHOW))}
                      disabled={!canScrollLeft}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Precedenti
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      Mesi {timelineWindowStart + 1}-{Math.min(timelineWindowStart + MONTHS_TO_SHOW, emailTimelineAll.length)} di {emailTimelineAll.length}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineWindowStart(timelineWindowStart + MONTHS_TO_SHOW)}
                      disabled={!canScrollRight}
                    >
                      Successivi
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
