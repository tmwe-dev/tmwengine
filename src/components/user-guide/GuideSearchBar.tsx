import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import guideContent from "@/data/user-guide/guide-content-it.json";

interface SearchResult {
  sectionId: string;
  title: string;
  preview: string;
  matches: number;
}

interface GuideSearchBarProps {
  onResultClick: (sectionId: string) => void;
  className?: string;
}

export function GuideSearchBar({ onResultClick, className }: GuideSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Simple search implementation
    const searchResults: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    Object.entries(guideContent).forEach(([sectionId, content]: [string, any]) => {
      let matches = 0;
      let preview = "";

      // Search in title
      if (content.title?.toLowerCase().includes(searchTerm)) {
        matches += 3;
      }

      // Search in overview
      if (content.overview?.toLowerCase().includes(searchTerm)) {
        matches += 2;
        preview = content.overview.substring(0, 100) + "...";
      }

      // Search in sections
      content.sections?.forEach((section: any) => {
        if (section.title?.toLowerCase().includes(searchTerm)) {
          matches += 2;
        }
        if (section.content?.toLowerCase().includes(searchTerm)) {
          matches += 1;
          if (!preview) {
            const index = section.content.toLowerCase().indexOf(searchTerm);
            const start = Math.max(0, index - 50);
            preview = "..." + section.content.substring(start, start + 100) + "...";
          }
        }
      });

      if (matches > 0) {
        searchResults.push({
          sectionId,
          title: content.title,
          preview: preview || content.overview?.substring(0, 100) + "..." || "",
          matches,
        });
      }
    });

    // Sort by relevance (matches count)
    searchResults.sort((a, b) => b.matches - a.matches);
    setResults(searchResults.slice(0, 10));
    setShowResults(true);
  }, [query]);

  const handleResultClick = (sectionId: string) => {
    setQuery("");
    setShowResults(false);
    onResultClick(sectionId);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cerca nella guida..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => {
              setQuery("");
              setShowResults(false);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg z-50">
          <ScrollArea className="max-h-[400px]">
            <div className="p-2 space-y-1">
              {results.map((result) => (
                <button
                  key={result.sectionId}
                  className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                  onClick={() => handleResultClick(result.sectionId)}
                >
                  <div className="font-medium text-sm mb-1">{result.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {result.preview}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          Nessun risultato trovato per "{query}"
        </div>
      )}
    </div>
  );
}
