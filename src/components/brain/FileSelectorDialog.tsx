import React, { useState, useCallback } from 'react';
import { Upload, X, FileCode, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCodeScanner } from '@/hooks/useCodeScanner';
import { cn } from '@/lib/utils';

interface FileSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete?: () => void;
}

interface SelectedFile {
  file: File;
  content: string;
  size: number;
  lines: number;
}

export function FileSelectorDialog({ open, onOpenChange, onScanComplete }: FileSelectorDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [scanType, setScanType] = useState<'full' | 'incremental' | 'specific'>('full');
  const { isScanning, scanResult, startScan, error } = useCodeScanner();

  const readFileContent = useCallback(async (file: File): Promise<SelectedFile> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split('\n').length;
        resolve({
          file,
          content,
          size: file.size,
          lines,
        });
      };
      reader.readAsText(file);
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const tsFiles = files.filter(f => f.name.endsWith('.ts') || f.name.endsWith('.tsx'));

    const fileContents = await Promise.all(tsFiles.map(readFileContent));
    setSelectedFiles((prev) => [...prev, ...fileContents]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartScan = async () => {
    if (selectedFiles.length === 0) return;

    const fileContents = selectedFiles.map((f) => ({
      path: f.file.name,
      content: f.content,
    }));

    await startScan(fileContents, scanType);

    if (scanResult?.success) {
      onScanComplete?.();
      onOpenChange(false);
      setSelectedFiles([]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const totalLines = selectedFiles.reduce((acc, f) => acc + f.lines, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nuovo Scan Codice</DialogTitle>
          <DialogDescription>
            Seleziona i file TypeScript/TSX da analizzare per trovare duplicati e funzioni condivise
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="file-upload" className="text-sm font-medium">
                File da Analizzare
              </Label>
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Carica File
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".ts,.tsx"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isScanning}
                  />
                </label>
              </Button>
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((f, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(f.size)} • {f.lines} righe
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isScanning}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">Totale</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} file • {formatBytes(totalSize)} • {totalLines} righe
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Scan Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo di Scan</Label>
            <RadioGroup value={scanType} onValueChange={(v) => setScanType(v as any)} disabled={isScanning}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Full Scan</p>
                    <p className="text-xs text-muted-foreground">
                      Analizza tutti i file caricati completamente
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="incremental" id="incremental" />
                <Label htmlFor="incremental" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Incremental Scan</p>
                    <p className="text-xs text-muted-foreground">
                      Analizza solo le modifiche rispetto all'ultimo scan
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="specific" id="specific" />
                <Label htmlFor="specific" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Specific Scan</p>
                    <p className="text-xs text-muted-foreground">
                      Analizza solo funzioni specifiche selezionate
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {scanResult?.success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-500">
                Scan completato: {scanResult.stats.functions_found} funzioni, {scanResult.stats.duplicates_detected} duplicati
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isScanning}>
            Annulla
          </Button>
          <Button
            onClick={handleStartScan}
            disabled={selectedFiles.length === 0 || isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scansione...
              </>
            ) : (
              <>
                <FileCode className="h-4 w-4 mr-2" />
                Avvia Scan
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
