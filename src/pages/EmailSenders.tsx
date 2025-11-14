import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Mail, Users, Tag, TrendingUp, X, BarChart3, ChevronLeft, ChevronRight, Brain, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SenderAIChatDialog } from '@/components/email/SenderAIChatDialog';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';

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
  const navigate = useNavigate();
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
  const [confirmChartGroupAssignment, setConfirmChartGroupAssignment] = useState(false);
  const [confirmChartActionAssignment, setConfirmChartActionAssignment] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [selectedAIChatSender, setSelectedAIChatSender] = useState<string>('');
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true); // Clean_Top pattern
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false); // Search visibility
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('email_sender_groups')
        .insert({
          nome_gruppo: newGroupName,
          descrizione: newGroupDescription,
          colore: newGroupColor,
          user_id: user.id
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
  const confirmAssignGroup = () => {
    if (!selectedGroupId) return;
    setConfirmChartGroupAssignment(true);
  };

  const handleAssignGroup = async () => {
    if (!selectedGroupId || !currentChartSender) return;
    
    setConfirmChartGroupAssignment(false);
    
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

  const confirmAssignAction = () => {
    if (!selectedActionType) return;
    setConfirmChartActionAssignment(true);
  };

  const handleAssignAction = async () => {
    if (!selectedActionType || !currentChartSender) return;
    
    setConfirmChartActionAssignment(false);
    
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
    <div className="section-spacing">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Title and Toggle - Clean_Top Pattern */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-heading-1 font-bold text-text-primary">Gestione Mittenti</h1>
            {isHeaderVisible && (
              <p className="text-body text-text-secondary animate-accordion-down">
                Raggruppa e organizza i mittenti delle tue email
              </p>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHeaderVisible(!isHeaderVisible)}
            className="h-8 w-8 shrink-0 mt-2.5"
          >
            {isHeaderVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Action Buttons and Filters - Clean_Top Pattern */}
        {isHeaderVisible && (
          <div className="animate-accordion-down space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                {/* Left-aligned action buttons */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" className="shadow-soft h-10 w-10">
                      <Plus className="h-5 w-5" />
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
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={() => setIsSearchVisible(!isSearchVisible)}
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Right-aligned AI/Settings icons */}
                <UnifiedAICommunicationBadge pageRoute="/email-senders" />
                <Brain 
                  className="h-5 w-5 text-primary cursor-pointer hover:scale-110 transition-transform" 
                  onClick={() => navigate('/chat?page=/email-senders')}
                />
              </div>
            </div>

            {/* Search Card - Only when search is visible */}
            {isSearchVisible && (
              <Card className="bg-card-transparent border-card shadow-soft animate-accordion-down">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <Input
                      placeholder="Cerca mittente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards - Under Search */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-4">
              <Card className="bg-card-transparent border-card shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-xs font-medium">Email Totali</CardTitle>
                  <Mail className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-lg font-bold md:text-2xl">{totalEmails.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-card-transparent border-card shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-xs font-medium">Mittenti Unici</CardTitle>
                  <Users className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-lg font-bold md:text-2xl">{uniqueSenders}</div>
                </CardContent>
              </Card>

              <Card className="bg-card-transparent border-card shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-xs font-medium">Raggruppati</CardTitle>
                  <Tag className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-lg font-bold md:text-2xl">{groupedSenders}</div>
                  <p className="text-[10px] text-muted-foreground md:text-xs">
                    {uniqueSenders > 0 ? Math.round((groupedSenders / uniqueSenders) * 100) : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card-transparent border-card shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-xs font-medium">Gruppi Attivi</CardTitle>
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-lg font-bold md:text-2xl">{groups?.length || 0}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedSenders.length > 0 && (
          <Card className="bg-card-transparent border-card shadow-soft border-primary/40">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedSenders.length} mittent{selectedSenders.length > 1 ? 'i' : 'e'} selezionat{selectedSenders.length > 1 ? 'i' : 'o'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSenders([])}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Deseleziona
                  </Button>
                </div>
                <div className="flex gap-2">
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

                  <Select
                    onValueChange={(value: 'move_to_folder' | 'mark_as_read' | 'archive' | 'delete' | 'forward') => {
                      assignActionMutation.mutate({
                        actionType: value,
                        senders: selectedSenders,
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Assegna azione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="move_to_folder">📁 Sposta in cartella</SelectItem>
                      <SelectItem value="mark_as_read">✓ Marca come letto</SelectItem>
                      <SelectItem value="archive">📦 Archivia</SelectItem>
                      <SelectItem value="delete">🗑️ Elimina</SelectItem>
                      <SelectItem value="forward">➡️ Inoltra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Senders Table */}
        <Card className="bg-card-transparent border-card shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Mittenti</CardTitle>
                <Badge variant="secondary">{uniqueSenders}</Badge>
              </div>
              {selectedSenders.length === 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const index = senderStats?.findIndex(s => s.sender === selectedSenders[0]) || 0;
                    setCurrentSenderIndex(index);
                    setChartDialogOpen(true);
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Visualizza Timeline
                </Button>
              )}
            </div>
            <CardDescription>
              Clicca per selezionare i mittenti da raggruppare
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-4 overflow-x-auto">
            <Table className="text-xs md:text-sm w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6 md:w-12 text-[10px] md:text-xs p-1 md:p-2">#</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary w-[45%] md:w-[40%] text-[10px] md:text-xs p-1 md:p-2"
                    onClick={() => handleSort('company')}
                  >
                    Azienda {sortBy === 'company' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:text-primary w-[50px] md:w-[80px] text-[10px] md:text-xs p-1 md:p-2"
                    onClick={() => handleSort('count')}
                  >
                    # {sortBy === 'count' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:text-primary w-[30%] md:w-[30%] text-[10px] md:text-xs p-1 md:p-2 hidden md:table-cell"
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
                      <TableCell className="py-1 md:py-3 font-semibold text-muted-foreground text-[9px] md:text-sm p-1 md:p-2">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-1 md:py-3 p-1 md:p-2">
                        <div className="flex flex-col gap-0">
                          {extractCompanyName(stat.sender) && (
                            <span className="font-semibold text-[10px] md:text-sm capitalize truncate">{extractCompanyName(stat.sender)}</span>
                          )}
                          <span className="text-[9px] md:text-xs text-muted-foreground truncate max-w-[120px] md:max-w-[300px]">{stat.sender}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1 md:py-3 p-1 md:p-2">
                        <Badge variant="secondary" className="text-[9px] md:text-xs font-semibold px-1 md:px-2 py-0">{stat.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right py-1 md:py-3 p-1 md:p-2 hidden md:table-cell">
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
        <Card className="bg-card-transparent border-card shadow-soft">
          <CardHeader>
            <CardTitle>Gruppi Esistenti</CardTitle>
            <CardDescription>
              {selectedSenders.length > 0 && 'Clicca su un gruppo per assegnare i mittenti selezionati'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {groups?.map((group) => (
                <Card 
                  key={group.id} 
                  className={`bg-card/60 border-2 shadow-sm transition-all ${selectedSenders.length > 0 ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}`}
                  style={{ borderColor: group.colore }}
                  onClick={() => handleGroupCardClick(group.id, group.nome_gruppo)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.colore }}
                      />
                      <span className="truncate">{group.nome_gruppo}</span>
                    </CardTitle>
                    {group.descrizione && (
                      <CardDescription className="text-xs truncate">{group.descrizione}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
              {groups?.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
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
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <DialogTitle>Timeline Email</DialogTitle>
              </div>
              <DialogDescription className="truncate">
                {currentChartSender}
              </DialogDescription>
              
              {/* Assignment Controls - Centered in Header */}
              <div className="flex items-center justify-center gap-3 pt-4">
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
                    onClick={confirmAssignGroup}
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
                    onClick={confirmAssignAction}
                    disabled={!selectedActionType}
                    size="sm"
                    className="h-8 text-xs px-2"
                  >
                    Assegna
                  </Button>
                </div>
              </div>
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

        {/* Confirm Group Assignment Dialog */}
        <AlertDialog open={confirmChartGroupAssignment} onOpenChange={setConfirmChartGroupAssignment}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma assegnazione gruppo</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler assegnare il gruppo a questo mittente? L'operazione sovrascriverà eventuali assegnazioni precedenti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleAssignGroup}>Conferma</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AI Chat Dialog */}
        <SenderAIChatDialog 
          senderEmail={selectedAIChatSender}
          open={aiChatOpen}
          onOpenChange={setAiChatOpen}
        />

        {/* Confirm Action Assignment Dialog */}
        <AlertDialog open={confirmChartActionAssignment} onOpenChange={setConfirmChartActionAssignment}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma assegnazione azione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler assegnare questa azione automatica a questo mittente? L'operazione sovrascriverà eventuali azioni precedenti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleAssignAction}>Conferma</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
