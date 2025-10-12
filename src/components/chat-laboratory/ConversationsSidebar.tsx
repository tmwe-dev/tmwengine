import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Check, X, MessageSquare, Coins } from "lucide-react";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Conversation {
  id: string;
  titolo: string | null;
  riassunto_contesto: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationStats {
  messageCount: number;
  totalTokensInput: number;
  totalTokensOutput: number;
}

interface GlobalStats {
  totalTokens: number;
  totalCost: number;
  conversationCount: number;
}

interface ConversationsSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationsSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
}: ConversationsSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [conversationStats, setConversationStats] = useState<Record<string, ConversationStats>>({});
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalTokens: 0,
    totalCost: 0,
    conversationCount: 0
  });

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim());
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

  // Carica statistiche per ogni conversazione
  useEffect(() => {
    const loadStats = async () => {
      const stats: Record<string, ConversationStats> = {};
      let totalTokensGlobal = 0;
      let totalCostGlobal = 0;

      for (const conv of conversations) {
        // Conta messaggi
        const { count: messageCount } = await supabase
          .from('chat_laboratory_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        // Somma token
        const { data: usageData } = await supabase
          .from('chat_laboratory_usage_stats')
          .select('token_totali_input, token_totali_output')
          .eq('conversation_id', conv.id);

        const totalInput = usageData?.reduce((sum, row) => sum + (row.token_totali_input || 0), 0) || 0;
        const totalOutput = usageData?.reduce((sum, row) => sum + (row.token_totali_output || 0), 0) || 0;
        const totalTokens = totalInput + totalOutput;

        stats[conv.id] = {
          messageCount: messageCount || 0,
          totalTokensInput: totalInput,
          totalTokensOutput: totalOutput
        };

        totalTokensGlobal += totalTokens;
        // Costo stimato: ~$0.01 per 1K token input, ~$0.03 per 1K token output (GPT-4 pricing)
        totalCostGlobal += (totalInput / 1000 * 0.01) + (totalOutput / 1000 * 0.03);
      }

      setConversationStats(stats);
      setGlobalStats({
        totalTokens: totalTokensGlobal,
        totalCost: totalCostGlobal,
        conversationCount: conversations.length
      });
    };

    if (conversations.length > 0) {
      loadStats();
    }
  }, [conversations]);

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 4
    }).format(cost);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header con statistiche globali */}
      <div className="p-4 border-b border-border/40 space-y-3">
        <Button
          onClick={onNewConversation}
          className="w-full"
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuova Conversazione
        </Button>
        
        {/* Statistiche globali */}
        {globalStats.conversationCount > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Conversazioni totali</span>
              <Badge variant="secondary">{globalStats.conversationCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Token totali</span>
              <Badge variant="secondary">{globalStats.totalTokens.toLocaleString('it-IT')}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Coins className="h-3 w-3" />
                Costo stimato
              </span>
              <Badge variant="outline" className="font-mono">
                {formatCost(globalStats.totalCost)}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Lista conversazioni */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessuna conversazione</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const stats = conversationStats[conv.id];
              const totalTokens = stats ? stats.totalTokensInput + stats.totalTokensOutput : 0;
              const cost = stats ? (stats.totalTokensInput / 1000 * 0.01) + (stats.totalTokensOutput / 1000 * 0.03) : 0;

              return (
                <HoverCard key={conv.id} openDelay={300}>
                  <HoverCardTrigger asChild>
                    <div
                      className={cn(
                        "group relative flex items-center gap-2 rounded-md p-2 border transition-all",
                        currentConversationId === conv.id
                          ? "bg-primary/10 border-primary/40"
                          : "hover:bg-muted/50 border-border/20 hover:border-border/40"
                      )}
                    >
                      {editingId === conv.id ? (
                        <>
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={handleSaveEdit}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onSelectConversation(conv.id)}
                            className="flex-1 text-left text-sm truncate"
                          >
                            {conv.titolo || "Conversazione senza titolo"}
                          </button>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleStartEdit(conv.id, conv.titolo || "")}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(conv.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent 
                    side="right" 
                    align="start"
                    className="w-80 bg-card/95 backdrop-blur border-border/40 shadow-lg z-50"
                  >
                    <div className="space-y-3">
                      {/* Titolo */}
                      <div>
                        <h4 className="text-sm font-semibold mb-1">
                          {conv.titolo || "Conversazione senza titolo"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.created_at).toLocaleString('it-IT')}
                        </p>
                      </div>

                      {/* Riassunto */}
                      {conv.riassunto_contesto && (
                        <div className="p-2 rounded-md bg-muted/30 border border-border/20">
                          <p className="text-xs text-muted-foreground line-clamp-4">
                            {conv.riassunto_contesto}
                          </p>
                        </div>
                      )}

                      {/* Statistiche */}
                      {stats && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Messaggi</span>
                            <Badge variant="secondary" className="w-fit">
                              {stats.messageCount}
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Token totali</span>
                            <Badge variant="secondary" className="w-fit">
                              {totalTokens.toLocaleString('it-IT')}
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1 col-span-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              Costo stimato
                            </span>
                            <Badge variant="outline" className="w-fit font-mono">
                              {formatCost(cost)}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa conversazione? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
