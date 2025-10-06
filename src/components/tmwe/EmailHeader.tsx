import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, RefreshCw, Mail, Menu, Database, Settings2, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface EmailHeaderProps {
  onSearch: (query: string) => void;
  onCompose: () => void;
  onSync: () => void;
  onSyncSmart?: () => void;
  isSyncingSmart?: boolean;
  syncSmartProgress?: {
    current: number;
    total: number;
    missing: number;
  };
  missingEmailCount?: number;
  onMenuClick?: () => void;
  isMobile?: boolean;
  downloadProgressComponent?: React.ReactNode;
  dbEmailCount?: number;
  isHeaderCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseEmail?: () => void;
  onPreviousEmail?: () => void;
  onNextEmail?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const EmailHeader = ({ onSearch, onCompose, onSync, onSyncSmart, isSyncingSmart, syncSmartProgress, missingEmailCount, onMenuClick, isMobile, downloadProgressComponent, dbEmailCount, isHeaderCollapsed, onToggleCollapse, onCloseEmail, onPreviousEmail, onNextEmail, hasPrevious, hasNext }: EmailHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [emailCount, setEmailCount] = useState<number>(0);
  const [syncPopupOpen, setSyncPopupOpen] = useState(false);

  // Fetch initial count and subscribe to realtime updates
  useEffect(() => {
    const fetchCount = async () => {
      const userEmail = sessionStorage.getItem('tmwe_user_email');
      if (!userEmail) return;
      
      const { count, error } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail);
      
      if (!error && count !== null) {
        setEmailCount(count);
      }
    };

    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('email-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_messages'
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <>
      <header className="border-b bg-card-transparent px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 w-full max-w-screen overflow-x-hidden">
        {/* Layout con 3 colonne di uguale larghezza per centrare perfettamente l'icona */}
        <div className="grid grid-cols-3 items-center gap-2">
          {/* LEFT: Title + Sync buttons OR X + Navigation when collapsed */}
          {isHeaderCollapsed ? (
            <div className="flex items-center gap-2 justify-start">
              {onCloseEmail && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onCloseEmail}
                  className="h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onPreviousEmail}
                disabled={!hasPrevious}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onNextEmail}
                disabled={!hasNext}
                className="h-8 w-8"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 justify-between w-full">
              <div className="flex items-center gap-1 sm:gap-2">
                {isMobile && onMenuClick && (
                  <Button 
                    onClick={onMenuClick} 
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                
                <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent whitespace-nowrap">
                  {isMobile ? 'Email' : 'TMWE Email'}
                </h1>
              </div>

              {/* Sync buttons allineati a destra */}
              <div className="flex items-center gap-1">
                {isMobile ? (
                  <Button 
                    onClick={() => setSyncPopupOpen(true)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    title="Sync options"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={onSync} 
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title="Sync all emails"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    
                    {onSyncSmart && (
                      <Button 
                        onClick={onSyncSmart}
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 relative"
                        disabled={isSyncingSmart}
                        title="Smart sync - only missing emails"
                      >
                        <Database className={`h-4 w-4 ${isSyncingSmart ? 'animate-pulse' : ''}`} />
                        
                        {missingEmailCount !== undefined && missingEmailCount > 0 && !isSyncingSmart && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold"
                          >
                            {missingEmailCount > 999 ? '999+' : missingEmailCount}
                          </Badge>
                        )}
                        
                        {isSyncingSmart && syncSmartProgress && (
                          <Badge 
                            variant="default" 
                            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold bg-blue-500"
                          >
                            {syncSmartProgress.current}/{syncSmartProgress.missing}
                          </Badge>
                        )}
                        
                        {missingEmailCount === 0 && !isSyncingSmart && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-green-500 text-white"
                          >
                            ✓
                          </Badge>
                        )}
                      </Button>
                    )}

                    {downloadProgressComponent && (
                      <div className="ml-1">
                        {downloadProgressComponent}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* CENTER: Mail icon when not collapsed, empty when collapsed */}
          {!isHeaderCollapsed && (
            <div className="flex items-center justify-center">
              <Button 
                onClick={onCompose} 
                size="icon"
                className="h-8 w-8 relative"
                title="Compose new email"
              >
                <Mail 
                  className="h-4 w-4" 
                  style={{ 
                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 1px rgba(255,255,255,0.3))',
                    transform: 'perspective(100px) rotateX(15deg) rotateY(-10deg)'
                  }} 
                />
              </Button>
            </div>
          )}

          {/* RIGHT: Toggle button (sempre visibile) + Desktop search (nascosto quando collapsed) */}
          <div className="flex items-center gap-1 sm:gap-2 justify-end min-w-0">
            {onToggleCollapse && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8"
              >
                {isHeaderCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </Button>
            )}

            {!isHeaderCollapsed && (
              <div className="hidden md:flex items-center gap-1 sm:gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 whitespace-nowrap shrink-0">
                  <Database className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="font-semibold text-[10px] sm:text-xs">{emailCount.toLocaleString()}</span>
                </Badge>

                <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-md">
                  <div className="relative min-w-0">
                    <Search className="absolute left-2 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search emails..."
                      className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Email Count Badge moved to sender filter section */}
      </header>

      {/* Sync Options Dialog (Mobile only) */}
      <Dialog open={syncPopupOpen} onOpenChange={setSyncPopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Opzioni & Strumenti</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            {/* DB Email Count */}
            {dbEmailCount !== undefined && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Email nel Database</div>
                  <div className="text-xs text-muted-foreground">
                    {dbEmailCount.toLocaleString()} record
                  </div>
                </div>
              </div>
            )}

            {/* Download Progress Component */}
            {downloadProgressComponent && (
              <div className="w-full">
                {downloadProgressComponent}
              </div>
            )}

            {/* Sync All */}
            <Button 
              onClick={() => {
                onSync();
                setSyncPopupOpen(false);
              }}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Sincronizza tutte le email</span>
            </Button>
            
            {/* Smart Sync */}
            {onSyncSmart && (
              <Button 
                onClick={() => {
                  onSyncSmart();
                  setSyncPopupOpen(false);
                }}
                variant="outline"
                className="w-full justify-start gap-2 relative"
                disabled={isSyncingSmart}
              >
                <Database className={`h-5 w-5 ${isSyncingSmart ? 'animate-pulse' : ''}`} />
                <div className="flex-1 text-left">
                  <div>Smart Sync - Solo email mancanti</div>
                  {missingEmailCount !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      {missingEmailCount > 0 
                        ? `${missingEmailCount} email mancanti` 
                        : 'Tutto sincronizzato ✓'
                      }
                    </div>
                  )}
                </div>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
