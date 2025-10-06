import { format } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  Trash2, 
  Star,
  MoreVertical,
  Download,
  Paperclip,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderCog,
  User,
  Users,
  Megaphone,
  X,
  Settings
} from 'lucide-react';
import { formatFileSize, downloadBase64File } from '@/lib/tmwe-fileUtils';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface EmailDetailProps {
  email: {
    id: string;
    subject: string;
    from: string;
    to: string[];
    cc?: string[];
    date: string;
    body: string;
    attachments?: any[];
  };
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  isMobile?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onMarkAsRead?: (emailId: string) => void;
  isHeaderCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const EmailDetail = ({ 
  email, 
  onReply, 
  onReplyAll, 
  onForward, 
  onDelete,
  onBack,
  isMobile,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  onMarkAsRead,
  isHeaderCollapsed: externalIsHeaderCollapsed,
  onToggleCollapse: externalOnToggleCollapse
}: EmailDetailProps) => {
  const [senderGroups, setSenderGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [currentSenderGroup, setCurrentSenderGroup] = useState<string | null>(null);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'move_to_folder' | 'mark_as_read' | 'archive' | 'delete' | 'forward' | null>(null);
  const [destinationFolder, setDestinationFolder] = useState<string>('INBOX');
  
  // Use external state if provided, otherwise use internal state
  const [internalIsHeaderCollapsed, setInternalIsHeaderCollapsed] = useState(false);
  const isHeaderCollapsed = externalIsHeaderCollapsed !== undefined ? externalIsHeaderCollapsed : internalIsHeaderCollapsed;
  const handleToggleCollapse = externalOnToggleCollapse || (() => setInternalIsHeaderCollapsed(!internalIsHeaderCollapsed));

  // Auto mark as read when email is displayed
  useEffect(() => {
    if (onMarkAsRead && email.id) {
      onMarkAsRead(email.id);
    }
  }, [email.id, onMarkAsRead]);

  // Load sender groups
  useEffect(() => {
    loadSenderGroups();
    loadCurrentSenderGroup();
  }, []);

  const loadSenderGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('email_sender_groups')
        .select('*')
        .order('nome_gruppo');
      
      if (error) throw error;
      setSenderGroups(data || []);
    } catch (error) {
      console.error('Error loading sender groups:', error);
    }
  };

  const loadCurrentSenderGroup = async () => {
    try {
      const senderEmail = email.from.match(/<(.+)>/)
        ? email.from.match(/<(.+)>/)?.[1]
        : email.from;

      const { data, error } = await supabase
        .from('email_sender_rules')
        .select('group_id, email_sender_groups(nome_gruppo)')
        .eq('sender_email', senderEmail)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCurrentSenderGroup((data as any).email_sender_groups?.nome_gruppo);
      }
    } catch (error) {
      console.error('Error loading current sender group:', error);
    }
  };

  const handleAssignGroup = async (groupId: string) => {
    try {
      const senderEmail = email.from.match(/<(.+)>/)
        ? email.from.match(/<(.+)>/)?.[1]
        : email.from;

      if (!senderEmail) {
        toast.error('Impossibile estrarre l\'indirizzo email del mittente');
        return;
      }

      // Delete existing rule for this sender
      await supabase
        .from('email_sender_rules')
        .delete()
        .eq('sender_email', senderEmail);

      // Insert new rule
      const { error } = await supabase
        .from('email_sender_rules')
        .insert({
          sender_email: senderEmail,
          group_id: groupId
        });
      
      if (error) throw error;
      
      toast.success('Regola assegnata con successo');
      loadCurrentSenderGroup();
    } catch (error: any) {
      console.error('Error assigning group:', error);
      toast.error('Errore nell\'assegnazione della regola');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Inserisci un nome per il gruppo');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('email_sender_groups')
        .insert({
          nome_gruppo: newGroupName.trim()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Gruppo creato con successo');
      setNewGroupName('');
      setIsCreatingGroup(false);
      await loadSenderGroups();
      
      // Automatically assign to new group
      if (data) {
        handleAssignGroup(data.id);
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error('Errore nella creazione del gruppo');
    }
  };

  const handleCreateRule = async () => {
    if (!selectedAction) {
      toast.error('Seleziona un\'azione');
      return;
    }

    try {
      const senderEmail = email.from.match(/<(.+)>/)
        ? email.from.match(/<(.+)>/)?.[1]
        : email.from;

      if (!senderEmail) {
        toast.error('Impossibile estrarre l\'indirizzo email del mittente');
        return;
      }

      // Delete existing rule for this sender
      await supabase
        .from('email_sender_actions')
        .delete()
        .eq('sender_email', senderEmail);

      // Prepare action params
      const actionParams: any = {};
      if (selectedAction === 'move_to_folder') {
        actionParams.folder = destinationFolder;
      }

      // Insert new rule
      const { error } = await supabase
        .from('email_sender_actions')
        .insert({
          sender_email: senderEmail,
          action_type: selectedAction,
          action_params: actionParams
        });
      
      if (error) throw error;
      
      toast.success('Regola automatica creata con successo');
      setShowActionsSheet(false);
      setSelectedAction(null);
      setDestinationFolder('INBOX');
    } catch (error: any) {
      console.error('Error creating rule:', error);
      toast.error('Errore nella creazione della regola');
    }
  };

  return (
    <div className="flex h-full flex-col bg-card-transparent">
      {/* Top bar with navigation and close */}
      {!isHeaderCollapsed && (
      <div className="grid grid-cols-3 items-center p-4 border-b bg-card-transparent">
        {/* Left: Management actions or empty */}
        {!isHeaderCollapsed ? (
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-12 w-12">
                  <FolderCog className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {senderGroups.map((group) => (
                  <DropdownMenuItem
                    key={group.id}
                    onClick={() => handleAssignGroup(group.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: group.colore }}
                      />
                      {group.nome_gruppo}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {isCreatingGroup ? (
                  <div className="p-2 space-y-2">
                    <Input
                      placeholder="Nome gruppo"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateGroup();
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateGroup} className="flex-1">
                        Crea
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setIsCreatingGroup(false);
                          setNewGroupName('');
                        }}
                        className="flex-1"
                      >
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DropdownMenuItem onClick={() => setIsCreatingGroup(true)}>
                    + Nuovo gruppo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <Star className="h-6 w-6" />
            </Button>
            
            {onDelete && (
              <Button variant="destructive" size="icon" onClick={onDelete} className="h-12 w-12">
                <Trash2 className="h-6 w-6" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
          </div>
        )}

        {/* Center: Email navigation (sempre visibile) */}
        <div className="flex items-center gap-3 justify-center">
        </div>

        {/* Right: Actions and Close */}
        <div className="flex justify-end gap-3">
          {!isHeaderCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => {
                  setShowActionsSheet(true);
                  setSelectedAction('move_to_folder');
                }}>
                  <FolderCog className="h-4 w-4 mr-2" />
                  Sposta automaticamente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setShowActionsSheet(true);
                  setSelectedAction('mark_as_read');
                }}>
                  <FolderCog className="h-4 w-4 mr-2" />
                  Segna sempre come letto
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setShowActionsSheet(true);
                  setSelectedAction('archive');
                }}>
                  <FolderCog className="h-4 w-4 mr-2" />
                  Archivia automaticamente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setShowActionsSheet(true);
                  setSelectedAction('delete');
                }}>
                  <FolderCog className="h-4 w-4 mr-2" />
                  Elimina automaticamente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      )}
      
      {/* Action buttons bar - nascosta quando collapsed */}
      {!isHeaderCollapsed && (
        <div className="flex items-center justify-center border-b p-6 md:p-8 gap-4 bg-card-transparent">
          {/* Communication actions */}
          <div className="flex gap-3 items-center">
            <Button variant="outline" size="icon" onClick={onReply} className="h-12 w-12">
              <div className="flex items-center gap-1">
                <Reply className="h-5 w-5" />
                <User className="h-4 w-4" />
              </div>
            </Button>
            <Button variant="outline" size="icon" onClick={onReplyAll} className="h-12 w-12">
              <div className="flex items-center gap-1">
                <ReplyAll className="h-5 w-5" />
                <Users className="h-4 w-4" />
              </div>
            </Button>
            <Button variant="outline" size="icon" onClick={onForward} className="h-12 w-12">
              <div className="flex items-center gap-1">
                <Forward className="h-5 w-5" />
                <Megaphone className="h-4 w-4" />
              </div>
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {email.subject || '(Nessun oggetto)'}
            </h2>
            <div className="text-sm text-muted-foreground">
              <p>Da: {email.from}</p>
              <p>A: {email.to}</p>
              {email.date && <p>Data: {new Date(email.date).toLocaleString('it-IT')}</p>}
            </div>
          </div>

          {/* Body */}
          <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
            <div 
              dangerouslySetInnerHTML={{ __html: email.body }}
              className="text-foreground [&_a]:text-primary [&_a]:underline"
            />
          </div>
        </div>
      </ScrollArea>

      <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md backdrop-blur-md bg-background/95">
          <SheetHeader>
            <SheetTitle>Configura Regola Automatica</SheetTitle>
            <SheetDescription>
              Crea una regola per le email da: {email.from}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Azione</label>
              <Select value={selectedAction || ''} onValueChange={(value: any) => setSelectedAction(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un'azione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="move_to_folder">Sposta in cartella</SelectItem>
                  <SelectItem value="mark_as_read">Segna come letto</SelectItem>
                  <SelectItem value="archive">Archivia</SelectItem>
                  <SelectItem value="delete">Elimina</SelectItem>
                  <SelectItem value="forward">Inoltra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedAction === 'move_to_folder' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cartella di destinazione</label>
                <Input 
                  value={destinationFolder}
                  onChange={(e) => setDestinationFolder(e.target.value)}
                  placeholder="es. INBOX/Lavoro"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleCreateRule} className="flex-1">
                Crea Regola
              </Button>
              <Button variant="ghost" onClick={() => setShowActionsSheet(false)} className="flex-1">
                Annulla
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
