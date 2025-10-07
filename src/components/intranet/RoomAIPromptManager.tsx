import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Brain, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

interface RoomAIPromptManagerProps {
  roomId: string;
  isCreatorOrAdmin: boolean;
}

export function RoomAIPromptManager({ roomId, isCreatorOrAdmin }: RoomAIPromptManagerProps) {
  const [open, setOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [standardPrompt, setStandardPrompt] = useState('');
  const [isUsingStandard, setIsUsingStandard] = useState(true);
  const [enableAI, setEnableAI] = useState(true);
  const [enableTranslation, setEnableTranslation] = useState(true);
  const [enableAutoSpeaker, setEnableAutoSpeaker] = useState(false);
  const [enableSuggestions, setEnableSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && isCreatorOrAdmin) {
      loadSettings();
    }
  }, [open, roomId, isCreatorOrAdmin]);

  const loadSettings = async () => {
    try {
      // Carica prompt standard globale
      const { data: globalData, error: globalError } = await supabase
        .from('intranet_global_ai_prompt')
        .select('prompt_contenuto')
        .eq('attivo', true)
        .single();

      if (globalError) throw globalError;
      if (globalData) {
        setStandardPrompt(globalData.prompt_contenuto);
      }

      // Carica impostazioni specifiche della stanza
      const { data: roomData, error: roomError } = await supabase
        .from('intranet_room_ai_prompts')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (roomError && roomError.code !== 'PGRST116') throw roomError;

      if (roomData) {
        setCustomPrompt(roomData.custom_prompt || '');
        setIsUsingStandard(roomData.is_using_standard);
        setEnableAI(roomData.enable_ai);
        setEnableTranslation(roomData.enable_translation);
        setEnableAutoSpeaker(roomData.enable_auto_speaker);
        setEnableSuggestions(roomData.enable_suggestions);
      } else {
        // Se non esiste, crea record di default
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni AI:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le impostazioni AI.",
        variant: "destructive",
      });
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { error } = await supabase
        .from('intranet_room_ai_prompts')
        .insert({
          room_id: roomId,
          is_using_standard: true,
          enable_ai: true,
          enable_translation: true,
          enable_auto_speaker: false,
          enable_suggestions: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Errore creazione impostazioni default:', error);
    }
  };

  const loadStandardPrompt = () => {
    setCustomPrompt(standardPrompt);
    setIsUsingStandard(false);
    toast({
      title: "Prompt caricato",
      description: "Il prompt standard è stato caricato. Puoi modificarlo e salvarlo.",
    });
  };

  const saveSettings = async () => {
    if (!isCreatorOrAdmin) {
      toast({
        title: "Accesso negato",
        description: "Solo il creatore o gli admin possono modificare le impostazioni AI.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('intranet_room_ai_prompts')
        .upsert({
          room_id: roomId,
          custom_prompt: isUsingStandard ? null : customPrompt,
          is_using_standard: isUsingStandard,
          enable_ai: enableAI,
          enable_translation: enableTranslation,
          enable_auto_speaker: enableAutoSpeaker,
          enable_suggestions: enableSuggestions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'room_id'
        });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Impostazioni AI aggiornate con successo.",
      });
      setOpen(false);
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isCreatorOrAdmin) {
    return null;
  }

  const activePrompt = isUsingStandard ? standardPrompt : customPrompt;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="gap-2 h-8 px-3 hover:bg-primary/10"
        onClick={() => setOpen(true)}
        title="Gestisci AI della Stanza"
      >
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-xs">AI Settings</span>
        {enableAI && <span className="text-xs">🤖</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[800px] backdrop-blur-md bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Gestione AI - Stanza
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Attivazione AI */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-ai" className="text-base">Abilita AI per questa stanza</Label>
                  <p className="text-sm text-muted-foreground">
                    Attiva/disattiva tutte le funzionalità AI
                  </p>
                </div>
                <Switch
                  id="enable-ai"
                  checked={enableAI}
                  onCheckedChange={setEnableAI}
                  disabled={isLoading}
                />
              </div>

              <Separator />

              {/* Funzionalità AI */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Funzionalità AI</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-translation">Traduzione automatica</Label>
                    <p className="text-xs text-muted-foreground">
                      Abilita la traduzione dei messaggi (utente sceglie quando usarla)
                    </p>
                  </div>
                  <Switch
                    id="enable-translation"
                    checked={enableTranslation}
                    onCheckedChange={setEnableTranslation}
                    disabled={isLoading || !enableAI}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-speaker">Auto-speaker</Label>
                    <p className="text-xs text-muted-foreground">
                      Legge automaticamente i messaggi in arrivo
                    </p>
                  </div>
                  <Switch
                    id="enable-speaker"
                    checked={enableAutoSpeaker}
                    onCheckedChange={setEnableAutoSpeaker}
                    disabled={isLoading || !enableAI}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-suggestions">Suggerimenti AI</Label>
                    <p className="text-xs text-muted-foreground">
                      Fornisce suggerimenti contestuali
                    </p>
                  </div>
                  <Switch
                    id="enable-suggestions"
                    checked={enableSuggestions}
                    onCheckedChange={setEnableSuggestions}
                    disabled={isLoading || !enableAI}
                  />
                </div>
              </div>

              <Separator />

              {/* Selezione Prompt */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Prompt AI</h3>
                
                <RadioGroup
                  value={isUsingStandard ? "standard" : "custom"}
                  onValueChange={(value) => setIsUsingStandard(value === "standard")}
                  disabled={isLoading || !enableAI}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="cursor-pointer">
                      Usa prompt standard globale
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="cursor-pointer">
                      Usa prompt personalizzato per questa stanza
                    </Label>
                  </div>
                </RadioGroup>

                {!isUsingStandard && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadStandardPrompt}
                    disabled={isLoading || !enableAI}
                    className="w-full"
                  >
                    Carica prompt standard per personalizzarlo
                  </Button>
                )}
              </div>

              {/* Visualizzazione Prompt Attivo */}
              <div className="space-y-2">
                <Label>
                  {isUsingStandard ? 'Prompt Standard (solo lettura)' : 'Prompt Personalizzato (modificabile)'}
                </Label>
                <Textarea
                  value={activePrompt}
                  onChange={(e) => !isUsingStandard && setCustomPrompt(e.target.value)}
                  placeholder="Il prompt AI verrà visualizzato qui..."
                  className="min-h-[300px] backdrop-blur-md bg-background/50 border-white/10"
                  disabled={isLoading || isUsingStandard || !enableAI}
                  readOnly={isUsingStandard}
                />
                <p className="text-xs text-muted-foreground">
                  {isUsingStandard 
                    ? 'Questo è il prompt standard. Seleziona "personalizzato" per modificarlo.'
                    : 'Questo prompt verrà utilizzato esclusivamente per questa stanza.'}
                </p>
              </div>

              {/* Azioni */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Annulla
                </Button>
                <Button
                  onClick={saveSettings}
                  disabled={isLoading || (!isUsingStandard && !customPrompt.trim())}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Salva Impostazioni'
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
