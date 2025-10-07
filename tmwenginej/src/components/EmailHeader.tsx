import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LogOut } from 'lucide-react';
import { clearApiConfig } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface EmailHeaderProps {
  onSearch: (query: string) => void;
}

export const EmailHeader = ({ onSearch }: EmailHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleLogout = () => {
    clearApiConfig();
    navigate('/login');
  };

  return (
    <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b bg-card px-3 md:px-6 py-3 md:py-4 gap-2">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <h1 className="text-base md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          TMWE Email Manager
        </h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="md:hidden">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-2xl md:mx-8">
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search emails..."
            className="pl-8 sm:pl-10 h-8 sm:h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
        <LogOut className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Logout
      </Button>
    </header>
  );
};
