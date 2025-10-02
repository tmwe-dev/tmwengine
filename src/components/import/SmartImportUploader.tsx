import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, FileType, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';

interface SmartImportUploaderProps {
  onAnalysisComplete: (result: any) => void;
}

export function SmartImportUploader({ onAnalysisComplete }: SmartImportUploaderProps) {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [storedFileName, setStoredFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    sampleRows: any[];
    fileName: string;
  } | null>(null);

  const handleFileUpload = async () => {
    if (!importFile) {
      toast.error('Seleziona un file');
      return;
    }

    setUploadingFile(true);

    try {
      // ESATTAMENTE come ImportTemplates (riga 880-883)
      const fileName = `${Date.now()}_${importFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('import-files')
        .upload(fileName, importFile);

      if (uploadError) throw uploadError;

      console.log('✅ File caricato su Storage:', fileName);
      setStoredFileName(fileName);
      toast.success('File caricato! Caricamento anteprima...');

      // Ora leggi il file da Storage per mostrare l'anteprima
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('import-files')
        .download(fileName);

      if (downloadError) throw downloadError;

      console.log('✅ File scaricato da Storage');

      // Parse del file
      let headers: string[] = [];
      let sampleRows: any[] = [];

      if (importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls')) {
        const arrayBuffer = await fileData.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        headers = jsonData[0] || [];
        sampleRows = jsonData.slice(1, 6).map(row => {
          const obj: any = {};
          headers.forEach((header, idx) => {
            obj[header] = row[idx];
          });
          return obj;
        });
      } else if (importFile.name.endsWith('.csv')) {
        const text = await fileData.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : 
                         firstLine.includes('\t') ? '\t' : ',';
        
        headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
        sampleRows = lines.slice(1, 6).map(line => {
          const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
          const obj: any = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx];
          });
          return obj;
        });
      } else if (importFile.name.endsWith('.txt')) {
        const text = await fileData.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        const separator = lines[0].includes('\t') ? '\t' : /\s{2,}/;
        headers = lines[0].split(separator).map(h => h.trim());
        sampleRows = lines.slice(1, 6).map(line => {
          const values = line.split(separator).map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx];
          });
          return obj;
        });
      }

      console.log('📊 Anteprima:', { headers, sampleRowsCount: sampleRows.length });

      setPreview({
        headers,
        sampleRows,
        fileName: importFile.name
      });

      toast.success('Anteprima pronta! Controlla i dati.');

    } catch (error: any) {
      console.error('❌ Errore:', error);
      toast.error(`Errore: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const analyzeWithAI = async () => {
    if (!preview || !storedFileName) return;
    
    setIsAnalyzing(true);
    
    try {
      const systemPrompt = `Sei un esperto di data mapping per sistemi CRM.

**Schema Database Target:**
- company_name (Nome azienda)
- company_alias (Alias azienda) 
- name (Nome contatto/responsabile)
- alias (Alias contatto)
- position (Posizione/ruolo)
- title (Titolo)
- phone (Telefono fisso)
- cell (Cellulare)
- email (Email)
- address (Indirizzo)
- city (Città)
- country (Paese)
- zip_code (CAP)
- origin (Origine/fonte)
- client_code (Codice cliente)
- note (Note)
- last_contact (Data ultimo contatto - formato YYYY-MM-DD)
- scheduled_contact (Data contatto programmato - formato YYYY-MM-DD)
- next_contact_date (Data prossimo contatto - formato YYYY-MM-DD)

**Tuo Compito:**
Analizza le colonne fornite e restituisci un JSON con questa struttura ESATTA:

{
  "mapping": {
    "colonnaOriginale": {
      "target": "campo_db",
      "confidence": 0.95,
      "transform": "nome_trasformazione"
    }
  },
  "warnings": ["eventuali problemi rilevati"],
  "suggestions": ["suggerimenti di miglioramento"]
}

**Regole Trasformazione:**
- "normalize_phone": rimuove spazi, punti, parentesi, trattini
- "normalize_email": lowercase + trim
- "parse_date": converte vari formati a YYYY-MM-DD
- "uppercase": converte in maiuscolo
- "lowercase": converte in minuscolo
- "trim": rimuove spazi iniziali e finali

**IMPORTANTE:**
- Se una colonna contiene numeri di telefono, usa "normalize_phone"
- Se contiene email, usa "normalize_email"  
- Se contiene date, usa "parse_date"
- Se NON sei sicuro del mapping, mettilo in warnings
- Confidence < 0.7 = warning automatico

Rispondi SOLO con JSON valido, senza markdown o altro testo.`;

      const { data, error } = await supabase.functions.invoke('chat-with-openai', {
        body: {
          requestType: 'import-analysis',
          prompt: JSON.stringify({ headers: preview.headers, sampleRows: preview.sampleRows }),
          systemPrompt: systemPrompt
        }
      });

      if (error) {
        console.error('AI analysis error:', error);
        throw new Error('Errore durante l\'analisi AI');
      }

      let aiResponse = data.response;
      
      if (aiResponse.includes('```json')) {
        aiResponse = aiResponse.split('```json')[1].split('```')[0].trim();
      } else if (aiResponse.includes('```')) {
        aiResponse = aiResponse.split('```')[1].split('```')[0].trim();
      }

      const analysisResult = JSON.parse(aiResponse);

      toast.success('Analisi completata!');
      onAnalysisComplete({
        ...analysisResult,
        headers: preview.headers,
        sampleRows: preview.sampleRows,
        fileName: preview.fileName
      });

    } catch (error) {
      console.error('Error analyzing:', error);
      toast.error('Errore durante l\'analisi');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImportFile(file);
      setPreview(null);
      setStoredFileName(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Intelligente
        </CardTitle>
        <CardDescription>
          Trascina qui il tuo file. Verrà caricato su Supabase e l'AI lo analizzerà.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex justify-center gap-4 mb-4">
              <FileSpreadsheet className="h-10 w-10 text-green-500" />
              <FileText className="h-10 w-10 text-blue-500" />
              <FileType className="h-10 w-10 text-orange-500" />
            </div>
            
            <p className="text-base font-medium mb-2">
              {isDragActive 
                ? 'Rilascia il file qui...' 
                : importFile ? `📄 ${importFile.name}` : 'Trascina qui il file o clicca per selezionare'
              }
            </p>
            
            <p className="text-sm text-muted-foreground">
              Formati: Excel (.xlsx, .xls), CSV, TXT
            </p>
          </div>

          {/* Pulsante Upload */}
          {importFile && !preview && (
            <Button 
              onClick={handleFileUpload}
              disabled={uploadingFile}
              className="w-full"
            >
              {uploadingFile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Caricamento su Storage...
                </>
              ) : (
                'Carica su Supabase Storage'
              )}
            </Button>
          )}

          {/* Anteprima */}
          {preview && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">✅ File su Storage: {storedFileName}</h3>
                <p className="text-sm text-muted-foreground">
                  {preview.headers.length} colonne • {preview.sampleRows.length} righe di esempio
                </p>
              </div>

              {/* Colonne */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-2">
                  <p className="text-sm font-medium">Colonne rilevate:</p>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {preview.headers.map((header, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded font-mono text-xs">
                        {idx + 1}
                      </span>
                      <span className="truncate">{header}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prime 5 righe */}
              <div className="border rounded-lg overflow-x-auto">
                <div className="bg-muted p-2">
                  <p className="text-sm font-medium">Prime 5 righe:</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {preview.headers.map((header, idx) => (
                        <th key={idx} className="px-3 py-2 text-left font-medium whitespace-nowrap text-xs">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t">
                        {preview.headers.map((header, colIdx) => (
                          <td key={colIdx} className="px-3 py-2 whitespace-nowrap text-xs">
                            <span className={row[header] ? '' : 'text-muted-foreground italic'}>
                              {row[header] || 'vuoto'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pulsanti */}
              <div className="flex gap-2">
                <Button 
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisi AI in corso...
                    </>
                  ) : (
                    'Analizza con AI'
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setPreview(null);
                    setImportFile(null);
                    setStoredFileName(null);
                  }}
                >
                  Rimuovi
                </Button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  💡 Cosa farà l'AI:
                </p>
                <ul className="text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc text-xs">
                  <li>Suggerirà il mapping delle colonne ai campi CRM</li>
                  <li>Indicherà i livelli di confidenza</li>
                  <li>Segnalerà valori dubbi o problematici</li>
                  <li>Proporrà trasformazioni necessarie</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
