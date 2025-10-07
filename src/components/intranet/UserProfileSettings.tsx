import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const SUPPORTED_LANGUAGES = [
  { code: 'it', name: 'Italiano' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' },
];

const TRANSLATION_MODES = [
  { value: 'none', label: 'Nessuna traduzione' },
  { value: 'read_only', label: 'Solo lettura (traduco messaggi ricevuti)' },
  { value: 'write_only', label: 'Solo scrittura (traduco messaggi inviati)' },
  { value: 'both', label: 'Entrambe (leggo e scrivo tradotto)' },
  { value: 'dual_view', label: 'Doppia vista (originale + traduzione)' },
];

export function UserProfileSettings() {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('it');
  const [readingLanguage, setReadingLanguage] = useState('it');
  const [writingLanguage, setWritingLanguage] = useState('it');
  const [translationMode, setTranslationMode] = useState<'none' | 'read_only' | 'write_only' | 'both' | 'dual_view'>('none');
  const [autoTranslateWriting, setAutoTranslateWriting] = useState(false);
  const [enableAutoSpeaker, setEnableAutoSpeaker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { profile, updateProfile } = useUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    if (profile && open) {
      setDisplayName(profile.displayName || '');
      setPreferredLanguage(profile.preferredLanguage);
      setReadingLanguage(profile.readingLanguage);
      setWritingLanguage(profile.writingLanguage);
      setTranslationMode(profile.translationMode);
      setAutoTranslateWriting(profile.autoTranslateWriting);
      setEnableAutoSpeaker(profile.enableAutoSpeaker);
    }
  }, [profile, open]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateProfile({
        displayName: displayName || null,
        preferredLanguage,
        readingLanguage,
        writingLanguage,
        translationMode,
        autoTranslateWriting,
        enableAutoSpeaker,
      });

      if (result.success) {
        toast({
          title: "Successo",
          description: "Profilo aggiornato con successo",
        });
        setOpen(false);
      } else {
        throw new Error('Errore aggiornamento profilo');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il profilo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="gap-2 h-8 px-3 hover:bg-primary/10"
        onClick={() => setOpen(true)}
        title="Impostazioni Profilo"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs">Profilo</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[600px] backdrop-blur-md bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Impostazioni Profilo & Traduzione
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Nome visualizzato */}
              <div className="space-y-2">
                <Label htmlFor="display-name">Nome da visualizzare (opzionale)</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Il tuo nome"
                  disabled={isLoading}
                />
              </div>

              <Separator />

              {/* Lingue */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Preferenze Lingua</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="preferred-lang">Lingua principale</Label>
                  <Select
                    value={preferredLanguage}
                    onValueChange={setPreferredLanguage}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="preferred-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reading-lang">Lingua per lettura messaggi</Label>
                  <Select
                    value={readingLanguage}
                    onValueChange={setReadingLanguage}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="reading-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="writing-lang">Lingua per scrittura messaggi</Label>
                  <Select
                    value={writingLanguage}
                    onValueChange={setWritingLanguage}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="writing-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Modalità traduzione */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Traduzione Automatica</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="translation-mode">Modalità traduzione</Label>
                  <Select
                    value={translationMode}
                    onValueChange={(value: any) => setTranslationMode(value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="translation-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSLATION_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Scegli come gestire la traduzione dei messaggi
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-translate-write">Traduci automaticamente quando scrivo</Label>
                    <p className="text-xs text-muted-foreground">
                      I tuoi messaggi saranno tradotti prima dell'invio
                    </p>
                  </div>
                  <Switch
                    id="auto-translate-write"
                    checked={autoTranslateWriting}
                    onCheckedChange={setAutoTranslateWriting}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Separator />

              {/* Auto-speaker */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-speaker">Auto-speaker</Label>
                  <p className="text-xs text-muted-foreground">
                    Leggi automaticamente i messaggi in arrivo
                  </p>
                </div>
                <Switch
                  id="auto-speaker"
                  checked={enableAutoSpeaker}
                  onCheckedChange={setEnableAutoSpeaker}
                  disabled={isLoading}
                />
              </div>

              {/* Azioni */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Salva'
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
