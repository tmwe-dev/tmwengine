import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SenderGroup {
  id: string;
  nome_gruppo: string;
  descrizione: string | null;
  colore: string;
  created_at: string;
  rule_count?: number;
}

interface SenderRulesPanelProps {
  selectedSenders?: string[];
  onRuleAssigned?: () => void;
}

export const SenderRulesPanel = ({ selectedSenders = [], onRuleAssigned }: SenderRulesPanelProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch sender groups with rule count
  const { data: groups, isLoading } = useQuery({
    queryKey: ['sender-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sender_groups')
        .select(`
          *,
          email_sender_rules(count)
        `)
        .order('nome_gruppo');
      
      if (error) throw error;
      
      return (data || []).map(group => ({
        ...group,
        rule_count: group.email_sender_rules?.[0]?.count || 0
      }));
    },
  });

  // Create new group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { nome_gruppo: string; descrizione: string; colore: string }) => {
      const { data, error } = await supabase
        .from('email_sender_groups')
        .insert([groupData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender-groups'] });
      setIsCreateDialogOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#3b82f6');
      toast.success('Gruppo creato con successo');
    },
    onError: (error: any) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Assign senders to group mutation
  const assignSendersMutation = useMutation({
    mutationFn: async ({ groupId, senders }: { groupId: string; senders: string[] }) => {
      const rules = senders.map(sender => ({
        group_id: groupId,
        sender_email: sender,
      }));

      // Check for existing rules
      const { data: existing } = await supabase
        .from('email_sender_rules')
        .select('sender_email')
        .eq('group_id', groupId)
        .in('sender_email', senders);

      const existingSenders = new Set(existing?.map(r => r.sender_email) || []);
      const newRules = rules.filter(r => !existingSenders.has(r.sender_email));

      if (newRules.length === 0) {
        throw new Error('Tutti i mittenti sono già associati a questo gruppo');
      }

      const { data, error } = await supabase
        .from('email_sender_rules')
        .insert(newRules)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sender-groups'] });
      setIsAssignDialogOpen(false);
      setSelectedGroupId('');
      toast.success(`${data.length} mittenti associati al gruppo`);
      onRuleAssigned?.();
    },
    onError: (error: any) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      // First delete all rules
      await supabase
        .from('email_sender_rules')
        .delete()
        .eq('group_id', groupId);

      // Then delete the group
      const { error } = await supabase
        .from('email_sender_groups')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender-groups'] });
      toast.success('Gruppo eliminato');
    },
    onError: (error: any) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Inserisci un nome per il gruppo');
      return;
    }

    createGroupMutation.mutate({
      nome_gruppo: newGroupName.trim(),
      descrizione: newGroupDescription.trim() || '',
      colore: newGroupColor,
    });
  };

  const handleAssignSenders = () => {
    if (!selectedGroupId) {
      toast.error('Seleziona un gruppo');
      return;
    }

    if (selectedSenders.length === 0) {
      toast.error('Nessun mittente selezionato');
      return;
    }

    assignSendersMutation.mutate({
      groupId: selectedGroupId,
      senders: selectedSenders,
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Sei sicuro di voler eliminare questo gruppo e tutte le sue regole?')) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag className="h-4 w-4 animate-pulse" />
          <span>Caricamento regole...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-3 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Regole Mittenti</h3>
            <Badge variant="secondary" className="text-xs">
              {groups?.length || 0} gruppi
            </Badge>
          </div>
          <div className="flex gap-2">
            {selectedSenders.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAssignDialogOpen(true)}
                className="h-7 text-xs"
              >
                <Users className="h-3 w-3 mr-1.5" />
                Associa {selectedSenders.length} mittenti
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Nuovo Gruppo
            </Button>
          </div>
        </div>

        {groups && groups.length > 0 ? (
          <ScrollArea className="h-[80px]">
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs group hover:bg-accent transition-colors"
                  style={{ borderColor: group.colore + '40', backgroundColor: group.colore + '10' }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: group.colore }}
                  />
                  <span className="font-medium">{group.nome_gruppo}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {group.rule_count}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nessun gruppo di mittenti configurato
          </p>
        )}
      </Card>

      {/* Create Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Nuovo Gruppo</DialogTitle>
            <DialogDescription>
              Crea un gruppo per organizzare i mittenti delle email
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group-name">Nome Gruppo *</Label>
              <Input
                id="group-name"
                placeholder="es. Clienti VIP"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group-description">Descrizione</Label>
              <Input
                id="group-description"
                placeholder="Descrizione opzionale"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group-color">Colore</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="group-color"
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="w-20 h-9"
                />
                <div
                  className="flex-1 h-9 rounded-md border"
                  style={{ backgroundColor: newGroupColor + '20', borderColor: newGroupColor }}
                >
                  <div className="flex items-center justify-center h-full text-xs font-medium">
                    Anteprima
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? 'Creazione...' : 'Crea Gruppo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Senders Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associa Mittenti a Gruppo</DialogTitle>
            <DialogDescription>
              Seleziona il gruppo a cui associare i {selectedSenders.length} mittenti selezionati
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Mittenti selezionati:</Label>
              <ScrollArea className="h-[120px] border rounded-md p-2">
                <div className="space-y-1">
                  {selectedSenders.map((sender, index) => (
                    <div key={index} className="text-xs px-2 py-1 bg-muted rounded">
                      {sender}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target-group">Gruppo *</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger id="target-group">
                  <SelectValue placeholder="Seleziona gruppo" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.colore }}
                        />
                        <span>{group.nome_gruppo}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {group.rule_count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleAssignSenders}
              disabled={!selectedGroupId || assignSendersMutation.isPending}
            >
              {assignSendersMutation.isPending ? 'Associazione...' : 'Associa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};