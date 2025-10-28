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
  User as UserIcon
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

interface RadioConversationsSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onCloseSidebar?: () => void;
  onGenerateSummary?: (conversationId: string) => void;
  onGenerateFullReport?: (conversationId: string) => void;
}

export const RadioConversationsSidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onUpdateTitle,
  onCloseSidebar,
  onGenerateSummary,
  onGenerateFullReport
}: RadioConversationsSidebarProps) => {
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
    <div className="flex flex-col h-full bg-transparent">
      {/* Header with Title + Close Button */}
      <div className="flex items-center justify-between p-4 border-b bg-transparent">
        <h2 className="text-lg font-semibold">Conversazioni</h2>
        <button
          onClick={onCloseSidebar}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Compact Header */}
      <div className="p-3 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
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
              <PopoverContent className="w-80 pointer-events-auto" align="start">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca per titolo..."
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

            {/* Date Filter */}
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
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
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
                // 🆕 Reset filtri prima di creare nuova conversazione
                setSearchQuery("");
                setDateRange(undefined);
                console.log("🔄 Filtri sidebar resettati");
                
                onNewConversation();
                onCloseSidebar?.();
              }}
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:animate-wiggle transition-all"
              title="Nuova conversazione"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Conversation Count */}
          <Badge 
            variant="secondary" 
            className="h-9 px-3 text-base font-semibold flex items-center gap-2 bg-transparent border border-border hover:bg-transparent transition-colors"
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
                  : "Inizia una nuova chat Radio"
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
                      : 'bg-transparent border-border/20 hover:border-border/40 hover:bg-transparent after:bg-gradient-to-r after:from-white/65 after:via-black after:via-40% after:to-transparent hover:after:animate-line-bounce'
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
                    {/* Title + Tokens */}
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

                    {/* Participants + Message Count + Actions */}
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
                      
                      {/* Actions */}
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

                    {/* Date */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(conv.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                  </>
                )}
              </div>
                </HoverCardTrigger>
                <HoverCardContent side="right" className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{conv.titolo || "Senza titolo"}</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Creata: {format(new Date(conv.created_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}</p>
                      <p>Messaggi: {conv.message_count || 0}</p>
                      <p>Token totali: {formatTokens(conv.total_tokens)}</p>
                    </div>
                    {conv.riassunto_contesto && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {conv.riassunto_contesto}
                        </p>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
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
              Sei sicuro di voler eliminare questa conversazione? Tutti i messaggi verranno persi.
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
  );
};
