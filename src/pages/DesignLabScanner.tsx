import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCodeIndexer } from '@/hooks/useCodeIndexer';
import { useRouteDiscovery } from '@/hooks/useRouteDiscovery';
import { DesignLabScanner as Scanner } from '@/lib/design-lab/scanner';
import { ScanConfig, ScanResult } from '@/types/design-lab-scanner';
import { Play, Loader2, CheckCircle, Database, AlertCircle, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { regenerateMissingThumbnails } from '@/lib/design-lab/thumbnail-generator';

export default function DesignLabScanner() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { indexStatus, isCheckingIndex, isIndexing, runIndexing } = useCodeIndexer();
  const { data: discoveredRoutes, isLoading: isLoadingRoutes } = useRouteDiscovery();
  
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [scanDepth, setScanDepth] = useState<'shallow' | 'deep'>('deep');
  const [generateThumbnails, setGenerateThumbnails] = useState(true);
  const [createPlugins, setCreatePlugins] = useState(true);
  const [exportFiles, setExportFiles] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);

  const isIndexed = (indexStatus?.fileCount ?? 0) > 0;
  const canScan = isIndexed && !isScanning && !isIndexing;

  // Get unique categories
  const categories = useMemo(() => {
    if (!discoveredRoutes) return [];
    const cats = new Set(discoveredRoutes.map(r => r.category));
    return ['all', ...Array.from(cats)].sort();
  }, [discoveredRoutes]);

  // Filter routes based on search and category
  const filteredRoutes = useMemo(() => {
    if (!discoveredRoutes) return [];
    
    return discoveredRoutes.filter(route => {
      const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           route.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || route.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [discoveredRoutes, searchQuery, selectedCategory]);

  const togglePage = (pagePath: string) => {
    setSelectedPages(prev =>
      prev.includes(pagePath)
        ? prev.filter(p => p !== pagePath)
        : [...prev, pagePath]
    );
  };

  const selectAll = () => {
    if (!filteredRoutes) return;
    
    if (selectedPages.length === filteredRoutes.length && filteredRoutes.length > 0) {
      setSelectedPages([]);
    } else {
      setSelectedPages(filteredRoutes.map(r => r.path));
    }
  };

  const selectByCategory = (category: string) => {
    if (!discoveredRoutes) return;
    
    const routesInCategory = discoveredRoutes
      .filter(r => r.category === category)
      .map(r => r.path);
    
    const allSelected = routesInCategory.every(path => selectedPages.includes(path));
    
    if (allSelected) {
      setSelectedPages(prev => prev.filter(p => !routesInCategory.includes(p)));
    } else {
      setSelectedPages(prev => [...new Set([...prev, ...routesInCategory])]);
    }
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
      // Subscribe to real-time progress updates from scanner
      scanner.onProgress((progressValue, taskDescription) => {
        setProgress(progressValue);
        setCurrentTask(taskDescription);
      });

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

      {/* Stato Indicizzazione Codebase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Stato Indicizzazione Codebase
          </CardTitle>
          <CardDescription>
            Prima di scansionare, è necessario indicizzare il codebase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCheckingIndex ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifica stato indicizzazione...</span>
            </div>
          ) : !isIndexed ? (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Indicizzazione necessaria</AlertTitle>
                <AlertDescription>
                  Nessun file trovato in code_index. Esegui l'indicizzazione del codebase prima di scansionare.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => runIndexing(false)}
                disabled={isIndexing}
                size="lg"
                className="w-full"
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Indicizzazione in corso...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Indicizza Codebase
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {indexStatus?.fileCount} file indicizzati
                  </Badge>
                </div>
                {indexStatus?.lastIndexed && (
                  <p className="text-xs text-muted-foreground">
                    Ultima indicizzazione:{' '}
                    {formatDistanceToNow(new Date(indexStatus.lastIndexed), {
                      addSuffix: true,
                      locale: it,
                    })}
                  </p>
                )}
              </div>
              <Button
                onClick={() => runIndexing(true)}
                disabled={isIndexing}
                variant="outline"
                size="sm"
              >
                {isIndexing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-Indicizza
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Selezione pagine */}
      <Card>
        <CardHeader>
          <CardTitle>1. Seleziona Pagine da Scansionare</CardTitle>
          <CardDescription>
            {isLoadingRoutes 
              ? 'Caricamento route automatico...' 
              : `${discoveredRoutes?.length || 0} pagine scoperte automaticamente da App.tsx`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingRoutes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Scoperta automatica route...</span>
            </div>
          ) : (
            <>
              {/* Search and Category Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca pagine per nome o path..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const count = cat === 'all' 
                      ? discoveredRoutes?.length || 0
                      : discoveredRoutes?.filter(r => r.category === cat).length || 0;
                    
                    return (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat === 'all' ? 'Tutte' : cat} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={selectAll}
                  >
                    {selectedPages.length === filteredRoutes.length && filteredRoutes.length > 0
                      ? 'Deseleziona Filtrate' 
                      : 'Seleziona Filtrate'}
                  </Button>
                  {selectedCategory !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectByCategory(selectedCategory)}
                    >
                      Toggle {selectedCategory}
                    </Button>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedPages.length} di {discoveredRoutes?.length || 0} selezionate ({filteredRoutes.length} mostrate)
                </span>
              </div>

              {/* Routes List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredRoutes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessuna pagina trovata con i filtri selezionati
                  </p>
                ) : selectedCategory === 'all' ? (
                  // Group by category when showing all
                  categories.filter(cat => cat !== 'all').map(category => {
                    const routesInCat = filteredRoutes.filter(r => r.category === category);
                    if (routesInCat.length === 0) return null;

                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between sticky top-0 bg-background py-1">
                          <h4 className="text-sm font-semibold text-muted-foreground">{category}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectByCategory(category)}
                            className="h-6 text-xs"
                          >
                            Toggle
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                          {routesInCat.map((route) => (
                            <div key={route.path} className="flex items-center space-x-2">
                              <Checkbox
                                id={route.path}
                                checked={selectedPages.includes(route.path)}
                                onCheckedChange={() => togglePage(route.path)}
                              />
                              <Label 
                                htmlFor={route.path}
                                className="text-sm font-medium leading-none cursor-pointer flex-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{route.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{route.path}</span>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Simple list when filtered by category
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredRoutes.map((route) => (
                      <div key={route.path} className="flex items-center space-x-2">
                        <Checkbox
                          id={route.path}
                          checked={selectedPages.includes(route.path)}
                          onCheckedChange={() => togglePage(route.path)}
                        />
                        <Label 
                          htmlFor={route.path}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          <div className="flex items-center justify-between">
                            <span>{route.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{route.path}</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
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
          {!isIndexed && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Indicizzazione richiesta</AlertTitle>
              <AlertDescription>
                Completa l'indicizzazione del codebase prima di avviare la scansione.
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            onClick={runScanner}
            disabled={!canScan || selectedPages.length === 0}
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
                Scansiona Componenti
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

          {scanResults && scanResults.thumbnails_generated < scanResults.components_extracted && (
            <Alert className="mt-6" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Miniature Incomplete</AlertTitle>
              <AlertDescription>
                <p className="mb-3">
                  {scanResults.components_extracted - scanResults.thumbnails_generated} miniature non generate.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const result = await regenerateMissingThumbnails((current, total) => {
                        setCurrentTask(`Rigenerazione miniature: ${current}/${total}`);
                      });
                      
                      toast({
                        title: 'Rigenerazione completata!',
                        description: `${result.success} miniature generate, ${result.failed} fallite`,
                        variant: result.failed > 0 ? 'destructive' : 'default',
                      });

                      // Refresh scan results
                      if (result.success > 0) {
                        setScanResults({
                          ...scanResults,
                          thumbnails_generated: scanResults.thumbnails_generated + result.success,
                        });
                      }
                    } catch (error) {
                      toast({
                        title: 'Errore rigenerazione',
                        description: error instanceof Error ? error.message : 'Errore sconosciuto',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rigenera Miniature Mancanti
                </Button>
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
