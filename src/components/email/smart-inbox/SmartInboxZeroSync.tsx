import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Search, Mail, Inbox, Sparkles, Clock } from 'lucide-react';
import { useSmartInboxZeroSync } from '@/hooks/useSmartInboxZeroSync';
import { LoadingState } from '@/components/design-system/data-display/LoadingState';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SmartInboxZeroSyncProps {
  onOpenAISidebar?: (senderEmail: string) => void;
}

export function SmartInboxZeroSync({ onOpenAISidebar }: SmartInboxZeroSyncProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  const {
    emails,
    allEmails,
    groupStats,
    classificationsMap,
    isLoading,
    isLoadingMore,
    isClassifying,
    hasNextPage,
    fetchNextPage,
    classifyEmail,
    classifyBatch,
    refreshAll,
    userEmail,
  } = useSmartInboxZeroSync({
    folder: 'INBOX',
    group_name: selectedGroup === 'all' ? null : selectedGroup,
    search_query: searchQuery || undefined,
  });

  // Filter emails based on group
  const filteredEmails = useMemo(() => {
    if (selectedGroup === 'all') return emails;
    if (selectedGroup === 'unclassified') {
      return emails.filter(e => !e.is_classified);
    }
    return emails.filter(e => e.classification?.group_name === selectedGroup);
  }, [emails, selectedGroup]);

  // Get unclassified emails
  const unclassifiedEmails = useMemo(() => 
    allEmails.filter(e => !e.is_classified),
    [allEmails]
  );

  // Handle batch classification
  const handleClassifyAll = async () => {
    const toClassify = unclassifiedEmails.slice(0, 10);
    if (toClassify.length > 0) {
      await classifyBatch(toClassify);
    }
  };

  const selectedEmail = selectedEmailId 
    ? allEmails.find(e => e.tmwe_email_id === selectedEmailId) 
    : null;

  if (isLoading && !emails.length) {
    return <LoadingState message="Caricamento email da TMWE API..." />;
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Smart Inbox Zero-Sync
          </h2>
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3 w-3" />
            {allEmails.length} email
          </Badge>
          {unclassifiedEmails.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {unclassifiedEmails.length} da classificare
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {unclassifiedEmails.length > 0 && (
            <Button 
              size="sm" 
              onClick={handleClassifyAll}
              disabled={isClassifying}
              className="gap-2"
            >
              {isClassifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Classifica ({Math.min(unclassifiedEmails.length, 10)})
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAll}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Group Tabs */}
        <Tabs value={selectedGroup} onValueChange={setSelectedGroup} className="flex-1">
          <TabsList className="h-9">
            {groupStats.map((group) => (
              <TabsTrigger 
                key={group.group_name} 
                value={group.group_name}
                className="gap-1.5 text-xs"
              >
                {group.group_name === 'all' ? 'Tutte' : 
                 group.group_name === 'unclassified' ? 'Non classificate' : 
                 group.group_name}
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {group.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Email List */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Email ({filteredEmails.length})</span>
              {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredEmails.map((email) => {
                const classification = email.classification || classificationsMap.get(email.tmwe_email_id);
                const isSelected = selectedEmailId === email.tmwe_email_id;
                const isClassifyingThis = email.is_classifying;
                
                return (
                  <div
                    key={email.tmwe_email_id}
                    onClick={() => setSelectedEmailId(email.tmwe_email_id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors",
                      "hover:bg-accent/50",
                      isSelected && "bg-accent",
                      !email.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "font-medium text-sm truncate",
                            !email.is_read && "font-semibold"
                          )}>
                            {email.from_name || email.from_email}
                          </span>
                          {!email.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm truncate text-foreground/90">
                          {email.subject || '(Nessun oggetto)'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {email.body_preview}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {email.date ? format(new Date(email.date), 'dd MMM', { locale: it }) : ''}
                        </span>
                        
                        {isClassifyingThis ? (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </Badge>
                        ) : classification ? (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: classification.group_color || undefined,
                              color: classification.group_color ? 'white' : undefined
                            }}
                          >
                            {classification.group_name}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              classifyEmail(email);
                            }}
                          >
                            <Sparkles className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Load More */}
              {hasNextPage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => fetchNextPage()}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Carica altre email
                </Button>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Email Detail */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-medium">Dettaglio Email</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-auto">
            {selectedEmail ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedEmail.subject}</h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {selectedEmail.from_name || selectedEmail.from_email}
                    </span>
                    {selectedEmail.from_name && (
                      <span>&lt;{selectedEmail.from_email}&gt;</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedEmail.date ? format(new Date(selectedEmail.date), 'PPpp', { locale: it }) : ''}
                  </p>
                </div>
                
                {selectedEmail.classification && (
                  <div className="flex items-center gap-2">
                    <Badge 
                      style={{ 
                        backgroundColor: selectedEmail.classification.group_color || undefined,
                        color: selectedEmail.classification.group_color ? 'white' : undefined
                      }}
                    >
                      {selectedEmail.classification.group_name}
                    </Badge>
                    {selectedEmail.classification.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(selectedEmail.classification.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedEmail.body_preview || 'Nessun contenuto disponibile'}
                  </p>
                </div>
                
                {onOpenAISidebar && selectedEmail.from_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenAISidebar(selectedEmail.from_email)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Apri AI Sidebar
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Mail className="h-12 w-12 mb-4 opacity-50" />
                <p>Seleziona un'email per vedere i dettagli</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
