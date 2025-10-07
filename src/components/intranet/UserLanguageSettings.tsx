import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Languages, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const LANGUAGES = [
  { code: 'it', name: 'Italiano' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' }
];

const TRANSLATION_MODES = [
  { value: 'none', label: 'Nessuna traduzione', description: 'Visualizza i messaggi nella lingua originale' },
  { value: 'read_only', label: 'Solo lettura tradotta', description: 'Traduci solo i messaggi in arrivo' },
  { value: 'dual_view', label: 'Vista doppia', description: 'Mostra originale sopra, traduzione sotto' },
  { value: 'both', label: 'Traduzione completa', description: 'Traduci lettura e scrittura' }
];

export function UserLanguageSettings() {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { profile, isLoading, updateProfile } = useUserProfile();

  const [tempSettings, setTempSettings] = useState({
    preferredLanguage: profile?.preferredLanguage || 'it',
    readingLanguage: profile?.readingLanguage || 'it',
    writingLanguage: profile?.writingLanguage || 'it',
    translationMode: profile?.translationMode || 'none',
    autoTranslateWriting: profile?.autoTranslateWriting || false,
    enableAutoSpeaker: profile?.enableAutoSpeaker || false
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && profile) {
      setTempSettings({
        preferredLanguage: profile.preferredLanguage,
        readingLanguage: profile.readingLanguage,
        writingLanguage: profile.writingLanguage,
        translationMode: profile.translationMode,
        autoTranslateWriting: profile.autoTranslateWriting,
        enableAutoSpeaker: profile.enableAutoSpeaker
      });
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateProfile(tempSettings);
    setIsSaving(false);
    setOpen(false);
  };

  if (isLoading || !profile) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="gap-2 h-8 px-3 hover:bg-primary/10"
        onClick={() => handleOpen(true)}
        title="Impostazioni Lingua"
      >
        <Languages className="h-4 w-4 text-primary" />
        <span className="text-xs">{profile.preferredLanguage.toUpperCase()}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-[600px] backdrop-blur-md bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              Impostazioni Lingua e Traduzione
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Lingua Preferita */}
              <div className="space-y-2">
                <Label>Lingua Preferita</Label>
                <Select
                  value={tempSettings.preferredLanguage}
                  onValueChange={(value) => setTempSettings(prev => ({ ...prev, preferredLanguage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  La lingua predefinita per l'interfaccia e le notifiche
                </p>
              </div>

              <Separator />

              {/* Modalità Traduzione */}
              <div className="space-y-2">
                <Label>Modalità Traduzione</Label>
                <Select
                  value={tempSettings.translationMode}
                  onValueChange={(value: any) => setTempSettings(prev => ({ ...prev, translationMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATION_MODES.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs text-muted-foreground">{mode.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lingua Lettura */}
              <div className="space-y-2">
                <Label>Lingua per Lettura</Label>
                <Select
                  value={tempSettings.readingLanguage}
                  onValueChange={(value) => setTempSettings(prev => ({ ...prev, readingLanguage: value }))}
                  disabled={tempSettings.translationMode === 'none'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  I messaggi in arrivo verranno tradotti in questa lingua
                </p>
              </div>

              {/* Lingua Scrittura */}
              <div className="space-y-2">
                <Label>Lingua per Scrittura</Label>
                <Select
                  value={tempSettings.writingLanguage}
                  onValueChange={(value) => setTempSettings(prev => ({ ...prev, writingLanguage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  La lingua in cui scrivi normalmente i messaggi
                </p>
              </div>

              <Separator />

              {/* Auto-traduzione Scrittura */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Traduzione Automatica Scrittura</Label>
                  <p className="text-xs text-muted-foreground">
                    Traduci automaticamente i tuoi messaggi nella lingua del destinatario
                  </p>
                </div>
                <Switch
                  checked={tempSettings.autoTranslateWriting}
                  onCheckedChange={(checked) => setTempSettings(prev => ({ ...prev, autoTranslateWriting: checked }))}
                />
              </div>

              {/* Auto-speaker */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-speaker</Label>
                  <p className="text-xs text-muted-foreground">
                    Leggi automaticamente i messaggi in arrivo
                  </p>
                </div>
                <Switch
                  checked={tempSettings.enableAutoSpeaker}
                  onCheckedChange={(checked) => setTempSettings(prev => ({ ...prev, enableAutoSpeaker: checked }))}
                />
              </div>

              {/* Azioni */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSaving}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
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
