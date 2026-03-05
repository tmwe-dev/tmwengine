import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
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
import { DateRange } from "react-day-picker";
import { ConversationSearchBar } from "./ConversationSearchBar";
import { ConversationListItem, ConversationItem } from "./ConversationListItem";

interface RadioConversationsSidebarProps {
  conversations: ConversationItem[];
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

  const handleStartEdit = (conv: ConversationItem) => {
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

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setConversationToDelete(null);
      setDeleteDialogOpen(false);
    }
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
      <ConversationSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        filteredCount={filteredConversations.length}
        onNewConversation={onNewConversation}
        onCloseSidebar={onCloseSidebar}
      />

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
              <ConversationListItem
                key={conv.id}
                conv={conv}
                isSelected={currentConversationId === conv.id}
                isEditing={editingId === conv.id}
                editingTitle={editingTitle}
                onSelect={() => onSelectConversation(conv.id)}
                onStartEdit={() => handleStartEdit(conv)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditingTitleChange={setEditingTitle}
                onDelete={() => {
                  setConversationToDelete(conv.id);
                  setDeleteDialogOpen(true);
                }}
                onGenerateSummary={onGenerateSummary ? () => onGenerateSummary(conv.id) : undefined}
                onGenerateFullReport={onGenerateFullReport ? () => onGenerateFullReport(conv.id) : undefined}
              />
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
