import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Square, Download, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmailImportResults } from "./EmailImportResults";
import { EmailImportChart } from "./EmailImportChart";

interface EmailResult {
  uid: string;
  subject: string;
  from: string;
  date: string;
  downloadTime: number;
  batchSize: number;
  success: boolean;
  error?: string;
}

interface FolderInfo {
  folder_name: string;
  message_count: number;
}

export function EmailImportTester() {
  const { toast } = useToast();
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>("INBOX");
  const [batchSize, setBatchSize] = useState<number>(10);
  const [maxEmails, setMaxEmails] = useState<number>(50);
  const [format, setFormat] = useState<string>("html");
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [currentEmail, setCurrentEmail] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);

  // Recupera lista cartelle all'avvio
  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setLoadingFolders(true);
    try {
      const { data, error } = await supabase.functions.invoke('tmwe-api-proxy', {
        body: {
          endpoint: '/app.php?action=email_message',
          data: { handler: 'get_folders' }
        }
      });

      if (error) throw error;
      
      const folderList = data?.data || data || [];
      setFolders(folderList);
      
      if (folderList.length > 0) {
        setSelectedFolder(folderList[0].folder_name);
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: `Impossibile caricare le cartelle: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoadingFolders(false);
    }
  };

  const startTest = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setResults([]);
    setProgress(0);
    setCurrentEmail(0);
    setStartTime(Date.now());

    let offset = 0;
    const emailsToDownload = maxEmails;
    setTotalEmails(emailsToDownload);

    try {
      while (offset < emailsToDownload && !isPaused) {
        const limit = Math.min(batchSize, emailsToDownload - offset);

        // 1. Recupera lista UID
        const { data: messagesData, error: messagesError } = await supabase.functions.invoke('tmwe-api-proxy', {
          body: {
            endpoint: '/app.php?action=email_message',
            data: {
              handler: 'get_messages',
              folder: selectedFolder,
              limit,
              offset,
              format
            }
          }
        });

        if (messagesError) throw messagesError;

        const messages = messagesData?.data?.messages || messagesData?.messages || [];

        // 2. Scarica ogni email del batch
        for (const msg of messages) {
          if (isPaused) break;

          const emailStartTime = performance.now();

          try {
            const { data: emailData, error: emailError } = await supabase.functions.invoke('tmwe-api-proxy', {
              body: {
                endpoint: '/app.php?action=email_message',
                data: {
                  handler: 'get_message',
                  uid: msg.uid,
                  include_attachments: includeAttachments,
                  format
                }
              }
            });

            const downloadTime = performance.now() - emailStartTime;

            setResults(prev => [...prev, {
              uid: msg.uid,
              subject: emailData?.subject || msg.subject || 'N/A',
              from: emailData?.from || msg.from || 'N/A',
              date: emailData?.date || msg.date || 'N/A',
              downloadTime,
              batchSize,
              success: !emailError,
              error: emailError?.message
            }]);

            setCurrentEmail(prev => prev + 1);
            setProgress((offset + messages.indexOf(msg) + 1) / emailsToDownload * 100);

            // Delay per evitare rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error: any) {
            setResults(prev => [...prev, {
              uid: msg.uid,
              subject: msg.subject || 'N/A',
              from: msg.from || 'N/A',
              date: msg.date || 'N/A',
              downloadTime: performance.now() - emailStartTime,
              batchSize,
              success: false,
              error: error.message
            }]);
          }
        }

        offset += limit;
      }

      toast({
        title: "Test completato",
        description: `${results.filter(r => r.success).length}/${results.length} email scaricate con successo`,
      });

    } catch (error: any) {
      toast({
        title: "Errore durante il test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const pauseTest = () => {
    setIsPaused(true);
    setIsRunning(false);
  };

  const stopTest = () => {
    setIsPaused(false);
    setIsRunning(false);
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-import-test-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Risultati esportati",
      description: "File JSON scaricato con successo",
    });
  };

  // Calcola statistiche
  const totalTime = results.length > 0 ? Date.now() - startTime : 0;
  const avgTime = results.length > 0 
    ? results.reduce((sum, r) => sum + r.downloadTime, 0) / results.length 
    : 0;
  const successRate = results.length > 0 
    ? (results.filter(r => r.success).length / results.length) * 100 
    : 0;
  const emailsPerSecond = totalTime > 0 ? (results.length / (totalTime / 1000)) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📧 Email Import Performance Tester</CardTitle>
          <CardDescription>
            Testa l'importazione batch di email con diverse configurazioni per trovare i parametri ottimali
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configurazione */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>📁 Cartella</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loadingFolders ? (
                    <SelectItem value="loading" disabled>Caricamento...</SelectItem>
                  ) : (
                    folders.map(folder => (
                      <SelectItem key={folder.folder_name} value={folder.folder_name}>
                        {folder.folder_name} ({folder.message_count})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>🔢 Batch Size</Label>
              <Select value={batchSize.toString()} onValueChange={v => setBatchSize(Number(v))} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 email</SelectItem>
                  <SelectItem value="10">10 email</SelectItem>
                  <SelectItem value="20">20 email</SelectItem>
                  <SelectItem value="50">50 email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>📊 Formato</Label>
              <Select value={format} onValueChange={setFormat} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>📎 Allegati</Label>
              <div className="flex items-center space-x-2 h-10 px-3 border rounded-md">
                <Checkbox 
                  id="attachments" 
                  checked={includeAttachments}
                  onCheckedChange={(checked) => setIncludeAttachments(checked as boolean)}
                  disabled={isRunning}
                />
                <label htmlFor="attachments" className="text-sm cursor-pointer">
                  Include
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>📈 Max Email da Scaricare</Label>
            <Input 
              type="number" 
              value={maxEmails}
              onChange={(e) => setMaxEmails(Number(e.target.value))}
              min={1}
              max={500}
              disabled={isRunning}
            />
          </div>

          {/* Controlli */}
          <div className="flex gap-2">
            <Button 
              onClick={startTest} 
              disabled={isRunning || loadingFolders}
              className="gap-2"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Test
            </Button>
            <Button onClick={pauseTest} disabled={!isRunning} variant="outline" className="gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
            <Button onClick={stopTest} disabled={!isRunning && !isPaused} variant="outline" className="gap-2">
              <Square className="w-4 h-4" />
              Stop
            </Button>
            <Button onClick={exportResults} disabled={results.length === 0} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          {/* Progress */}
          {(isRunning || results.length > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress: {currentEmail}/{totalEmails} email</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tempo: {(totalTime / 1000).toFixed(1)}s</span>
                <span>Velocità: {emailsPerSecond.toFixed(1)} email/sec</span>
              </div>
            </div>
          )}

          {/* Statistiche */}
          {results.length > 0 && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Tempo Totale</div>
                <div className="text-2xl font-bold">{(totalTime / 1000).toFixed(1)}s</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Tempo Medio</div>
                <div className="text-2xl font-bold">{avgTime.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Velocità</div>
                <div className="text-2xl font-bold">{emailsPerSecond.toFixed(1)}/s</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="text-2xl font-bold">{successRate.toFixed(0)}%</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risultati */}
      {results.length > 0 && (
        <>
          <EmailImportResults results={results} />
          <EmailImportChart results={results} />
        </>
      )}
    </div>
  );
}
