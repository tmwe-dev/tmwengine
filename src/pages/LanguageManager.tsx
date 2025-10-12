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
  const [activeLanguages, setActiveLanguages] = useState<string[]>(['it', 'en', 'es', 'fr', 'de']);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddLanguage = () => {
    if (!selectedLanguage) {
      toast.error('Seleziona una lingua da aggiungere');
      return;
    }

    if (activeLanguages.includes(selectedLanguage)) {
      toast.error('Lingua già presente nel sistema');
      return;
    }

    setActiveLanguages([...activeLanguages, selectedLanguage]);
    const lang = WORLD_LANGUAGES.find(l => l.code === selectedLanguage);
    toast.success(`${lang?.flag} ${lang?.nativeName} aggiunta con successo`);
    setSelectedLanguage('');
  };

  const handleRemoveLanguage = (code: string) => {
    if (code === 'it') {
      toast.error('Impossibile rimuovere la lingua predefinita');
      return;
    }

    setActiveLanguages(activeLanguages.filter(l => l !== code));
    const lang = WORLD_LANGUAGES.find(l => l.code === code);
    toast.success(`${lang?.flag} ${lang?.nativeName} rimossa`);
  };

  const handleExportTranslations = () => {
    const data = {
      languages: activeLanguages,
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

  const availableLanguages = WORLD_LANGUAGES.filter(
    lang => !activeLanguages.includes(lang.code) &&
    (lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeLanguagesData = activeLanguages
    .map(code => WORLD_LANGUAGES.find(l => l.code === code))
    .filter(Boolean);

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
            <Badge variant="secondary">{activeLanguages.length} lingue</Badge>
          </div>

          <div className="space-y-2">
            {activeLanguagesData.map((lang) => (
              <div
                key={lang.code}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <div className="font-medium">{lang.nativeName}</div>
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
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

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

            <Button onClick={handleAddLanguage} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Lingua
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
            <div className="text-2xl font-bold text-primary">{activeLanguages.length}</div>
            <div className="text-sm text-muted-foreground">Lingue Attive</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">{WORLD_LANGUAGES.length}</div>
            <div className="text-sm text-muted-foreground">Lingue Disponibili</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {WORLD_LANGUAGES.length - activeLanguages.length}
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
            <li>Aggiungi la lingua all'array in <code className="bg-muted px-1 rounded">useLanguage.tsx</code></li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

export default LanguageManager;
