import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Users,
  Search,
  Calendar,
  Sparkles,
  FileText,
  Cpu,
  Bot,
  User as UserIcon,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface Conversation {
  id: string;
  titolo: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  total_tokens?: number;
  riassunto_contesto?: string | null;
  active_participants?: Array<{name: string, type: string}>;
}

interface ConversationsSidebarProps {
  isOpen: boolean;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onGenerateSummary?: (id: string) => void;
  onGenerateFullReport?: (id: string) => void;
  onCloseSidebar?: () => void;
  onFocusTextarea?: () => void;
}

export const ConversationsSidebar = ({
  isOpen,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onUpdateTitle,
  onGenerateSummary,
  onGenerateFullReport,
  onCloseSidebar,
  onFocusTextarea
}: ConversationsSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.titolo || "Nuova conversazione");
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onUpdateTitle(editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleDeleteClick = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setConversationToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd MMM yyyy HH:mm", { locale: it });
    } catch {
      return "";
    }
  };

  const formatTokens = (tokens?: number): string => {
    if (!tokens) return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const getParticipantIcons = (participants?: Array<{name: string, type: string}>) => {
    const iconMap = {
      'chatgpt': { icon: Sparkles, color: 'text-green-500' },
      'gemini': { icon: Cpu, color: 'text-blue-500' },
      'claude': { icon: Bot, color: 'text-purple-500' },
      'human': { icon: UserIcon, color: 'text-muted-foreground' }
    };
    
    const aiParticipants = participants?.filter(p => p.type !== 'human') || [];
    
    return aiParticipants
      .slice(0, 3)
      .map(p => ({
        ...iconMap[p.type as keyof typeof iconMap] || iconMap.human,
        name: p.name
      }));
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchQuery === "" || 
      conv.titolo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.riassunto_contesto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.active_participants?.some(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesDate = !dateRange?.from || !dateRange?.to || (
      new Date(conv.created_at) >= dateRange.from &&
      new Date(conv.created_at) <= dateRange.to
    );
    
    return matchesSearch && matchesDate;
  });

  return (
    <>
      {/* Backdrop - UNIFORMATO */}
      {isOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 top-14 bg-transparent z-40 animate-in fade-in"
          onClick={onCloseSidebar}
        />
      )}

      {/* Sidebar - UNIFORMATO */}
      <div className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-80 bg-background border-r z-50",
        "transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full bg-background">
      {/* Compact Header - Single Row */}
      <div className="p-3 border-b border-border/40 bg-background">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Icon Actions */}
          <div className="flex items-center gap-1">
            {/* Search Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:animate-wiggle transition-all"
                  title="Cerca conversazioni"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca per titolo, argomento..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                      autoFocus
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Date Filter Popover */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:animate-wiggle transition-all"
                  title="Filtra per data"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Seleziona periodo</span>
                    {(dateRange?.from || dateRange?.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateRange(undefined);
                          setShowDatePicker(false);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Rimuovi
                      </Button>
                    )}
                  </div>
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from && range?.to) {
                        setShowDatePicker(false);
                      }
                    }}
                    className="pointer-events-auto"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* New Conversation */}
            <Button
              onClick={() => {
                onNewConversation();
                onCloseSidebar?.();
                setTimeout(() => onFocusTextarea?.(), 100);
              }}
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:animate-wiggle transition-all"
              title="Nuova conversazione"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Conversation Count Badge */}
          <Badge 
            variant="secondary" 
            className="h-9 px-3 text-base font-semibold flex items-center gap-2 bg-muted hover:bg-muted/80 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            {filteredConversations.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery || dateRange?.from ? "Nessun risultato" : "Nessuna conversazione"}
              </p>
              <p className="text-xs mt-1">
                {searchQuery || dateRange?.from 
                  ? "Prova a modificare i filtri di ricerca" 
                  : "Inizia una nuova discussione multi-agente"
                }
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <HoverCard openDelay={300} key={conv.id}>
                <HoverCardTrigger asChild>
                <div
                  className={cn(
                    "group relative p-3 rounded-lg border transition-all duration-200 overflow-hidden cursor-pointer",
                    "after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-[60%] after:h-[1px] after:origin-left",
                    currentConversationId === conv.id 
                      ? 'bg-email-selected border-primary/40 after:bg-gradient-to-r after:from-purple-400/65 after:via-purple-600 after:via-40% after:to-transparent' 
                      : 'bg-card/95 backdrop-blur border-border/20 hover:border-border/40 hover:bg-transparent after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent hover:after:animate-line-bounce'
                  )}
                  onClick={() => !editingId && onSelectConversation(conv.id)}
                >
                {editingId === conv.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={handleSaveEdit}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={handleCancelEdit}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Riga 1: Titolo + Token */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={cn(
                        "text-sm font-semibold line-clamp-2 flex-1 max-w-[calc(100%-60px)] transition-all duration-200",
                        "group-hover:scale-105",
                        currentConversationId === conv.id ? "text-purple-300 scale-105" : ""
                      )}>
                        {conv.titolo || "Nuova conversazione"}
                      </h4>
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap flex-shrink-0 self-start">
                        {formatTokens(conv.total_tokens)}
                      </span>
                    </div>

                    {/* Riga 2: Partecipanti Icons + Numero messaggi + Azioni */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {getParticipantIcons(conv.active_participants).map((p, i) => {
                            const Icon = p.icon;
                            return <Icon key={i} className={cn("w-3.5 h-3.5", p.color)} />;
                          })}
                          {conv.active_participants && conv.active_participants.filter(p => p.type !== 'human').length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{conv.active_participants.filter(p => p.type !== 'human').length - 3}</span>
                          )}
                        </div>
                        <Badge variant="secondary" className={cn(
                          "ml-2 h-5 min-w-5 px-1.5 flex-shrink-0 bg-transparent border font-medium",
                          currentConversationId === conv.id 
                            ? "text-purple-300 border-purple-300" 
                            : "text-foreground border-border"
                        )}>
                          {conv.message_count || 0}
                        </Badge>
                      </div>
                      
                      {/* Azioni hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onGenerateSummary && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            title="Genera riassunto"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateSummary(conv.id);
                            }}
                          >
                            <Sparkles className="w-3 h-3" />
                          </Button>
                        )}
                        {onGenerateFullReport && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            title="Genera report completo"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateFullReport(conv.id);
                            }}
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(conv);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(conv.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Riga 3: Data/ora in basso */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(conv.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>

                    {/* Riga 4: Anteprima riassunto (se disponibile) - solo per mobile */}
                    {conv.riassunto_contesto && isMobile && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-2">
                        {conv.riassunto_contesto}
                      </p>
                    )}
                  </>
                )}
                </div>
              </HoverCardTrigger>
              
              {/* HoverCard per Desktop con Riassunto */}
              {conv.riassunto_contesto && !isMobile && (
                <HoverCardContent 
                  side="right" 
                  align="start"
                  className="w-80 bg-card/95 backdrop-blur border-border/40 shadow-xl"
                >
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Anteprima Conversazione
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {conv.riassunto_contesto}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {conv.message_count} messaggi
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {formatTokens(conv.total_tokens)}
                      </span>
                    </div>
                  </div>
                </HoverCardContent>
              )}
            </HoverCard>
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina conversazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa conversazione? Tutti i messaggi e i dati associati verranno persi permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </>
  );
};