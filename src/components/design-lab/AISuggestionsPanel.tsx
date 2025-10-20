import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Plus, AlertCircle } from 'lucide-react';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import type { DesignLabComponent } from '@/types/design-lab';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AISuggestionsPanelProps {
  currentComponents: DesignLabComponent[];
  pageName: string;
  pageDescription?: string;
  onAddSuggestion: (suggestion: any) => void;
}

export function AISuggestionsPanel({
  currentComponents,
  pageName,
  pageDescription,
  onAddSuggestion,
}: AISuggestionsPanelProps) {
  const [userIntent, setUserIntent] = useState('');
  const { getSuggestions, isLoading, suggestions, error } = useAISuggestions();

  const handleGetSuggestions = async () => {
    try {
      await getSuggestions({
        currentComponents,
        pageName,
        pageDescription,
        userIntent: userIntent || undefined,
      });
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Suggestions</h3>
        </div>

        {/* Input for user intent */}
        <div className="space-y-2">
          <Input
            placeholder="What do you want to add? (optional)"
            value={userIntent}
            onChange={(e) => setUserIntent(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            onClick={handleGetSuggestions} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Suggestions
              </>
            )}
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {error.message || 'Failed to get suggestions'}
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions list */}
        {suggestions && (
          <div className="space-y-3">
            {/* Rationale */}
            <Card className="p-3 bg-primary/5 border-primary/20">
              <p className="text-xs text-primary/80">
                <span className="font-medium">Strategy:</span> {suggestions.rationale}
              </p>
            </Card>

            {/* Suggestions */}
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-3">
                {suggestions.suggestions.map((suggestion, index) => (
                  <Card 
                    key={index}
                    className="p-3 hover:border-primary/50 transition-colors animate-fade-in"
                  >
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold">
                              {suggestion.component_name}
                            </h4>
                            <Badge 
                              variant={getPriorityColor(suggestion.priority)}
                              className="text-xs"
                            >
                              {suggestion.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.component_type}
                          </p>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onAddSuggestion(suggestion)}
                          className="shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Metadata badges */}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.ui_category}
                        </Badge>
                        {suggestion.estimated_complexity && (
                          <Badge 
                            variant={suggestion.estimated_complexity === 'high' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {suggestion.estimated_complexity}
                          </Badge>
                        )}
                        {suggestion.tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Reason */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {suggestion.reason}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state */}
        {!suggestions && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Click "Get AI Suggestions" to receive<br />
              intelligent component recommendations
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
