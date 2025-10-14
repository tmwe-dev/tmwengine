import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Plus, Trash2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Lista completa lingue ISO 639-1
const WORLD_LANGUAGES = [
  { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
];

const LanguageManager = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch active languages from database
  const { data: activeLanguagesData = [], isLoading } = useQuery({
    queryKey: ['system-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_languages')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Add language mutation
  const addLanguageMutation = useMutation({
    mutationFn: async (languageCode: string) => {
      const lang = WORLD_LANGUAGES.find(l => l.code === languageCode);
      if (!lang) throw new Error('Language not found');

      const maxOrder = activeLanguagesData.length > 0 
        ? Math.max(...activeLanguagesData.map(l => l.order_index)) 
        : 0;

      const { error } = await supabase
        .from('system_languages')
        .insert({
          code: lang.code,
          name: lang.name,
          native_name: lang.nativeName,
          flag: lang.flag,
          is_active: true,
          order_index: maxOrder + 1
        });
      
      if (error) throw error;
      return lang;
    },
    onSuccess: (lang) => {
      queryClient.invalidateQueries({ queryKey: ['system-languages'] });
      toast.success(`${lang.flag} ${lang.nativeName} aggiunta con successo`);
      setSelectedLanguage('');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Lingua già presente nel sistema');
      } else {
        toast.error('Errore durante l\'aggiunta della lingua');
      }
    }
  });

  // Remove language mutation
  const removeLanguageMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase
        .from('system_languages')
        .delete()
        .eq('code', code);
      
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['system-languages'] });
      const lang = WORLD_LANGUAGES.find(l => l.code === code);
      toast.success(`${lang?.flag} ${lang?.nativeName} rimossa`);
    },
    onError: () => {
      toast.error('Errore durante la rimozione della lingua');
    }
  });

  const handleAddLanguage = () => {
    if (!selectedLanguage) {
      toast.error('Seleziona una lingua da aggiungere');
      return;
    }
    addLanguageMutation.mutate(selectedLanguage);
  };

  const handleRemoveLanguage = (code: string) => {
    if (code === 'it') {
      toast.error('Impossibile rimuovere la lingua predefinita');
      return;
    }
    removeLanguageMutation.mutate(code);
  };

  const handleExportTranslations = () => {
    const data = {
      languages: activeLanguagesData.map(l => ({
        code: l.code,
        name: l.name,
        nativeName: l.native_name,
        flag: l.flag
      })),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'language-config.json';
    a.click();
    toast.success('Configurazione esportata');
  };

  const activeCodes = activeLanguagesData.map(l => l.code);
  const availableLanguages = WORLD_LANGUAGES.filter(
    lang => !activeCodes.includes(lang.code) &&
    (lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Gestione Lingue Sistema</h1>
        </div>
        <p className="text-muted-foreground">
          Aggiungi o rimuovi le lingue disponibili per l'interfaccia utente
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lingue Attive */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Lingue Attive</h2>
            <Badge variant="secondary">{activeLanguagesData.length} lingue</Badge>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Caricamento...</div>
          ) : (
            <div className="space-y-2">
              {activeLanguagesData.map((lang) => (
                <div
                  key={lang.code}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <div className="font-medium">{lang.native_name}</div>
                      <div className="text-sm text-muted-foreground">{lang.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {lang.code}
                    </Badge>
                    {lang.code !== 'it' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLanguage(lang.code)}
                        disabled={removeLanguageMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={handleExportTranslations}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Configurazione
            </Button>
          </div>
        </Card>

        {/* Aggiungi Lingua */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Aggiungi Nuova Lingua</h2>

          <div className="space-y-4">
            <div>
              <Label>Cerca Lingua</Label>
              <Input
                placeholder="Cerca per nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-3"
              />
            </div>

            <div>
              <Label>Seleziona Lingua</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Scegli una lingua..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                        <span className="text-muted-foreground text-sm">({lang.name})</span>
                      </span>
                    </SelectItem>
                  ))}
                  {availableLanguages.length === 0 && (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      Nessuna lingua disponibile
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAddLanguage} 
              className="w-full"
              disabled={addLanguageMutation.isPending || !selectedLanguage}
            >
              <Plus className="h-4 w-4 mr-2" />
              {addLanguageMutation.isPending ? 'Aggiunta in corso...' : 'Aggiungi Lingua'}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-medium mb-2 text-sm">ℹ️ Informazioni</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Le lingue aggiunte saranno disponibili nel selettore</li>
              <li>• È necessario creare il file di traduzione corrispondente</li>
              <li>• La lingua italiana (it) non può essere rimossa</li>
              <li>• Totale lingue disponibili: {WORLD_LANGUAGES.length}</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Statistiche */}
      <Card className="mt-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Statistiche e Istruzioni</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">{activeLanguagesData.length}</div>
            <div className="text-sm text-muted-foreground">Lingue Attive</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">{WORLD_LANGUAGES.length}</div>
            <div className="text-sm text-muted-foreground">Lingue Disponibili</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {WORLD_LANGUAGES.length - activeLanguagesData.length}
            </div>
            <div className="text-sm text-muted-foreground">Da Aggiungere</div>
          </div>
        </div>

        <div className="mt-4 p-4 border-l-4 border-primary bg-muted/30 rounded">
          <h3 className="font-medium mb-2">📝 Prossimi Passi</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Aggiungi la lingua desiderata dalla lista</li>
            <li>Crea il file JSON corrispondente in <code className="bg-muted px-1 rounded">src/locales/[code].json</code></li>
            <li>Importa il file in <code className="bg-muted px-1 rounded">src/i18n/config.ts</code></li>
            <li>✅ Le lingue aggiunte qui appariranno automaticamente nel dropdown!</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

export default LanguageManager;
