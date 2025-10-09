import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRoomAISettings } from '@/hooks/useRoomAISettings';
import { useUserProfile } from '@/hooks/useUserProfile';

interface AISuggestionsProps {
  roomId: string;
  onSelectSuggestion: (text: string) => void;
}

interface Suggestion {
  text: string;
  tone: string;
}

export const AISuggestions = ({ roomId, onSelectSuggestion }: AISuggestionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();
  const { settings } = useRoomAISettings(roomId);
  const { profile } = useUserProfile();

  const generateSuggestions = async () => {
    if (!settings?.enableSuggestions) {
      toast({
        title: "Suggerimenti disabilitati",
        description: "I suggerimenti AI non sono abilitati per questa stanza.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setIsVisible(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utente non autenticato');
      }

      const { data, error } = await supabase.functions.invoke('intranet-ai-processor', {
        body: {
          roomId,
          messageContent: '',
          action: 'suggest',
          userId: user.id,
          writingLanguage: profile?.writingLanguage || 'it'
        }
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch (error: any) {
      console.error('Errore generazione suggerimenti:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile generare suggerimenti",
        variant: "destructive"
      });
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onSelectSuggestion(suggestion.text);
    setIsVisible(false);
    setSuggestions([]);
  };

  if (!settings?.enableSuggestions) {
    return null;
  }

  return (
    <div className="h-[100px] flex flex-col items-center justify-center">
      {!isVisible && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateSuggestions}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generazione...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Suggerimenti AI
            </>
          )}
        </Button>
      )}

      {isVisible && suggestions.length > 0 && (
        <Card className="w-full h-full p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              Suggerimenti AI
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                setSuggestions([]);
              }}
              className="h-5 w-5 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-2 px-2 hover:bg-primary/10"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="flex flex-col gap-0.5 w-full">
                  <span className="text-xs text-muted-foreground capitalize">
                    {suggestion.tone}
                  </span>
                  <span className="text-xs whitespace-pre-wrap line-clamp-2">
                    {suggestion.text}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
