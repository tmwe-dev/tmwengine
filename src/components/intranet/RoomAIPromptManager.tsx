import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Brain, Loader2, Shield, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RoomAIPromptManagerProps {
  roomId: string;
  isCreatorOrAdmin: boolean;
}

export function RoomAIPromptManager({ roomId, isCreatorOrAdmin }: RoomAIPromptManagerProps) {
  const [open, setOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [moderationPrompt, setModerationPrompt] = useState('');
  const [standardPrompt, setStandardPrompt] = useState('');
  const [isUsingStandard, setIsUsingStandard] = useState(true);
  const [enableAI, setEnableAI] = useState(true);
  const [enableTranslation, setEnableTranslation] = useState(true);
  const [enableAutoSpeaker, setEnableAutoSpeaker] = useState(false);
  const [enableSuggestions, setEnableSuggestions] = useState(false);
  const [enableModeration, setEnableModeration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && isCreatorOrAdmin) {
      loadSettings();
    }
  }, [open, roomId, isCreatorOrAdmin]);

  const loadSettings = async () => {
    try {
      const { data: globalData, error: globalError } = await supabase
        .from('intranet_global_ai_prompt')
        .select('prompt_contenuto')
        .eq('attivo', true)
        .single();

      if (globalError) throw globalError;
      if (globalData) {
        setStandardPrompt(globalData.prompt_contenuto);
      }

      const { data: roomData, error: roomError } = await supabase
        .from('intranet_room_ai_prompts')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (roomError && roomError.code !== 'PGRST116') throw roomError;

      if (roomData) {
        setCustomPrompt(roomData.custom_prompt || '');
        setModerationPrompt(roomData.moderation_prompt || '');
        setIsUsingStandard(roomData.is_using_standard);
        setEnableAI(roomData.enable_ai);
        setEnableTranslation(roomData.enable_translation);
        setEnableAutoSpeaker(roomData.enable_auto_speaker);
        setEnableSuggestions(roomData.enable_suggestions);
        setEnableModeration(roomData.enable_moderation);
      } else {
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
          enable_suggestions: false,
          enable_moderation: false
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
          moderation_prompt: moderationPrompt || null,
          is_using_standard: isUsingStandard,
          enable_ai: enableAI,
          enable_translation: enableTranslation,
          enable_auto_speaker: enableAutoSpeaker,
          enable_suggestions: enableSuggestions,
          enable_moderation: enableModeration,
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
        <DialogContent className="max-w-[900px] max-h-[90vh] backdrop-blur-md bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Gestione AI - Stanza
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="settings" className="w-full flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="settings" className="gap-2">
                <Brain className="h-4 w-4" />
                Impostazioni
              </TabsTrigger>
              <TabsTrigger value="operational" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Prompt Operativo
              </TabsTrigger>
              <TabsTrigger value="moderation" className="gap-2">
                <Shield className="h-4 w-4" />
                Moderazione
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-4">
              {/* TAB IMPOSTAZIONI */}
              <TabsContent value="settings" className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-ai" className="text-base">Abilita AI</Label>
                    <p className="text-sm text-muted-foreground">Attiva tutte le funzionalità AI</p>
                  </div>
                  <Switch id="enable-ai" checked={enableAI} onCheckedChange={setEnableAI} disabled={isLoading} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Funzionalità AI</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enable-translation">Traduzione automatica</Label>
                      <p className="text-xs text-muted-foreground">Abilita la traduzione dei messaggi</p>
                    </div>
                    <Switch id="enable-translation" checked={enableTranslation} onCheckedChange={setEnableTranslation} disabled={isLoading || !enableAI} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enable-speaker">Auto-speaker</Label>
                      <p className="text-xs text-muted-foreground">Legge automaticamente i messaggi</p>
                    </div>
                    <Switch id="enable-speaker" checked={enableAutoSpeaker} onCheckedChange={setEnableAutoSpeaker} disabled={isLoading || !enableAI} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enable-suggestions">Suggerimenti AI</Label>
                      <p className="text-xs text-muted-foreground">Fornisce suggerimenti contestuali</p>
                    </div>
                    <Switch id="enable-suggestions" checked={enableSuggestions} onCheckedChange={setEnableSuggestions} disabled={isLoading || !enableAI} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enable-moderation">Moderazione AI</Label>
                      <p className="text-xs text-muted-foreground">Controllo comportamentale automatico</p>
                    </div>
                    <Switch id="enable-moderation" checked={enableModeration} onCheckedChange={setEnableModeration} disabled={isLoading || !enableAI} />
                  </div>
                </div>
              </TabsContent>

              {/* TAB PROMPT OPERATIVO */}
              <TabsContent value="operational" className="space-y-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Prompt Operativo e Funzionale
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Definisce COME l'AI risponde: traduzione, suggerimenti, contesto, ecc.
                  </p>
                </div>

                <RadioGroup
                  value={isUsingStandard ? "standard" : "custom"}
                  onValueChange={(value) => setIsUsingStandard(value === "standard")}
                  disabled={isLoading || !enableAI}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="cursor-pointer">Usa prompt standard globale</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="cursor-pointer">Usa prompt personalizzato</Label>
                  </div>
                </RadioGroup>

                {!isUsingStandard && (
                  <Button variant="outline" size="sm" onClick={loadStandardPrompt} disabled={isLoading || !enableAI} className="w-full">
                    Carica prompt standard per personalizzarlo
                  </Button>
                )}

                <div className="space-y-2">
                  <Label>{isUsingStandard ? 'Prompt Standard (solo lettura)' : 'Prompt Personalizzato'}</Label>
                  <Textarea
                    value={activePrompt}
                    onChange={(e) => !isUsingStandard && setCustomPrompt(e.target.value)}
                    placeholder="Il prompt operativo..."
                    className="min-h-[300px]"
                    disabled={isLoading || isUsingStandard || !enableAI}
                    readOnly={isUsingStandard}
                  />
                </div>
              </TabsContent>

              {/* TAB MODERAZIONE */}
              <TabsContent value="moderation" className="space-y-4 mt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Prompt di Moderazione Comportamentale
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Regole su parolacce, offese, bilanciamento interventi, toni, limiti.
                  </p>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>💡 <strong>Suggerimenti:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Specifica cosa sono parolacce/offese</li>
                      <li>Definisci warning e conseguenze</li>
                      <li>Imposta limiti di interventi</li>
                      <li>Specifica toni accettabili</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-mod">Abilita Moderazione</Label>
                    <p className="text-xs text-muted-foreground">Applica regole automaticamente</p>
                  </div>
                  <Switch id="enable-mod" checked={enableModeration} onCheckedChange={setEnableModeration} disabled={isLoading || !enableAI} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mod-prompt">Regole di Moderazione</Label>
                  <Textarea
                    id="mod-prompt"
                    value={moderationPrompt}
                    onChange={(e) => setModerationPrompt(e.target.value)}
                    placeholder={`Esempio:

1. PAROLACCE: [lista] - warning al primo uso
2. BILANCIAMENTO: Max 5 messaggi consecutivi
3. TONI: Professionale richiesto
4. ECCEZIONI: Contesto tecnico tollerato`}
                    className="min-h-[400px]"
                    disabled={isLoading || !enableAI}
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Annulla
            </Button>
            <Button onClick={saveSettings} disabled={isLoading || (!isUsingStandard && !customPrompt.trim())}>
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
        </DialogContent>
      </Dialog>
    </>
  );
}