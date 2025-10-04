import { useEffect, useRef, useCallback, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Star, Paperclip, Loader2, List, LayoutGrid, Maximize2, Trash2, Archive, Forward, CheckCircle2, FolderInput, Tag, MoreHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Email {
  id: string;
  subject: string;
  from: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  hasAttachments: boolean;
  hasGroup?: boolean;
  groupName?: string;
  hasRule?: boolean;
}

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  emailDetail?: {
    id: string;
    subject: string;
    from: string;
    body: string;
  } | null;
  isLoadingDetail?: boolean;
  onOpenDetailPopup?: () => void;
  onBulkDelete?: (emailIds: string[]) => void;
  onBulkArchive?: (emailIds: string[]) => void;
  onBulkForward?: (emailIds: string[]) => void;
  onBulkMarkAsRead?: (emailIds: string[]) => void;
  onBulkMoveToFolder?: (emailIds: string[], folder: string) => void;
}

type ViewMode = 'list' | 'grid';

export const EmailList = ({ 
  emails, 
  selectedEmailId, 
  onEmailSelect,
  loading,
  onLoadMore,
  hasMore,
  isLoadingMore,
  emailDetail,
  isLoadingDetail,
  onOpenDetailPopup,
  onBulkDelete,
  onBulkArchive,
  onBulkForward,
  onBulkMarkAsRead,
  onBulkMoveToFolder
}: EmailListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastEmailRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [targetFolder, setTargetFolder] = useState<string>('INBOX');
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [selectedEmailForActions, setSelectedEmailForActions] = useState<Email | null>(null);
  const [selectedDestinationFolder, setSelectedDestinationFolder] = useState<string>('INBOX');
  const [selectedAction, setSelectedAction] = useState<'archive' | 'move' | 'delete' | null>(null);

  const filteredEmails = showUnreadOnly ? emails.filter(email => !email.read) : emails;

  const handleToggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmailIds);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmailIds(newSelected);
  };

  const handleExecuteBulkAction = () => {
    const emailIds = Array.from(selectedEmailIds);
    if (emailIds.length === 0) return;

    switch (bulkAction) {
      case 'delete':
        onBulkDelete?.(emailIds);
        break;
      case 'archive':
        onBulkArchive?.(emailIds);
        break;
      case 'forward':
        onBulkForward?.(emailIds);
        break;
      case 'mark-read':
        onBulkMarkAsRead?.(emailIds);
        break;
      case 'move':
        onBulkMoveToFolder?.(emailIds, targetFolder);
        break;
    }
    setSelectedEmailIds(new Set());
    setBulkAction('');
  };

  // Reset selection when multi-select mode is disabled
  useEffect(() => {
    if (!multiSelectMode) {
      setSelectedEmailIds(new Set());
      setBulkAction('');
    }
  }, [multiSelectMode]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const element = lastEmailRef.current;
    if (!element) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, emails.length]);
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Mail className="mb-4 h-16 w-16 opacity-20" />
        <p className="text-lg font-medium">No emails found</p>
        <p className="text-sm">Try syncing your mailbox</p>
      </div>
    );
  }


  const renderListView = () => (
    <div className="space-y-2 py-4 pl-6 pr-[34px] w-full max-w-full overflow-x-hidden">
      {filteredEmails.map((email, index) => (
        <Card
          key={email.id}
          ref={index === filteredEmails.length - 1 ? lastEmailRef : null}
          className={cn(
            'relative cursor-pointer border-l-4 p-0 overflow-hidden transition-colors transition-shadow transition-transform duration-200 w-full max-w-full',
            'before:content-[""] before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:z-10',
            'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:z-10',
            email.read 
              ? 'border-l-transparent bg-gradient-to-bl from-purple-400/15 via-purple-400/8 via-35% to-transparent hover:from-purple-300/20 hover:via-purple-300/12 hover:shadow-[-3px_3px_5px_0px_rgba(216,180,254,0.4)] hover:scale-[1.01] before:bg-gradient-to-r before:from-purple-400/65 before:via-black before:via-40% before:to-transparent after:bg-gradient-to-r after:from-purple-400/65 after:via-black after:via-40% after:to-transparent'
              : 'border-l-orange-500/50 bg-gradient-to-bl from-orange-400/15 via-orange-400/8 via-35% to-transparent hover:from-orange-300/20 hover:via-orange-300/12 hover:shadow-[-3px_3px_5px_0px_rgba(253,186,116,0.45)] hover:scale-[1.01] before:bg-gradient-to-r before:from-orange-400/65 before:via-black before:via-40% before:to-transparent after:bg-gradient-to-r after:from-orange-400/65 after:via-black after:via-40% after:to-transparent',
            selectedEmailId === email.id && (
              email.read 
                ? 'bg-gradient-to-bl from-purple-400/25 via-purple-400/15 via-35% to-transparent border-purple-500/30 shadow-[-3px_3px_5px_0px_rgba(216,180,254,0.5)] scale-[1.01] !border-red-500'
                : 'bg-gradient-to-bl from-orange-400/25 via-orange-400/15 via-35% to-transparent border-orange-500/50 shadow-[-3px_3px_5px_0px_rgba(253,186,116,0.55)] scale-[1.01] !border-red-500'
            ),
            selectedEmailIds.has(email.id) && 'ring-2 ring-primary'
          )}
          onClick={() => multiSelectMode ? handleToggleEmailSelection(email.id) : onEmailSelect(email.id)}
        >
          <div className="flex items-stretch">
            {multiSelectMode && (
              <div className="flex items-center justify-center px-3">
                <Checkbox
                  checked={selectedEmailIds.has(email.id)}
                  onCheckedChange={() => handleToggleEmailSelection(email.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="flex-1 min-w-0 p-3 relative">
              <div className="flex items-center gap-4">
                <div className="min-w-[200px]">
                  <p className={cn(
                    'truncate text-sm',
                    !email.read && 'font-semibold text-email-unread'
                  )}>
                    {email.from}
                  </p>
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    'truncate text-sm',
                    !email.read && 'font-semibold'
                  )}>
                    {email.subject || '(No Subject)'}
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                  </span>
                  {!email.read && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">New</Badge>
                  )}
                  {email.starred && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                  {email.hasAttachments && (
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  )}
                  {!multiSelectMode && selectedEmailId === email.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover z-50">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmailForActions(email);
                          setShowActionsSheet(true);
                        }}>
                          <Tag className="mr-2 h-4 w-4" />
                          Gestisci Regole
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archivia
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <FolderInput className="mr-2 h-4 w-4" />
                          Sposta in...
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => e.stopPropagation()}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              {/* Indicatori gruppo/regola in basso a sinistra */}
              <div className="absolute bottom-1 left-3 flex items-center gap-2">
                {email.hasGroup && (
                  <div className="flex items-center gap-1 text-xs text-blue-400">
                    <Users className="h-3 w-3" />
                    <span className="font-medium">{email.groupName || 'Gruppo'}</span>
                  </div>
                )}
                {email.hasRule && (
                  <div className="text-xs font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                    R
                  </div>
                )}
              </div>
            </div>
            <div className="w-[30px] bg-black flex items-center justify-center flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEmailSelect(email.id);
                  onOpenDetailPopup?.();
                }}
                className="p-0 h-full w-full hover:bg-white/10"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderGridView = () => (
    <div className="space-y-3 py-4 pl-6 pr-[34px] w-full max-w-full overflow-x-hidden">
      {filteredEmails.map((email, index) => (
        <Card
          key={email.id}
          ref={index === filteredEmails.length - 1 ? lastEmailRef : null}
          className={cn(
            'relative cursor-pointer border-l-4 p-0 overflow-hidden transition-colors transition-shadow transition-transform duration-200 w-full max-w-full',
            'before:content-[""] before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:z-10',
            'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:z-10',
            email.read 
              ? 'border-l-transparent bg-gradient-to-bl from-purple-400/15 via-purple-400/8 via-35% to-transparent hover:from-purple-300/20 hover:via-purple-300/12 hover:shadow-[-3px_3px_5px_0px_rgba(216,180,254,0.4)] hover:scale-[1.02] before:bg-gradient-to-r before:from-purple-400/65 before:via-black before:via-40% before:to-transparent after:bg-gradient-to-r after:from-purple-400/65 after:via-black after:via-40% after:to-transparent'
              : 'border-l-orange-500/50 bg-gradient-to-bl from-orange-400/15 via-orange-400/8 via-35% to-transparent hover:from-orange-300/20 hover:via-orange-300/12 hover:shadow-[-3px_3px_5px_0px_rgba(253,186,116,0.45)] hover:scale-[1.02] before:bg-gradient-to-r before:from-orange-400/65 before:via-black before:via-40% before:to-transparent after:bg-gradient-to-r after:from-orange-400/65 after:via-black after:via-40% after:to-transparent',
            selectedEmailId === email.id && (
              email.read 
                ? 'bg-gradient-to-bl from-purple-400/25 via-purple-400/15 via-35% to-transparent border-purple-500/30 shadow-[-3px_3px_5px_0px_rgba(216,180,254,0.5)] scale-[1.02] !border-red-500'
                : 'bg-gradient-to-bl from-orange-400/25 via-orange-400/15 via-35% to-transparent border-orange-500/50 shadow-[-3px_3px_5px_0px_rgba(253,186,116,0.55)] scale-[1.02] !border-red-500'
            ),
            selectedEmailIds.has(email.id) && 'ring-2 ring-primary'
          )}
          onClick={() => multiSelectMode ? handleToggleEmailSelection(email.id) : onEmailSelect(email.id)}
        >
          <div className="flex items-stretch">
            {multiSelectMode && (
              <div className="flex items-center justify-center px-3">
                <Checkbox
                  checked={selectedEmailIds.has(email.id)}
                  onCheckedChange={() => handleToggleEmailSelection(email.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="flex-1 p-4 relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'truncate text-sm',
                      !email.read && 'font-semibold text-email-unread'
                    )}>
                      {email.from}
                    </p>
                    {!email.read && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <h3 className={cn(
                    'truncate text-base mt-1',
                    !email.read && 'font-semibold'
                  )}>
                    {email.subject || '(No Subject)'}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                    </span>
                    {!multiSelectMode && selectedEmailId === email.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover z-50">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmailForActions(email);
                            setShowActionsSheet(true);
                          }}>
                            <Tag className="mr-2 h-4 w-4" />
                            Gestisci Regole
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archivia
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <FolderInput className="mr-2 h-4 w-4" />
                            Sposta in...
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => e.stopPropagation()}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {email.starred && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    {email.hasAttachments && (
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              {/* Indicatori gruppo/regola in basso a sinistra */}
              <div className="absolute bottom-2 left-4 flex items-center gap-2">
                {email.hasGroup && (
                  <div className="flex items-center gap-1 text-xs text-blue-400">
                    <Users className="h-3 w-3" />
                    <span className="font-medium">{email.groupName || 'Gruppo'}</span>
                  </div>
                )}
                {email.hasRule && (
                  <div className="text-xs font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                    R
                  </div>
                )}
              </div>
            </div>
            <div className="w-[30px] bg-black flex items-center justify-center flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEmailSelect(email.id);
                  onOpenDetailPopup?.();
                }}
                className="p-0 h-full w-full hover:bg-white/10"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );


  return (
    <>
      <div className="flex flex-col gap-2 p-2 px-4 border-b">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Switch
                id="unread-only"
                checked={showUnreadOnly}
                onCheckedChange={setShowUnreadOnly}
              />
              <Label htmlFor="unread-only" className="text-xs cursor-pointer whitespace-nowrap">
                Solo non lette
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch
                id="multi-select"
                checked={multiSelectMode}
                onCheckedChange={setMultiSelectMode}
              />
              <Label htmlFor="multi-select" className="text-xs cursor-pointer whitespace-nowrap">
                Selezione multipla
              </Label>
            </div>

            {multiSelectMode && (
              <div className="flex items-center gap-1 flex-wrap">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-[100px] h-7 text-[11px]">
                    <SelectValue placeholder="Azione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="delete">
                      <div className="flex items-center gap-1.5">
                        <Trash2 className="h-3 w-3" />
                        <span className="text-xs">Elimina</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="archive">
                      <div className="flex items-center gap-1.5">
                        <Archive className="h-3 w-3" />
                        <span className="text-xs">Archivia</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="forward">
                      <div className="flex items-center gap-1.5">
                        <Forward className="h-3 w-3" />
                        <span className="text-xs">Inoltra</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mark-read">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="text-xs">Letta</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="move">
                      <div className="flex items-center gap-1.5">
                        <FolderInput className="h-3 w-3" />
                        <span className="text-xs">Sposta</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {bulkAction === 'move' && (
                  <Select value={targetFolder} onValueChange={setTargetFolder}>
                    <SelectTrigger className="w-[90px] h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="INBOX">Inbox</SelectItem>
                      <SelectItem value="Sent">Inviati</SelectItem>
                      <SelectItem value="Drafts">Bozze</SelectItem>
                      <SelectItem value="Spam">Spam</SelectItem>
                      <SelectItem value="Trash">Cestino</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Button
                  onClick={handleExecuteBulkAction}
                  disabled={selectedEmailIds.size === 0 || !bulkAction}
                  size="sm"
                  className="h-7 text-[11px] px-2"
                >
                  Esegui ({selectedEmailIds.size})
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {multiSelectMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowActionsSheet(true)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="h-full" ref={scrollRef}>
        {viewMode === 'list' && renderListView()}
        {viewMode === 'grid' && renderGridView()}
        
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </ScrollArea>

      <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
        <SheetContent className="bg-background z-[100]">
          <SheetHeader>
            <SheetTitle>Azioni e Regole</SheetTitle>
            <SheetDescription>
              {multiSelectMode && selectedEmailIds.size > 0 ? (
                <>
                  Gestisci regole per {selectedEmailIds.size} mittenti selezionati:
                  <div className="mt-2 space-y-1">
                    {Array.from(selectedEmailIds).slice(0, 3).map(id => {
                      const email = emails.find(e => e.id === id);
                      return email ? (
                        <div key={id} className="relative text-xs font-mono px-2 py-1 rounded bg-gradient-to-r from-purple-500/10 via-purple-500/10 via-40% to-transparent backdrop-blur-[0.5px] after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gradient-to-r after:from-[hsl(15,55%,45%,0.65)] after:via-black after:via-40% after:to-transparent after:translate-y-full after:rounded-sm">
                          {email.from}
                        </div>
                      ) : null;
                    })}
                    {selectedEmailIds.size > 3 && (
                      <div className="text-xs text-muted-foreground">
                        ...e altri {selectedEmailIds.size - 3}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                `Gestisci azioni e regole per: ${selectedEmailForActions?.from}`
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-4 text-center">Azioni Rapide</h3>
              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-border/30">
                <button
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:scale-105",
                    selectedAction === 'archive' 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedAction('archive')}
                >
                  <Archive className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">Archivia</span>
                </button>

                <button
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:scale-105",
                    selectedAction === 'move' 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedAction('move')}
                >
                  <FolderInput className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">Sposta</span>
                </button>

                <button
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:scale-105",
                    selectedAction === 'delete' 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedAction('delete')}
                >
                  <Trash2 className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">Elimina</span>
                </button>
              </div>

              {selectedAction === 'move' && (
                <div className="mt-4">
                  <Label className="text-sm mb-2 block">Seleziona cartella di destinazione:</Label>
                  <Select value={selectedDestinationFolder} onValueChange={setSelectedDestinationFolder}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona cartella" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[200]">
                      <SelectItem value="INBOX">Inbox</SelectItem>
                      <SelectItem value="Sent">Inviati</SelectItem>
                      <SelectItem value="Drafts">Bozze</SelectItem>
                      <SelectItem value="Spam">Spam</SelectItem>
                      <SelectItem value="Trash">Cestino</SelectItem>
                      <SelectItem value="Archive">Archivio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Regole Mittente</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea regole automatiche per le email da {multiSelectMode && selectedEmailIds.size > 0 
                  ? `questi ${selectedEmailIds.size} mittenti` 
                  : 'questo mittente'}
              </p>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full transition-colors",
                  selectedAction && "bg-green-500/20 border-green-500 hover:bg-green-500/30"
                )}
                onClick={() => {
                  if (!selectedAction) return;

                  const emailIds = multiSelectMode && selectedEmailIds.size > 0
                    ? Array.from(selectedEmailIds)
                    : selectedEmailForActions ? [selectedEmailForActions.id] : [];
                  
                  if (emailIds.length === 0) return;

                  switch (selectedAction) {
                    case 'archive':
                      onBulkArchive?.(emailIds);
                      break;
                    case 'move':
                      onBulkMoveToFolder?.(emailIds, selectedDestinationFolder);
                      break;
                    case 'delete':
                      onBulkDelete?.(emailIds);
                      break;
                  }

                  if (multiSelectMode && selectedEmailIds.size > 0) {
                    const selectedSenders = Array.from(selectedEmailIds).map(id => {
                      const email = emails.find(e => e.id === id);
                      return email?.from;
                    }).filter(Boolean);
                    console.log('Crea regola per mittenti:', selectedSenders);
                  } else {
                    console.log('Crea regola per:', selectedEmailForActions?.from);
                  }
                  
                  setShowActionsSheet(false);
                  setSelectedEmailIds(new Set());
                  setSelectedAction(null);
                }}
                disabled={!selectedAction}
              >
                <Tag className="mr-2 h-4 w-4" />
                Crea Nuova Regola {multiSelectMode && selectedEmailIds.size > 0 && `(${selectedEmailIds.size})`}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
