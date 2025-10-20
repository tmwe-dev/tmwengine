import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { DesignLabScanner as Scanner } from '@/lib/design-lab/scanner';
import { ScanConfig, ScanResult } from '@/types/design-lab-scanner';
import { Play, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AVAILABLE_PAGES = [
  { name: 'Rubrica', path: 'src/pages/Rubrica.tsx', category: 'Commercial' },
  { name: 'Attivita', path: 'src/pages/Attivita.tsx', category: 'Commercial' },
  { name: 'Campagne', path: 'src/pages/Campagne.tsx', category: 'Email' },
  { name: 'EmailCampagne', path: 'src/pages/EmailCampagne.tsx', category: 'Email' },
  { name: 'Chat', path: 'src/pages/Chat.tsx', category: 'Chat & AI' },
];

export default function DesignLabScanner() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [scanDepth, setScanDepth] = useState<'shallow' | 'deep'>('deep');
  const [generateThumbnails, setGenerateThumbnails] = useState(true);
  const [createPlugins, setCreatePlugins] = useState(true);
  const [exportFiles, setExportFiles] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);

  const togglePage = (pageName: string) => {
    setSelectedPages(prev =>
      prev.includes(pageName)
        ? prev.filter(p => p !== pageName)
        : [...prev, pageName]
    );
  };

  const selectAll = () => {
    setSelectedPages(AVAILABLE_PAGES.map(p => p.name));
  };

  const runScanner = async () => {
    if (selectedPages.length === 0) {
      toast({
        title: 'Nessuna pagina selezionata',
        description: 'Seleziona almeno una pagina da scansionare',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setProgress(0);
    setScanResults(null);

    const config: ScanConfig = {
      targetPages: selectedPages,
      scanDepth,
      generateThumbnails,
      extractFunctions: true,
      createPlugins,
      exportFiles,
    };

    const scanner = new Scanner(config);

    try {
      setCurrentTask('Inizializzazione scanner...');
      setProgress(10);

      await new Promise(resolve => setTimeout(resolve, 500));

      setCurrentTask('Scansione pagine...');
      setProgress(30);

      const results = await scanner.scanAllPages();

      setProgress(100);
      setCurrentTask('Completato!');

      setScanResults(results);

      toast({
        title: 'Scansione completata!',
        description: `${results.pages_scanned} pagine, ${results.components_extracted} componenti, ${results.thumbnails_generated} miniature`,
      });
    } catch (error) {
      console.error('Errore durante la scansione:', error);
      toast({
        title: 'Errore durante la scansione',
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Design Lab Scanner</h1>
        <p className="text-muted-foreground mt-2">
          Scansiona le tue pagine esistenti per estrarre componenti, funzioni e creare plugin riutilizzabili
        </p>
      </div>

      {/* Step 1: Selezione pagine */}
      <Card>
        <CardHeader>
          <CardTitle>1. Seleziona Pagine da Scansionare</CardTitle>
          <CardDescription>
            Scegli quali pagine analizzare per estrarre componenti e funzioni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AVAILABLE_PAGES.map(page => (
              <div key={page.name} className="flex items-center space-x-2">
                <Checkbox
                  id={page.name}
                  checked={selectedPages.includes(page.name)}
                  onCheckedChange={() => togglePage(page.name)}
                />
                <Label htmlFor={page.name} className="cursor-pointer">
                  <div>
                    <div className="font-medium">{page.name}</div>
                    <div className="text-xs text-muted-foreground">{page.category}</div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
          <Button onClick={selectAll} variant="outline" className="mt-4">
            Seleziona Tutto
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Configurazione */}
      <Card>
        <CardHeader>
          <CardTitle>2. Configurazione Scansione</CardTitle>
          <CardDescription>
            Personalizza il comportamento dello scanner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Profondità Scansione</Label>
            <Select value={scanDepth} onValueChange={(v: 'shallow' | 'deep') => setScanDepth(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shallow">Shallow (solo componenti)</SelectItem>
                <SelectItem value="deep">Deep (componenti + funzioni + hooks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="thumbnails"
              checked={generateThumbnails}
              onCheckedChange={(checked) => setGenerateThumbnails(checked as boolean)}
            />
            <Label htmlFor="thumbnails">Genera Miniature</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="plugins"
              checked={createPlugins}
              onCheckedChange={(checked) => setCreatePlugins(checked as boolean)}
            />
            <Label htmlFor="plugins">Crea Plugin Automatici</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="export"
              checked={exportFiles}
              onCheckedChange={(checked) => setExportFiles(checked as boolean)}
            />
            <Label htmlFor="export">Esporta in /DesignLab</Label>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Esecuzione */}
      <Card>
        <CardHeader>
          <CardTitle>3. Esegui Scansione</CardTitle>
          <CardDescription>
            Avvia il processo di analisi ed estrazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runScanner}
            disabled={isScanning || selectedPages.length === 0}
            size="lg"
            className="w-full"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scansione in corso... {progress}%
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Avvia Scansione
              </>
            )}
          </Button>

          {isScanning && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">{currentTask}</p>
            </div>
          )}

          {scanResults && (
            <Alert className="mt-6">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Scansione Completata!</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{scanResults.pages_scanned} pagine scansionate</li>
                  <li>{scanResults.components_extracted} componenti estratti</li>
                  <li>{scanResults.functions_extracted} funzioni estratte</li>
                  <li>{scanResults.plugins_created} plugin creati</li>
                  <li>{scanResults.thumbnails_generated} miniature generate</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {scanResults && (
            <Button 
              onClick={() => navigate('/design-lab')} 
              className="w-full mt-4"
              variant="outline"
            >
              Vai al Design Lab
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
