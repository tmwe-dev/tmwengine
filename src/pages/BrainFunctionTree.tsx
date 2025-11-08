import { useState } from 'react';
import { useBrainScans, useBrainFunctions, type FunctionAnalysis } from '@/hooks/useBrainScans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, ChevronDown, FileCode, AlertTriangle, Users, Zap } from 'lucide-react';

export default function BrainFunctionTree() {
  const { data: scans, isLoading: scansLoading } = useBrainScans();
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<FunctionAnalysis | null>(null);
  const [filter, setFilter] = useState<'all' | 'duplicates' | 'shared' | 'heavy'>('all');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { data: functions, isLoading: functionsLoading } = useBrainFunctions(selectedScanId);

  const selectedScan = scans?.find(s => s.id === selectedScanId);

  // Group functions by file
  const fileTree: Record<string, FunctionAnalysis[]> = {};
  const filteredFunctions = functions?.filter(func => {
    if (filter === 'duplicates') return func.is_duplicate;
    if (filter === 'shared') return func.is_shared;
    if (filter === 'heavy') return func.is_heavy;
    return true;
  }) || [];

  filteredFunctions.forEach(func => {
    if (!fileTree[func.file_path]) {
      fileTree[func.file_path] = [];
    }
    fileTree[func.file_path].push(func);
  });

  const toggleFileExpansion = (filePath: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">🧠 Brain Function Tree</h1>
          <p className="text-muted-foreground">Analizza duplicati, funzioni condivise e complessità del codebase</p>
        </div>

        {/* Scan Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Seleziona Scan</CardTitle>
            <CardDescription>Scegli uno scan per visualizzare i risultati</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedScanId || ''} onValueChange={setSelectedScanId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona uno scan..." />
              </SelectTrigger>
              <SelectContent>
                {scans?.map(scan => (
                  <SelectItem key={scan.id} value={scan.id}>
                    {scan.scan_type} - {new Date(scan.started_at).toLocaleDateString()} - {scan.functions_found} funzioni
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedScan && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedScan.files_scanned}</div>
                  <div className="text-sm text-muted-foreground">File</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedScan.functions_found}</div>
                  <div className="text-sm text-muted-foreground">Funzioni</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{selectedScan.duplicates_detected}</div>
                  <div className="text-sm text-muted-foreground">Duplicati</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{selectedScan.shared_functions}</div>
                  <div className="text-sm text-muted-foreground">Condivise</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">{selectedScan.heavy_functions}</div>
                  <div className="text-sm text-muted-foreground">Heavy</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedScanId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tree View */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Function Tree</CardTitle>
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                    <TabsList>
                      <TabsTrigger value="all">Tutte</TabsTrigger>
                      <TabsTrigger value="duplicates">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Duplicati
                      </TabsTrigger>
                      <TabsTrigger value="shared">
                        <Users className="h-4 w-4 mr-1" />
                        Condivise
                      </TabsTrigger>
                      <TabsTrigger value="heavy">
                        <Zap className="h-4 w-4 mr-1" />
                        Heavy
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {functionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
                  ) : Object.keys(fileTree).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Nessuna funzione trovata</div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(fileTree).map(([filePath, funcs]) => (
                        <div key={filePath} className="border rounded-lg">
                          <button
                            onClick={() => toggleFileExpansion(filePath)}
                            className="w-full flex items-center gap-2 p-3 hover:bg-accent transition-colors"
                          >
                            {expandedFiles.has(filePath) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <FileCode className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-mono flex-1 text-left">{filePath}</span>
                            <Badge variant="secondary">{funcs.length}</Badge>
                          </button>

                          {expandedFiles.has(filePath) && (
                            <div className="border-t">
                              {funcs.map(func => (
                                <button
                                  key={func.id}
                                  onClick={() => setSelectedFunction(func)}
                                  className={`w-full flex items-center gap-2 p-3 pl-10 hover:bg-accent transition-colors ${
                                    selectedFunction?.id === func.id ? 'bg-accent' : ''
                                  }`}
                                >
                                  <span className="text-sm font-mono flex-1 text-left">
                                    {func.function_name}({func.function_signature?.split('(')[1] || ')'})
                                  </span>
                                  <div className="flex gap-1">
                                    {func.is_duplicate && (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Dup
                                      </Badge>
                                    )}
                                    {func.is_shared && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Users className="h-3 w-3 mr-1" />
                                        x{func.share_count}
                                      </Badge>
                                    )}
                                    {func.is_heavy && (
                                      <Badge variant="outline" className="text-xs">
                                        <Zap className="h-3 w-3 mr-1" />
                                        Heavy
                                      </Badge>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Detail Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Funzione</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFunction ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-mono font-bold text-lg mb-2">{selectedFunction.function_name}</h3>
                      <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                        {selectedFunction.function_signature}
                      </code>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">LOC</div>
                        <div className="text-2xl font-bold">{selectedFunction.lines_of_code}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Complessità</div>
                        <div className="text-2xl font-bold">{selectedFunction.cyclomatic_complexity}</div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">File</h4>
                      <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                        {selectedFunction.file_path}
                      </code>
                    </div>

                    {selectedFunction.is_duplicate && selectedFunction.duplicate_of && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2 text-red-500">Duplicato di</h4>
                          <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                            {selectedFunction.duplicate_of}
                          </code>
                        </div>
                      </>
                    )}

                    {selectedFunction.is_shared && selectedFunction.shared_in_files && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2 text-blue-500">
                            Condivisa in {selectedFunction.share_count} file
                          </h4>
                          <div className="space-y-1">
                            {selectedFunction.shared_in_files.map((file, idx) => (
                              <code key={idx} className="text-xs bg-muted p-1 rounded block overflow-x-auto">
                                {file}
                              </code>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedFunction.dependencies && selectedFunction.dependencies.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2">Dipendenze</h4>
                          <div className="space-y-1">
                            {selectedFunction.dependencies.map((dep, idx) => (
                              <code key={idx} className="text-xs bg-muted p-1 rounded block overflow-x-auto">
                                {dep}
                              </code>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                      {selectedFunction.is_duplicate && (
                        <Badge variant="destructive">Duplicato</Badge>
                      )}
                      {selectedFunction.is_shared && (
                        <Badge variant="secondary">Condivisa</Badge>
                      )}
                      {selectedFunction.is_heavy && (
                        <Badge variant="outline">Heavy Function</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Seleziona una funzione per vedere i dettagli
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
