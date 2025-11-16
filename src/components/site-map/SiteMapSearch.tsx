import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchPages } from '@/data/siteMapData';
import { PageCard } from './PageCard';

interface SiteMapSearchProps {
  onSearchChange?: (query: string) => void;
}

export function SiteMapSearch({ onSearchChange }: SiteMapSearchProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  const results = query.length >= 2 ? searchPages(query) : [];

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowResults(value.length >= 2);
    onSearchChange?.(value);
  };

  const clearSearch = () => {
    setQuery('');
    setShowResults(false);
    onSearchChange?.('');
  };

  return (
    <div className="relative mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Cerca pagine per nome, descrizione o percorso..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-50 w-full mt-2 bg-card border rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {results.length} {results.length === 1 ? 'risultato trovato' : 'risultati trovati'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((page) => (
                  <PageCard key={page.path} page={page} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessun risultato trovato per "{query}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
