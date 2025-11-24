import { useEffect, useRef, useCallback, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Star, Paperclip, Loader2, List, LayoutGrid, Maximize2, Trash2, Archive, Forward, CheckCircle2, FolderInput, Tag, MoreHorizontal, MoreVertical, Users, Settings, Zap } from 'lucide-react';
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
  group?: string;
  hasRules?: boolean;
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
  isDownloading?: boolean;
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
  onBulkMoveToFolder,
  isDownloading = false
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

  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!multiSelectMode) {
      setSelectedEmailIds(new Set());
      setBulkAction('');
    }
  }, [multiSelectMode]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      loadMoreTimeoutRef.current = setTimeout(() => {
        onLoadMore();
      }, 300);
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

  console.log('📧 EmailList render:', {
    loading,
    isDownloading,
    emailsLength: emails?.length,
    filteredEmailsLength: filteredEmails?.length,
    showingLoading: loading && !isDownloading && (!emails || emails.length === 0),
    showingEmptyState: !emails || emails.length === 0
  });

  // ✅ Solo mostrar loading si NO hay emails para mostrar
  if (loading && !isDownloading && (!emails || emails.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Mail className="mb-4 opacity-20" />
        <p className="text-lg font-medium">No emails found</p>
        <p className="text-sm">Try syncing your mailbox</p>
      </div>
    );
  }


  // Email cards rendering functions removed
  // ✅ Complete backup saved in DB: ui_component_backups
  // Query to restore: SELECT * FROM ui_component_backups WHERE component_name = 'tmwe-email-cards'
  
  const renderListView = () => {
    return (
      <div className="space-y-2 sm:space-y-3 p-2">
        {filteredEmails.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Nessuna email da visualizzare</p>
          </div>
        ) : (
          filteredEmails.map((email, index) => (
            <Card
              key={email.id}
              ref={index === filteredEmails.length - 1 ? lastEmailRef : null}
              className={cn(
                "rounded-lg border p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden",
                email.read 
                  ? "border-l-2 border-l-muted hover:scale-[1.01] bg-card/50 shadow-sm" 
                  : "bg-gradient-to-r from-primary/5 via-transparent to-transparent border-l-4 border-l-primary/60 hover:scale-[1.01] bg-card shadow-sm before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-2 before:bg-primary before:rounded-full before:animate-pulse",
                selectedEmailId === email.id && "ring-2 ring-primary bg-primary/5",
                multiSelectMode && selectedEmailIds.has(email.id) && "ring-2 ring-yellow-400"
              )}
              onClick={() => multiSelectMode ? handleToggleEmailSelection(email.id) : onEmailSelect(email.id)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {multiSelectMode && (
                      <Checkbox
                        checked={selectedEmailIds.has(email.id)}
                        onClick={(e) => { e.stopPropagation(); handleToggleEmailSelection(email.id); }}
                        className="shrink-0"
                      />
                    )}
                    <div className="font-medium text-sm sm:text-base truncate">
                      {email.from}
                    </div>
                    {email.group && (
                      <Badge className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium animate-fade-in animate-scale-in",
                        email.group === 'blue' && "bg-blue-500/20 text-blue-700 dark:text-blue-300",
                        email.group === 'green' && "bg-green-500/20 text-green-700 dark:text-green-300",
                        email.group === 'orange' && "bg-orange-500/20 text-orange-700 dark:text-orange-300",
                        email.group === 'purple' && "bg-purple-500/20 text-purple-700 dark:text-purple-300",
                        !email.group && "bg-gray-500/20 text-gray-700 dark:text-gray-300"
                      )}>
                        {email.group}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.hasRules && (
                      <div title="Ha regole attive">
                        <Zap className="h-4 w-4 text-blue-500" />
                      </div>
                    )}
                    {email.hasAttachments && (
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    )}
                    {email.starred && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onEmailSelect(email.id);
                        onOpenDetailPopup?.();
                      }}
                      className="p-1.5 rounded-md hover:bg-primary/10 transition-all duration-200 hover:animate-wiggle group"
                      title="Visualizza corpo email"
                    >
                      <Maximize2 className="h-4 w-4 group-hover:animate-wiggle" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="shrink-0 p-1.5 rounded-md hover:bg-primary/10">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-popover z-50">
                        <DropdownMenuItem onClick={() => onEmailSelect(email.id)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Apri
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onBulkArchive?.([email.id]);
                        }}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archivia
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onBulkDelete?.([email.id]);
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className={cn(
                  "text-sm font-semibold truncate",
                  !email.read && "font-bold"
                )}>
                  {email.subject}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {email.preview}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {email.date && !isNaN(new Date(email.date).getTime()) 
                      ? (() => {
                          const emailDate = new Date(email.date);
                          const now = new Date();
                          const diffInHours = Math.abs(now.getTime() - emailDate.getTime()) / 36e5;
                          
                          // Si es de hoy, mostrar "hace X tiempo"
                          if (diffInHours < 24) {
                            return formatDistanceToNow(emailDate, { addSuffix: true, locale: it });
                          }
                          // Si es reciente (menos de 7 días), mostrar "hace X días"
                          else if (diffInHours < 168) {
                            return formatDistanceToNow(emailDate, { addSuffix: true, locale: it });
                          }
                          // Si es más antiguo, mostrar fecha completa
                          else {
                            return format(emailDate, 'dd MMM yyyy, HH:mm', { locale: it });
                          }
                        })()
                      : 'Data non disponibile'}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    );
  };

  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-2">
        {filteredEmails.length === 0 ? (
          <div className="col-span-full flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Nessuna email da visualizzare</p>
          </div>
        ) : (
          filteredEmails.map((email, index) => (
            <Card
              key={email.id}
              ref={index === filteredEmails.length - 1 ? lastEmailRef : null}
              className={cn(
                "min-h-[120px] rounded-lg border p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden",
                email.read 
                  ? "border-l-2 border-l-muted hover:scale-[1.01] bg-card/50 shadow-sm" 
                  : "bg-gradient-to-r from-primary/5 via-transparent to-transparent border-l-4 border-l-primary/60 hover:scale-[1.01] bg-card shadow-sm before:absolute before:left-1 before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-2 before:bg-primary before:rounded-full before:animate-pulse",
                selectedEmailId === email.id && "ring-2 ring-primary bg-primary/5",
                multiSelectMode && selectedEmailIds.has(email.id) && "ring-2 ring-yellow-400"
              )}
              onClick={() => multiSelectMode ? handleToggleEmailSelection(email.id) : onEmailSelect(email.id)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    {multiSelectMode && (
                      <Checkbox
                        checked={selectedEmailIds.has(email.id)}
                        onClick={(e) => { e.stopPropagation(); handleToggleEmailSelection(email.id); }}
                        className="shrink-0"
                      />
                    )}
                    <div className={cn(
                      "text-xs font-medium truncate",
                      !email.read && "font-bold"
                    )}>
                      {email.from}
                    </div>
                    {email.group && (
                      <Badge className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 animate-fade-in animate-scale-in",
                        email.group === 'blue' && "bg-blue-500/20 text-blue-700 dark:text-blue-300",
                        email.group === 'green' && "bg-green-500/20 text-green-700 dark:text-green-300",
                        email.group === 'orange' && "bg-orange-500/20 text-orange-700 dark:text-orange-300",
                        email.group === 'purple' && "bg-purple-500/20 text-purple-700 dark:text-purple-300",
                        !email.group && "bg-gray-500/20 text-gray-700 dark:text-gray-300"
                      )}>
                        {email.group}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {email.hasRules && (
                      <div title="Ha regole attive">
                        <Zap className="h-3 w-3 text-blue-500" />
                      </div>
                    )}
                    {email.hasAttachments && (
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                    )}
                    {email.starred && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onEmailSelect(email.id);
                        onOpenDetailPopup?.();
                      }}
                      className="p-1.5 rounded-md hover:bg-primary/10 transition-all duration-200 hover:animate-wiggle group"
                      title="Visualizza corpo email"
                    >
                      <Maximize2 className="h-3 w-3 group-hover:animate-wiggle" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="shrink-0 p-1 rounded-md hover:bg-primary/10">
                        <MoreHorizontal className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-popover z-50">
                        <DropdownMenuItem onClick={() => onEmailSelect(email.id)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Apri
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onBulkArchive?.([email.id]);
                        }}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archivia
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onBulkDelete?.([email.id]);
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className={cn(
                  "text-sm font-semibold truncate",
                  !email.read && "font-bold"
                )}>
                  {email.subject}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {email.preview}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {email.date && !isNaN(new Date(email.date).getTime()) 
                      ? (() => {
                          const emailDate = new Date(email.date);
                          const now = new Date();
                          const diffInHours = Math.abs(now.getTime() - emailDate.getTime()) / 36e5;
                          
                          // Si es de hoy, mostrar "hace X tiempo"
                          if (diffInHours < 24) {
                            return formatDistanceToNow(emailDate, { addSuffix: true, locale: it });
                          }
                          // Si es reciente (menos de 7 días), mostrar "hace X días"
                          else if (diffInHours < 168) {
                            return formatDistanceToNow(emailDate, { addSuffix: true, locale: it });
                          }
                          // Si es más antiguo, mostrar fecha completa
                          else {
                            return format(emailDate, 'dd MMM yyyy, HH:mm', { locale: it });
                          }
                        })()
                      : 'Data non disponibile'}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    );
  };




  return (
    <>
      <div className="flex flex-col border-b">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="multi-select"
                  checked={multiSelectMode}
                  onCheckedChange={(checked) => {
                    setMultiSelectMode(checked);
                    if (selectedEmailId) onEmailSelect('');
                  }}
                />
                <Label htmlFor="multi-select" className="text-xs cursor-pointer whitespace-nowrap">
                  Multi
                </Label>
              </div>

            {multiSelectMode && (
              <div className="flex items-center gap-1 flex-wrap">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-auto max-w-full">
                    <SelectValue placeholder="Azione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem 
                      value="delete"
                      className="relative group overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent hover:bg-transparent hover:after:animate-line-bounce"
                    >
                      <div className="flex items-center">
                        <Trash2 className="transition-all duration-200 group-hover:scale-105 group-hover:animate-wiggle" />
                        <span className="transition-transform duration-200 group-hover:scale-110">Elimina</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="archive"
                      className="relative group overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent hover:bg-transparent hover:after:animate-line-bounce"
                    >
                      <div className="flex items-center">
                        <Archive className="transition-all duration-200 group-hover:scale-105 group-hover:animate-wiggle" />
                        <span className="transition-transform duration-200 group-hover:scale-110">Archivia</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="forward"
                      className="relative group overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent hover:bg-transparent hover:after:animate-line-bounce"
                    >
                      <div className="flex items-center">
                        <Forward className="transition-all duration-200 group-hover:scale-105 group-hover:animate-wiggle" />
                        <span className="transition-transform duration-200 group-hover:scale-110">Inoltra</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="mark-read"
                      className="relative group overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent hover:bg-transparent hover:after:animate-line-bounce"
                    >
                      <div className="flex items-center">
                        <CheckCircle2 className="transition-all duration-200 group-hover:scale-105 group-hover:animate-wiggle" />
                        <span className="transition-transform duration-200 group-hover:scale-110">Letta</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="move"
                      className="relative group overflow-hidden after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent hover:bg-transparent hover:after:animate-line-bounce"
                    >
                      <div className="flex items-center">
                        <FolderInput className="transition-all duration-200 group-hover:scale-105 group-hover:animate-wiggle" />
                        <span className="transition-transform duration-200 group-hover:scale-110">Sposta</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {bulkAction === 'move' && (
                  <Select value={targetFolder} onValueChange={setTargetFolder}>
                    <SelectTrigger className="w-auto max-w-full">
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
                  variant="ghost"
                  className={cn(
                    "h-7 text-[11px] px-2 ml-1.5 transition-colors",
                    bulkAction === 'delete'
                      ? "bg-gradient-to-bl from-red-400/25 via-red-400/15 via-35% to-transparent hover:from-red-400/30 hover:via-red-400/20 hover:bg-gradient-to-bl"
                      : "bg-gradient-to-bl from-purple-400/25 via-purple-400/15 via-35% to-transparent hover:from-purple-400/30 hover:via-purple-400/20 hover:bg-gradient-to-bl",
                    selectedEmailIds.size > 0 
                      ? "text-yellow-400" 
                      : "text-foreground"
                  )}
                >
                  Esegui ({selectedEmailIds.size})
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              id="unread-only"
              checked={showUnreadOnly}
              onCheckedChange={(checked) => {
                setShowUnreadOnly(checked);
                if (selectedEmailId) onEmailSelect('');
              }}
              className="data-[state=checked]:bg-orange-400/30"
            />
            <Label htmlFor="unread-only" className="text-xs cursor-pointer whitespace-nowrap">
              Solo non lette
            </Label>
          </div>

          <div className="flex items-center gap-1">

            {multiSelectMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowActionsSheet(true)}
              >
                <Settings className="h-4 w-4" />
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
      <ScrollArea className="h-full overflow-x-hidden" ref={scrollRef}>
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
                <Tag />
                Crea Nuova Regola {multiSelectMode && selectedEmailIds.size > 0 && `(${selectedEmailIds.size})`}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
