import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bug, RefreshCw, Save } from 'lucide-react';
import { routeToPageName, calculateComplexity } from '@/lib/debug-helpers';

interface DebugReport {
  pageRoute: string;
  pageName: string;
  pageFilePath: string;
  components: any[];
  functions: any[];
  hooks: any[];
  functionStatusMap: Record<string, 'active' | 'inactive' | 'suspect'>;
  linkedPages: string[];
  imports: any[];
  exports: any[];
  queries: any[];
  tables: string[];
  edgeFunctions: string[];
  hardcodedIssues: any[];
  orphanFunctions: string[];
  namingMismatches: any[];
  metrics: {
    totalFunctions: number;
    activeFunctions: number;
    inactiveFunctions: number;
    suspectFunctions: number;
    complexityScore: number;
  };
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: string;
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, color = "text-white" }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
  </div>
);

export function PageDebuggerAudit() {
  const location = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<DebugReport | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper: Extract Supabase queries from content
  const extractSupabaseQueries = (content: string) => {
    const regex = /supabase\.from\(['"](\w+)['"]\)\.(select|insert|update|delete|upsert)/g;
    const matches = [...content.matchAll(regex)];
    return matches.map(m => ({ table: m[1], operation: m[2] }));
  };

  // Helper: Extract linked pages (navigate calls)
  const extractLinkedPages = (content: string) => {
    const navigateRegex = /navigate\(['"]([^'"]+)['"]\)/g;
    const matches = [...content.matchAll(navigateRegex)];
    return matches.map(m => m[1]);
  };

  // Helper: Extract edge functions called
  const extractEdgeFunctions = (content: string) => {
    const edgeFunctionRegex = /supabase\.functions\.invoke\(['"]([^'"]+)['"]\)/g;
    const matches = [...content.matchAll(edgeFunctionRegex)];
    return matches.map(m => m[1]);
  };

  // Helper: Detect hardcoded issues
  const detectHardcodedIssues = (content: string) => {
    const issues = [];

    // URL hardcoded (exclude common patterns like http:// in comments)
    const urlMatches = content.match(/https?:\/\/[^\s"'`\)]+/g);
    if (urlMatches && urlMatches.length > 0) {
      issues.push({
        type: 'hardcoded_url',
        description: `${urlMatches.length} URL hardcoded trovati nel codice`
      });
    }

    // Potential API keys (long alphanumeric strings in quotes)
    const apiKeyPattern = /['"][a-zA-Z0-9_-]{32,}['"]/g;
    const keyMatches = content.match(apiKeyPattern);
    if (keyMatches && keyMatches.length > 0) {
      issues.push({
        type: 'potential_api_key',
        description: `${keyMatches.length} possibili API key hardcoded`
      });
    }

    return issues;
  };

  // Helper: Detect naming mismatches (snake_case vs camelCase)
  const detectNamingMismatches = (content: string, queries: any[]) => {
    const mismatches = [];
    const tables = [...new Set(queries.map(q => q.table))];

    tables.forEach(tableName => {
      // Check if camelCase version exists in code
      const camelVersion = tableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      if (camelVersion !== tableName && content.includes(camelVersion)) {
        mismatches.push({
          table: tableName,
          camelCase: camelVersion,
          issue: 'Mixed naming convention detected'
        });
      }
    });

    return mismatches;
  };

  // Helper: Generate function status map
  const generateStatusMap = (functions: any[], content: string): Record<string, 'active' | 'inactive' | 'suspect'> => {
    const statusMap: Record<string, 'active' | 'inactive' | 'suspect'> = {};

    functions.forEach((fn: any) => {
      const fnName = fn.name;
      const regex = new RegExp(`\\b${fnName}\\b`, 'g');
      const matches = content.match(regex) || [];
      const usageCount = matches.length;

      if (usageCount === 0) {
        statusMap[fnName] = 'inactive';
      } else if (usageCount === 1) {
        statusMap[fnName] = 'suspect';
      } else {
        statusMap[fnName] = 'active';
      }
    });

    return statusMap;
  };

  // Main scan function
  const scanAndReport = async (): Promise<DebugReport | null> => {
    console.log('🔍 [PageDebuggerAudit] Starting scan...');
    
    const currentRoute = location.pathname;
    const pageName = routeToPageName(currentRoute);
    
    console.log('📍 Route:', currentRoute);
    console.log('📄 Page Name:', pageName);
    
    // Fetch from code_index
    const { data: codeData, error } = await supabase
      .from('code_index')
      .select('*')
      .ilike('file_path', `%${pageName}%`)
      .single();
    
    if (error || !codeData) {
      console.warn('❌ No code_index entry for:', pageName, error);
      toast({ 
        title: 'Errore', 
        description: 'File non trovato in code_index. Assicurati che la pagina sia stata indicizzata.', 
        variant: 'destructive' 
      });
      return null;
    }
    
    console.log('✅ Code data found:', codeData.file_path);
    
    // Extract all data (cast from Json to arrays)
    const components = (codeData.components as any[]) || [];
    const functions = (codeData.functions as any[]) || [];
    const dependencies = (codeData.dependencies as any[]) || [];
    const hooks = dependencies.filter((d: string) => d.startsWith('use'));
    const content = codeData.content || '';
    const imports = (codeData.imports as any[]) || [];
    const exports = (codeData.exports as any[]) || [];

    // Analyze functions
    const functionStatusMap = generateStatusMap(functions, content);
    const orphanFunctions = Object.entries(functionStatusMap)
      .filter(([_, status]) => status === 'inactive' || status === 'suspect')
      .map(([name, _]) => name);

    // Extract queries and tables
    const queries = extractSupabaseQueries(content);
    const tables = [...new Set(queries.map(q => q.table))];

    // Extract linked pages
    const linkedPages = [...new Set(extractLinkedPages(content))];

    // Extract edge functions
    const edgeFunctions = [...new Set(extractEdgeFunctions(content))];

    // Detect issues
    const hardcodedIssues = detectHardcodedIssues(content);
    const namingMismatches = detectNamingMismatches(content, queries);

    // Calculate metrics
    const metrics = {
      totalFunctions: functions.length,
      activeFunctions: Object.values(functionStatusMap).filter(s => s === 'active').length,
      inactiveFunctions: Object.values(functionStatusMap).filter(s => s === 'inactive').length,
      suspectFunctions: Object.values(functionStatusMap).filter(s => s === 'suspect').length,
      complexityScore: calculateComplexity(content)
    };

    console.log('⚙️ [Functions]', metrics);
    console.log('🔗 [Linked Pages]', linkedPages);
    console.log('🚀 [Edge Functions]', edgeFunctions);
    console.log('⚠️ [Hardcoded Issues]', hardcodedIssues);
    console.log('🔤 [Naming Mismatches]', namingMismatches);

    return {
      pageRoute: currentRoute,
      pageName,
      pageFilePath: codeData.file_path,
      components,
      functions,
      hooks,
      functionStatusMap,
      linkedPages,
      imports,
      exports,
      queries,
      tables,
      edgeFunctions,
      hardcodedIssues,
      orphanFunctions,
      namingMismatches,
      metrics
    };
  };

  // Handle open dialog
  const handleOpenDialog = async () => {
    setIsOpen(true);
    setIsLoading(true);
    const scanResult = await scanAndReport();
    setReport(scanResult);
    setIsLoading(false);
  };

  // Handle refresh scan
  const handleRefreshScan = async () => {
    setIsLoading(true);
    const scanResult = await scanAndReport();
    setReport(scanResult);
    setIsLoading(false);
    toast({ title: 'Scan completato', description: 'Report aggiornato con successo!' });
  };

  // Handle save report
  const handleSaveReport = async () => {
    if (!report) return;
    
    console.log('💾 [Saving Report]', report);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Errore', description: 'User non autenticato', variant: 'destructive' });
      return;
    }
    
    const { error } = await supabase
      .from('debugging')
      .insert({
        user_id: user.id,
        page_route: report.pageRoute,
        page_name: report.pageName,
        page_file_path: report.pageFilePath,
        components: report.components,
        functions_detected: report.functions,
        hooks_detected: report.hooks,
        function_status_map: report.functionStatusMap,
        linked_pages: report.linkedPages,
        imports_detected: report.imports,
        exports_detected: report.exports,
        queries_detected: report.queries,
        tables_used: report.tables,
        edge_functions_called: report.edgeFunctions,
        hardcoded_issues: report.hardcodedIssues,
        orphan_functions: report.orphanFunctions,
        naming_mismatches: report.namingMismatches,
        total_functions: report.metrics.totalFunctions,
        active_functions: report.metrics.activeFunctions,
        inactive_functions: report.metrics.inactiveFunctions,
        suspect_functions: report.metrics.suspectFunctions,
        complexity_score: report.metrics.complexityScore,
        notes: notes
      });
    
    if (error) {
      console.error('❌ Error saving report:', error);
      toast({ title: 'Errore', description: 'Errore nel salvataggio del report', variant: 'destructive' });
      return;
    }
    
    console.log('✅ Report saved successfully');
    toast({ title: 'Successo', description: 'Report salvato su database!' });
  };

  return (
    <>
      {/* Floating Yellow Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleOpenDialog}
              className="fixed bottom-4 right-4 z-50 h-3 w-3 rounded-full bg-yellow-400 hover:bg-yellow-500 p-0 shadow-lg animate-pulse border-0"
              aria-label="Page Debug Audit"
            />
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">🔍 Page Audit</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dialog with Report */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-black text-white border-gray-800 max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-left flex items-center gap-2">
              <Bug className="h-5 w-5 text-yellow-400" />
              Page Audit: {report?.pageRoute || 'Loading...'}
            </DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-yellow-400" />
            </div>
          ) : report ? (
            <div className="space-y-6 text-left">
              
              {/* SEZIONE 1: Metriche */}
              <div className="grid grid-cols-5 gap-3">
                <MetricCard 
                  label="Funzioni Totali" 
                  value={report.metrics.totalFunctions} 
                  icon="⚙️"
                />
                <MetricCard 
                  label="Attive" 
                  value={report.metrics.activeFunctions} 
                  icon="🟢"
                  color="text-green-400"
                />
                <MetricCard 
                  label="Inattive" 
                  value={report.metrics.inactiveFunctions} 
                  icon="⚫️"
                  color="text-gray-500"
                />
                <MetricCard 
                  label="Sospette" 
                  value={report.metrics.suspectFunctions} 
                  icon="🟡"
                  color="text-yellow-400"
                />
                <MetricCard 
                  label="Complexity" 
                  value={report.metrics.complexityScore} 
                  icon="📊"
                />
              </div>
              
              {/* SEZIONE 2: Funzioni con Status */}
              {report.functions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    ⚙️ Funzioni Rilevate ({report.functions.length})
                  </h3>
                  <div className="space-y-2 pl-4 max-h-64 overflow-y-auto">
                    {report.functions.map((fn: any) => {
                      const status = report.functionStatusMap[fn.name];
                      const icon = status === 'active' ? '🟢' : status === 'inactive' ? '⚫️' : '🟡';
                      const color = status === 'active' ? 'text-green-400' : status === 'inactive' ? 'text-gray-500' : 'text-yellow-400';
                      
                      return (
                        <div key={fn.name} className="flex items-center gap-3 p-2 bg-gray-900 rounded">
                          <span className="text-lg">{icon}</span>
                          <code className={`text-sm font-mono ${color}`}>{fn.name}</code>
                          <Badge variant="outline" className="ml-auto">
                            {status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* SEZIONE 3: Collegamenti Maschere */}
              {report.linkedPages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    🔗 Collegamenti tra Maschere ({report.linkedPages.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 pl-4">
                    {report.linkedPages.map((page: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-800">
                        {page}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* SEZIONE 4: Edge Functions */}
              {report.edgeFunctions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    🚀 Edge Functions Chiamate ({report.edgeFunctions.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 pl-4">
                    {report.edgeFunctions.map((fn: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-purple-900/20 text-purple-300 border-purple-800">
                        {fn}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* SEZIONE 5: Query e Tabelle */}
              {report.queries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    🗄️ Query Supabase ({report.queries.length})
                  </h3>
                  <div className="space-y-1 pl-4 max-h-48 overflow-y-auto">
                    {report.queries.map((q: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <code className="text-blue-300">{q.operation}</code>
                        <span className="text-gray-500">on</span>
                        <code className="text-purple-300">{q.table}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* SEZIONE 6: Hardcode e Problemi */}
              {report.hardcodedIssues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-400">
                    ⚠️ Hardcode Rilevato ({report.hardcodedIssues.length})
                  </h3>
                  <div className="space-y-2 pl-4">
                    {report.hardcodedIssues.map((issue: any, idx: number) => (
                      <div key={idx} className="p-3 bg-red-900/20 border border-red-800 rounded text-sm">
                        <div className="font-semibold text-red-300">{issue.type}</div>
                        <div className="text-red-200">{issue.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* SEZIONE 7: Naming Mismatches */}
              {report.namingMismatches.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-400">
                    🔤 Incongruenze Nomi ({report.namingMismatches.length})
                  </h3>
                  <div className="space-y-2 pl-4">
                    {report.namingMismatches.map((mismatch: any, idx: number) => (
                      <div key={idx} className="p-3 bg-yellow-900/20 border border-yellow-800 rounded text-sm">
                        <div>Tabella: <code className="text-yellow-300">{mismatch.table}</code></div>
                        <div>Versione camelCase: <code className="text-yellow-300">{mismatch.camelCase}</code></div>
                        <div className="text-xs text-yellow-200 mt-1">{mismatch.issue}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* SEZIONE 8: Note Modificabili */}
              <div>
                <h3 className="text-lg font-semibold mb-3">📝 Note</h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Aggiungi note o commenti su questa pagina..."
                  className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
                />
              </div>
              
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Nessun report disponibile
            </div>
          )}
          
          {/* Actions */}
          {report && (
            <div className="flex gap-2 pt-4 border-t border-gray-800">
              <Button onClick={handleSaveReport} className="flex-1 bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Salva Report su DB
              </Button>
              <Button onClick={handleRefreshScan} variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-scan
              </Button>
            </div>
          )}
          
        </DialogContent>
      </Dialog>
    </>
  );
}
