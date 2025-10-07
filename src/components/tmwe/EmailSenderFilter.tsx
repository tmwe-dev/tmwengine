import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Users, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailSenderFilterProps {
  emails: Array<{ id: string; from: string; read: boolean; from_email?: string }>;
  selectedSender: string | null;
  onSenderSelect: (sender: string | null) => void;
  onOpenAIChat?: (senderEmail: string) => void;
}

export const EmailSenderFilter = ({
  emails,
  selectedSender,
  onSenderSelect,
  onOpenAIChat,
}: EmailSenderFilterProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Group emails by sender and count
  const senderGroups = useMemo(() => {
    const groups = new Map<string, { count: number; unread: number }>();

    emails.forEach((email) => {
      const sender = email.from || 'Unknown';
      const current = groups.get(sender) || { count: 0, unread: 0 };
      groups.set(sender, {
        count: current.count + 1,
        unread: current.unread + (email.read ? 0 : 1),
      });
    });

    // Convert to array and sort by count
    return Array.from(groups.entries())
      .map(([sender, stats]) => ({ sender, ...stats }))
      .sort((a, b) => b.count - a.count);
  }, [emails]);

  // Filter senders by search query
  const filteredSenders = useMemo(() => {
    if (!searchQuery.trim()) return senderGroups;
    const query = searchQuery.toLowerCase();
    return senderGroups.filter((group) =>
      group.sender.toLowerCase().includes(query)
    );
  }, [senderGroups, searchQuery]);

  const handleSenderClick = (sender: string) => {
    if (selectedSender === sender) {
      onSenderSelect(null);
    } else {
      onSenderSelect(sender);
    }
  };

  const handleClearFilter = () => {
    onSenderSelect(null);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant={selectedSender ? 'secondary' : 'ghost'}
            size="sm"
            className="relative"
          >
            <Users className="h-4 w-4 mr-2" />
            Mittenti
            {selectedSender && (
              <Badge className="ml-2 h-5 px-1.5" variant="default">
                1
              </Badge>
            )}
          </Button>
        </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Filtra per Mittente</SheetTitle>
          <SheetDescription>
            Raggruppa e filtra le email in base al mittente
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca mittente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Active Filter */}
          {selectedSender && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <span className="text-sm flex-1">
                Filtro attivo: <strong>{selectedSender}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="h-7"
              >
                Rimuovi
              </Button>
            </div>
          )}

          {/* Sender List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-1">
              {filteredSenders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nessun mittente trovato</p>
                </div>
              ) : (
                filteredSenders.map((group) => (
                  <Collapsible key={group.sender} defaultOpen={false}>
                    <div
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50',
                        selectedSender === group.sender && 'bg-muted'
                      )}
                      onClick={() => handleSenderClick(group.sender)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.sender}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {group.count} email
                            {group.count !== 1 ? 's' : ''}
                          </span>
                          {group.unread > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              {group.unread} non lette
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 ml-2"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="pl-6 pr-3 pb-2">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Totale email: {group.count}</p>
                        <p>• Non lette: {group.unread}</p>
                        <p>• Lette: {group.count - group.unread}</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Stats Footer */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mittenti totali:</span>
              <span className="font-semibold">{senderGroups.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email totali:</span>
              <span className="font-semibold">{emails.length}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </div>
  );
};
