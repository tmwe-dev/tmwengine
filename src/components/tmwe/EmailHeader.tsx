import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, RefreshCw, Mail, Menu, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmailHeaderProps {
  onSearch: (query: string) => void;
  onCompose: () => void;
  onSync: () => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
  downloadProgressComponent?: React.ReactNode;
}

export const EmailHeader = ({ onSearch, onCompose, onSync, onMenuClick, isMobile, downloadProgressComponent }: EmailHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [emailCount, setEmailCount] = useState<number>(0);

  // Fetch initial count and subscribe to realtime updates
  useEffect(() => {
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true });
      
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
    <header className="flex items-center border-b bg-card-transparent px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center gap-1 md:gap-2">
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
        
        <h1 className="text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {isMobile ? 'Email' : 'TMWE Email Manager'}
        </h1>
        
        <Button 
          onClick={onCompose} 
          size="icon"
          className="h-8 w-8 relative"
        >
          <Mail 
            className="h-4 w-4" 
            style={{ 
              filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4)) drop-shadow(-1px -1px 1px rgba(255,255,255,0.3))',
              transform: 'perspective(100px) rotateX(15deg) rotateY(-10deg)'
            }} 
          />
        </Button>
        
        <Button 
          onClick={onSync} 
          variant="outline"
          size="icon"
          className="h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {downloadProgressComponent && (
        <div className="ml-2">
          {downloadProgressComponent}
        </div>
      )}

      <form onSubmit={handleSearch} className="flex-1 ml-2 md:ml-4">
        <div className="relative flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-1 whitespace-nowrap">
            <Database className="h-3.5 w-3.5" />
            <span className="font-semibold text-xs">{emailCount.toLocaleString()}</span>
          </Badge>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={isMobile ? "Search..." : "Search emails..."}
              className="pl-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </form>

    </header>
  );
};
