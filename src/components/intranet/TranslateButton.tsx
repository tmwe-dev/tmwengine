import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRoomAISettings } from '@/hooks/useRoomAISettings';

interface TranslateButtonProps {
  messageContent: string;
  messageId: string;
  sourceLanguage?: string;
  roomId: string;
}

export const TranslateButton = ({ messageContent, messageId, sourceLanguage = 'auto', roomId }: TranslateButtonProps) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const { profile } = useUserProfile();
  const { settings } = useRoomAISettings(roomId);
  const { toast } = useToast();

  // Auto-traduzione se abilitata e lingua diversa
  useEffect(() => {
    if (!profile || !sourceLanguage || !settings?.enableTranslation) return;
    
    // Modalità che richiedono traduzione automatica
    const autoTranslateModes = ['read_only', 'both', 'dual_view'];
    
    const shouldAutoTranslate = 
      autoTranslateModes.includes(profile.translationMode) &&
      sourceLanguage !== profile.readingLanguage &&
      !translatedText;
    
    if (shouldAutoTranslate) {
      handleTranslate(true); // auto-show quando tradotto automaticamente
    }
  }, [profile, sourceLanguage, settings?.enableTranslation]);

  const handleTranslate = async (autoShow = false) => {
    if (!profile) {
      toast({
        title: 'Errore',
        description: 'Profilo utente non trovato',
        variant: 'destructive'
      });
      return;
    }

    if (!settings?.enableTranslation) {
      toast({
        title: 'Traduzione disabilitata',
        description: 'La traduzione è disabilitata in questa stanza',
        variant: 'destructive'
      });
      return;
    }

    if (translatedText) {
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data, error } = await supabase.functions.invoke('intranet-ai-processor', {
        body: {
          roomId,
          messageContent,
          sourceLanguage,
          targetLanguage: profile.readingLanguage,
          action: 'translate',
          userId: user.id
        }
      });

      if (error) throw error;

      if (data?.result?.text) {
        setTranslatedText(data.result.text);
        if (autoShow) {
          setShowTranslation(true);
        } else {
          setShowTranslation(true);
        }
      } else {
        throw new Error('Nessuna traduzione ricevuta');
      }

    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'Errore traduzione',
        description: error instanceof Error ? error.message : 'Impossibile tradurre il messaggio',
        variant: 'destructive'
      });
    } finally {
      setIsTranslating(false);
    }
  };

  if (!profile || profile.translationMode === 'none' || !settings?.enableTranslation) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-auto px-2 text-xs gap-1"
        onClick={() => handleTranslate(false)}
        disabled={isTranslating}
      >
        {isTranslating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Languages className="h-3 w-3" />
        )}
        {translatedText 
          ? (showTranslation ? 'Mostra originale' : 'Mostra traduzione')
          : 'Traduci'
        }
      </Button>
      
      {showTranslation && translatedText && (
        <div className="mt-2 p-2 bg-muted/50 rounded text-sm border-l-2 border-primary">
          <p className="text-xs text-muted-foreground mb-1">Traduzione in {profile.readingLanguage}:</p>
          <p className="whitespace-pre-wrap break-words">{translatedText}</p>
        </div>
      )}
    </div>
  );
};
