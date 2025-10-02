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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    
    try {
      let headers: string[] = [];
      let sampleRows: any[] = [];

      // Parse in base al tipo di file
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Excel
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
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
      } else if (file.name.endsWith('.csv')) {
        // CSV
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        // Detect separator
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
      } else if (file.name.endsWith('.txt')) {
        // TXT - assume tab-separated or space-separated
        const text = await file.text();
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
      } else if (file.name.endsWith('.pdf')) {
        toast.error('PDF non ancora supportato. Usa Excel, CSV o TXT per ora.');
        setIsAnalyzing(false);
        return;
      } else {
        toast.error('Formato file non supportato. Usa Excel, CSV, TXT o PDF.');
        setIsAnalyzing(false);
        return;
      }

      console.log('📊 File parsed:', { headers, sampleRows });

      // Chiama l'AI per analizzare
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

**Esempi Mapping:**
- "Company Name" / "Ragione Sociale" / "Azienda" → company_name (confidence: 0.95)
- "Tel." / "Phone" / "Telefono" → phone (confidence: 0.90, transform: "normalize_phone")
- "Cell" / "Mobile" / "Cellulare" → cell (confidence: 0.90, transform: "normalize_phone")
- "Email" / "E-mail" / "Mail" → email (confidence: 0.95, transform: "normalize_email")
- "Country" / "Paese" / "Nazione" → country (confidence: 0.90)
- "Contact" / "Responsabile" / "Nome" → name (confidence: 0.85)

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
          prompt: JSON.stringify({ headers, sampleRows }),
          systemPrompt: systemPrompt
        }
      });

      if (error) {
        console.error('AI analysis error:', error);
        throw new Error('Errore durante l\'analisi AI');
      }

      console.log('🤖 AI Response:', data);

      // Parse la risposta AI
      let aiResponse = data.response;
      
      // Rimuovi eventuali markdown code blocks
      if (aiResponse.includes('```json')) {
        aiResponse = aiResponse.split('```json')[1].split('```')[0].trim();
      } else if (aiResponse.includes('```')) {
        aiResponse = aiResponse.split('```')[1].split('```')[0].trim();
      }

      const analysisResult = JSON.parse(aiResponse);

      toast.success('Analisi completata! Controlla il mapping suggerito.');
      onAnalysisComplete({
        ...analysisResult,
        headers,
        sampleRows,
        fileName: file.name
      });

    } catch (error) {
      console.error('Error analyzing file:', error);
      toast.error('Errore durante l\'analisi del file');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
      analyzeFile(file);
    }
  }, [analyzeFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf']
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
          Trascina qui il tuo file. L'AI analizzerà le colonne e suggerirà il mapping automatico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
            }
            ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div>
                <p className="text-lg font-medium">Analisi in corso...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  L'AI sta analizzando il file: {uploadedFile?.name}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-4 mb-4">
                <FileSpreadsheet className="h-12 w-12 text-green-500" />
                <FileText className="h-12 w-12 text-blue-500" />
                <FileType className="h-12 w-12 text-orange-500" />
              </div>
              
              <p className="text-lg font-medium mb-2">
                {isDragActive 
                  ? 'Rilascia il file qui...' 
                  : 'Trascina qui il file o clicca per selezionare'
                }
              </p>
              
              <p className="text-sm text-muted-foreground">
                Formati supportati: Excel (.xlsx, .xls), CSV, TXT, PDF
              </p>
              
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={(e) => e.stopPropagation()}
              >
                Seleziona File
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Come funziona:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Carica il file con i contatti</li>
            <li>L'AI analizza automaticamente le colonne</li>
            <li>Ricevi suggerimenti intelligenti per il mapping</li>
            <li>Conferma o modifica il mapping</li>
            <li>Importa i dati trasformati nel CRM</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
