import { format } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
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
  FolderCog,
  User,
  Users,
  Megaphone
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
  onMarkAsRead
}: EmailDetailProps) => {
  const [senderGroups, setSenderGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [currentSenderGroup, setCurrentSenderGroup] = useState<string | null>(null);

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
  // Validate and parse date safely
  const emailDate = (() => {
    try {
      const date = new Date(email.date);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', email.date);
        return new Date(); // Fallback to current date
      }
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date();
    }
  })();

  // Process email body to replace cid: references with base64 images
  const processedBody = useMemo(() => {
    if (!email.body || !email.attachments) return email.body;
    
    console.log('Email attachments:', email.attachments);
    console.log('Email body:', email.body);
    
    let htmlBody = email.body;
    
    // Replace cid: references with base64 data
    email.attachments.forEach((attachment: any) => {
      console.log('Processing attachment:', {
        filename: attachment.filename,
        content_id: attachment.content_id,
        contentId: attachment.contentId,
        cid: attachment.cid,
        hasData: !!attachment.data
      });
      
      // Try multiple possible content_id field names
      const contentId = attachment.content_id || attachment.contentId || attachment.cid;
      
      if (attachment.data) {
        const mimeType = attachment.mimetype || attachment.content_type || 'image/png';
        
        // Clean base64 data - remove any data URL prefix if present
        let base64Data = attachment.data;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        if (contentId) {
          // Remove < and > brackets if present
          const cleanContentId = contentId.replace(/[<>]/g, '');
          console.log('Replacing cid:', cleanContentId);
          
          // Replace all occurrences of cid:contentId with properly formatted data URI
          const cidPattern = new RegExp(`cid:${cleanContentId}`, 'gi');
          htmlBody = htmlBody.replace(
            cidPattern, 
            `data:${mimeType};base64,${base64Data}`
          );
        } else {
          // If no content_id, try to extract from all cid: references in the HTML
          const cidMatches = htmlBody.match(/cid:([^"'\s]+)/gi);
          console.log('Found cid references:', cidMatches);
          
          if (cidMatches && cidMatches.length > 0) {
            // Try to match by filename or replace all cid: references
            cidMatches.forEach(cidMatch => {
              const cidValue = cidMatch.replace('cid:', '');
              console.log('Attempting to replace cid:', cidValue);
              htmlBody = htmlBody.replace(
                cidMatch,
                `data:${mimeType};base64,${base64Data}`
              );
            });
          }
        }
      }
    });
    
    console.log('Processed HTML body:', htmlBody.substring(0, 500));
    return htmlBody;
  }, [email.body, email.attachments]);

  // Filter out inline attachments (those with content_id)
  const downloadableAttachments = useMemo(() => {
    if (!email.attachments) return [];
    return email.attachments.filter((attachment: any) => 
      !attachment.content_id && !attachment.contentId
    );
  }, [email.attachments]);

  const handleDownloadAttachment = (attachment: any) => {
    try {
      if (!attachment.data) {
        toast.error('Attachment content not available');
        return;
      }
      
      downloadBase64File(
        attachment.data,
        attachment.filename,
        attachment.mimetype
      );
      
      toast.success(`Downloaded ${attachment.filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download attachment');
    }
  };

  return (
    <div className="flex h-full flex-col bg-card-transparent">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between border-b p-6 md:p-8 gap-4 bg-card-transparent">
        {/* Left: Reply actions */}
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={onReply} className="flex-col h-auto py-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Reply className="h-8 w-8" />
              <User className="h-6 w-6" />
            </div>
            <span className="text-xs">Rispondi</span>
          </Button>
          <Button variant="outline" size="lg" onClick={onReplyAll} className="flex-col h-auto py-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <ReplyAll className="h-8 w-8" />
              <Users className="h-6 w-6" />
            </div>
            <span className="text-xs">Rispondi a tutti</span>
          </Button>
          <Button variant="outline" size="lg" onClick={onForward} className="flex-col h-auto py-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Forward className="h-8 w-8" />
              <Megaphone className="h-6 w-6" />
            </div>
            <span className="text-xs">Inoltra</span>
          </Button>
        </div>

        {/* Center: Navigation and star */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="flex-col h-auto py-3 px-4"
            >
              <ChevronLeft className="h-8 w-8 mb-1" />
              <span className="text-xs">Precedente</span>
            </Button>
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={onNext}
              disabled={!hasNext}
              className="flex-col h-auto py-3 px-4"
            >
              <ChevronRight className="h-8 w-8 mb-1" />
              <span className="text-xs">Successiva</span>
            </Button>
          </div>
          <Button variant="ghost" size="lg" className="flex-col h-auto py-3 px-4">
            <Star className="h-8 w-8 mb-1" />
            <span className="text-xs">Preferito</span>
          </Button>
        </div>

        {/* Right: Rules and delete */}
        <div className="flex gap-3 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="flex-col h-auto py-3 px-4">
                <FolderCog className="h-8 w-8 mb-1" />
                <span className="text-xs">Regole</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
          
          {onDelete && (
            <Button variant="destructive" size="lg" onClick={onDelete} className="flex-col h-auto py-3 px-4">
              <Trash2 className="h-8 w-8 mb-1" />
              <span className="text-xs">Elimina</span>
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-4 bg-card-transparent">
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-4">{email.subject}</h1>
            
            <Card className="bg-card-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{email.from}</p>
                    <div className="text-sm text-muted-foreground">
                      <p>To: {email.to.join(', ')}</p>
                      {email.cc && email.cc.length > 0 && (
                        <p>Cc: {email.cc.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(emailDate, 'PPp')}
                  </span>
                </div>
              </CardHeader>
            </Card>
          </div>

          {downloadableAttachments.length > 0 && (
            <Card className="bg-card-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Paperclip className="h-4 w-4" />
                  {downloadableAttachments.length} Attachment{downloadableAttachments.length !== 1 && 's'}
                </div>
                <div className="space-y-2">
                  {downloadableAttachments.map((attachment: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: processedBody }}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
