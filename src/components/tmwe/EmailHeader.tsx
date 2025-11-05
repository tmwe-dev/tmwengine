import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Mail, Menu, Settings2, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Brain, Download, CheckCircle, Bug, MailOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface EmailHeaderProps {
  onSearch: (query: string) => void;
  onCompose: () => void;
  onSync: () => void;
  isSyncing?: boolean;
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
  onOpenSyncMonitor?: () => void;
  onOpenDirectDownload?: () => void;
  onOpenSmartInbox?: () => void;
}

export const EmailHeader = ({ onSearch, onCompose, onSync, isSyncing, onMenuClick, isMobile, downloadProgressComponent, dbEmailCount, isHeaderCollapsed, onToggleCollapse, onCloseEmail, onPreviousEmail, onNextEmail, hasPrevious, hasNext, onOpenSyncMonitor, onOpenDirectDownload, onOpenSmartInbox }: EmailHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [emailCount, setEmailCount] = useState<number>(0);
  const [syncPopupOpen, setSyncPopupOpen] = useState(false);
  const navigate = useNavigate();

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
      <header className="border-b bg-card-transparent">
        {/* Layout con 3 colonne per organizzare gli elementi */}
        <div className="grid grid-cols-3 items-center gap-2">
          {/* LEFT: Title + Sync buttons OR X button when collapsed */}
          {isHeaderCollapsed ? (
            <div className="flex items-center justify-start gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onCloseEmail}
              >
                <X />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2 w-full">
              <div className="flex items-center gap-1 sm:gap-2 justify-between w-full">
                <div className="flex items-center gap-1 sm:gap-2">
                  {isMobile && onMenuClick && (
                    <Button 
                      onClick={onMenuClick} 
                      size="icon"
                      variant="ghost"
                    >
                      <Menu />
                    </Button>
                  )}
                  
                  <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent whitespace-nowrap">
                    {isMobile ? 'Email' : 'TMWE Email'}
                  </h1>
                </div>

                {/* Sync buttons container */}
                <div className="flex items-center gap-3">
                  {/* Analizza button (EmailSyncMonitor) */}
                  {onOpenSyncMonitor && (
                    <Button 
                      onClick={onOpenSyncMonitor}
                      variant="outline"
                      size="sm"
                      title="Verifica stato sincronizzazione"
                    >
                      <Settings2 className="h-4 w-4 mr-1" />
                      {!isMobile && 'Verifica Sync'}
                    </Button>
                  )}

                  {/* Download button (Direct API) */}
                  {onOpenDirectDownload && (
                    <Button 
                      onClick={() => {
                        console.log('📥 Scarica button clicked!');
                        onOpenDirectDownload();
                      }}
                      size="sm"
                      title="Scarica email via API"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      {!isMobile && 'Scarica Email'}
                    </Button>
                  )}

                  {/* Smart Inbox AI button */}
                  {onOpenSmartInbox && (
                    <Button 
                      onClick={() => {
                        console.log('🧠 Smart Inbox AI button clicked!');
                        onOpenSmartInbox();
                      }}
                      size="sm"
                      variant="secondary"
                      title="Apri Inbox Intelligente"
                    >
                      <Brain className="h-4 w-4 mr-1" />
                      {!isMobile && 'Inbox AI'}
                    </Button>
                  )}

                  {/* Tools Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings2 className="h-4 w-4 mr-1" />
                        {!isMobile && 'Tools'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border border-border z-[200] shadow-lg">
                      {/* Force rebuild - 2025-11-05 07:53 */}
                      <DropdownMenuItem onClick={() => navigate('/funnemail?view=quick-download')}>
                        <Download className="h-4 w-4 mr-2" />
                        Quick Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/funnemail?view=integrity')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verifica Integrità
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/funnemail?view=debugger')}>
                        <Bug className="h-4 w-4 mr-2" />
                        Backend Debugger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/funnemail?view=single-mail')}>
                        <MailOpen className="h-4 w-4 mr-2" />
                        Single Mail
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Progress indicator */}
                  {downloadProgressComponent && (
                    <div>
                      {downloadProgressComponent}
                    </div>
                  )}
                </div>
              </div>

              {/* Mail compose button - in fondo a sinistra */}
              <div className="flex items-center justify-start">
                <Button 
                  onClick={onCompose}
                  size="icon"
                  title="Compose new email"
                >
                  <Mail
                    style={{ 
                      filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 1px rgba(255,255,255,0.3))',
                      transform: 'perspective(100px) rotateX(15deg) rotateY(-10deg)'
                    }} 
                  />
                </Button>
              </div>
            </div>
          )}

          {/* CENTER: email navigation when collapsed, vuoto altrimenti */}
          {isHeaderCollapsed ? (
            <div className="flex items-center gap-2 justify-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onPreviousEmail}
                disabled={!hasPrevious}
              >
                <ChevronLeft />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onNextEmail}
                disabled={!hasNext}
              >
                <ChevronRight />
              </Button>
            </div>
          ) : (
            <div></div>
          )}

          {/* RIGHT: Toggle button (sempre visibile) + Desktop search (nascosto quando collapsed) */}
          <div className="flex items-center gap-1 sm:gap-2 justify-end min-w-0">
            {onToggleCollapse && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onToggleCollapse}
              >
                {isHeaderCollapsed ? <ChevronDown /> : <ChevronUp />}
              </Button>
            )}

            {!isHeaderCollapsed && (
              <div className="hidden md:flex items-center gap-1 sm:gap-2">

                <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-md">
                  <div className="relative min-w-0">
                    <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search emails..."
                      className="text-sm"
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
            {/* Download Progress Component */}
            {downloadProgressComponent && (
              <div className="w-full">
                {downloadProgressComponent}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
