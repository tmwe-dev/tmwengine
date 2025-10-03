import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, RefreshCw, Mail } from 'lucide-react';

interface EmailHeaderProps {
  onSearch: (query: string) => void;
  onCompose: () => void;
  onSync: () => void;
}

export const EmailHeader = ({ onSearch, onCompose, onSync }: EmailHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          TMWE Email Manager
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

      <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search emails..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

    </header>
  );
};
