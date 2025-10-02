import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as XLSX from 'xlsx';

export function TemplateDownloader() {
  const downloadTemplate = () => {
    // Definisci le colonne del template
    const headers = [
      'company_name',
      'company_alias',
      'name',
      'alias',
      'position',
      'title',
      'phone',
      'cell',
      'email',
      'address',
      'city',
      'country',
      'zip_code',
      'origin',
      'client_code',
      'note',
      'last_contact',
      'scheduled_contact',
      'next_contact_date'
    ];

    // Dati di esempio (3 righe)
    const exampleData = [
      {
        company_name: 'ACME Corporation',
        company_alias: 'ACME',
        name: 'Mario Rossi',
        alias: 'M. Rossi',
        position: 'CEO',
        title: 'Dott.',
        phone: '+39 02 1234567',
        cell: '+39 335 1234567',
        email: 'mario.rossi@acme.com',
        address: 'Via Roma 123',
        city: 'Milano',
        country: 'Italy',
        zip_code: '20100',
        origin: 'Web',
        client_code: 'ACM001',
        note: 'Cliente interessato a servizi logistici',
        last_contact: '2024-01-15',
        scheduled_contact: '2024-02-01',
        next_contact_date: '2024-02-15'
      },
      {
        company_name: 'Tech Solutions SRL',
        company_alias: 'TechSol',
        name: 'Laura Bianchi',
        alias: 'L. Bianchi',
        position: 'Direttore Commerciale',
        title: 'Dott.ssa',
        phone: '+39 06 9876543',
        cell: '+39 340 9876543',
        email: 'laura.bianchi@techsolutions.it',
        address: 'Corso Italia 456',
        city: 'Roma',
        country: 'Italy',
        zip_code: '00100',
        origin: 'Fiera',
        client_code: 'TCS002',
        note: 'Richiesta preventivo per spedizioni internazionali',
        last_contact: '2024-01-20',
        scheduled_contact: '2024-02-05',
        next_contact_date: '2024-02-20'
      },
      {
        company_name: 'Global Logistics Ltd',
        company_alias: 'GlobalLog',
        name: 'John Smith',
        alias: 'J. Smith',
        position: 'Purchasing Manager',
        title: 'Mr.',
        phone: '+44 20 1234567',
        cell: '+44 7700 123456',
        email: 'j.smith@globallogistics.co.uk',
        address: '123 Oxford Street',
        city: 'London',
        country: 'United Kingdom',
        zip_code: 'W1D 1BS',
        origin: 'LinkedIn',
        client_code: 'GLL003',
        note: 'Interested in air freight services',
        last_contact: '2024-01-25',
        scheduled_contact: '2024-02-10',
        next_contact_date: '2024-02-25'
      }
    ];

    // Crea worksheet
    const worksheet = XLSX.utils.json_to_sheet(exampleData, { header: headers });

    // Imposta larghezza colonne
    const columnWidths = headers.map(h => ({ wch: h.length + 5 }));
    worksheet['!cols'] = columnWidths;

    // Stile header (grassetto)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "E2EFDA" } }
      };
    }

    // Crea workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatti');

    // Aggiungi foglio con istruzioni
    const instructionsData = [
      ['📋 ISTRUZIONI PER L\'IMPORTAZIONE'],
      [''],
      ['1. COLONNE OBBLIGATORIE:'],
      ['   - company_name: Nome dell\'azienda (es: "ACME Corporation")'],
      ['   - Almeno uno tra: name, email, phone, cell'],
      [''],
      ['2. COLONNE FACOLTATIVE:'],
      ['   - company_alias: Alias/nome breve azienda'],
      ['   - name: Nome del contatto'],
      ['   - position: Posizione/ruolo (es: "CEO", "Manager")'],
      ['   - title: Titolo (es: "Dott.", "Sig.", "Dott.ssa")'],
      ['   - phone: Telefono fisso'],
      ['   - cell: Cellulare'],
      ['   - email: Indirizzo email'],
      ['   - address: Indirizzo completo'],
      ['   - city: Città'],
      ['   - country: Paese'],
      ['   - zip_code: Codice postale/CAP'],
      ['   - origin: Origine del contatto (es: "Web", "Fiera", "LinkedIn")'],
      ['   - client_code: Codice cliente univoco'],
      ['   - note: Note aggiuntive'],
      ['   - last_contact: Data ultimo contatto (formato: YYYY-MM-DD)'],
      ['   - scheduled_contact: Data contatto programmato (formato: YYYY-MM-DD)'],
      ['   - next_contact_date: Data prossimo contatto (formato: YYYY-MM-DD)'],
      [''],
      ['3. FORMATI SUPPORTATI:'],
      ['   - Date: YYYY-MM-DD (es: 2024-01-15)'],
      ['   - Telefoni: qualsiasi formato (verranno normalizzati automaticamente)'],
      ['   - Email: formato standard email'],
      [''],
      ['4. SUGGERIMENTI:'],
      ['   - Non modificare i nomi delle colonne'],
      ['   - Puoi eliminare le colonne che non ti servono'],
      ['   - Puoi aggiungere più righe copiando gli esempi'],
      ['   - Salva il file come .xlsx o .csv prima di importarlo'],
      [''],
      ['5. IMPORT INTELLIGENTE:'],
      ['   - Il sistema AI riconosce automaticamente le colonne'],
      ['   - Anche se usi nomi diversi (es: "Azienda" invece di "company_name")'],
      ['   - Suggerisce trasformazioni automatiche (normalizzazione telefoni, date, etc.)'],
      [''],
      ['6. DOPO AVER COMPILATO:'],
      ['   - Vai su "Import Intelligente"'],
      ['   - Trascina questo file nella zona di upload'],
      ['   - Controlla il mapping suggerito dall\'AI'],
      ['   - Conferma e importa i dati']
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Istruzioni');

    // Scarica il file
    XLSX.writeFile(workbook, 'Template_Import_Contatti_CRM.xlsx');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-500" />
          Template di Importazione
        </CardTitle>
        <CardDescription>
          Scarica il file Excel con le colonne corrette e dati di esempio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Il template include:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Tutte le colonne del database CRM</li>
              <li>3 righe di esempio con dati realistici</li>
              <li>Foglio istruzioni dettagliate</li>
              <li>Formato compatibile con Import Intelligente</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button 
            onClick={downloadTemplate}
            className="w-full gap-2"
            size="lg"
          >
            <Download className="h-5 w-5" />
            Scarica Template Excel
          </Button>

          <div className="text-sm text-muted-foreground space-y-2 border-t pt-3">
            <p className="font-medium text-foreground">Come usarlo:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Scarica il template cliccando il pulsante sopra</li>
              <li>Apri il file Excel e leggi le istruzioni</li>
              <li>Compila il foglio "Contatti" con i tuoi dati</li>
              <li>Salva il file</li>
              <li>Usa "Import Intelligente" per caricarlo</li>
            </ol>
          </div>

          <Alert variant="default" className="">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm">
              <strong>Consiglio:</strong> Anche se modifichi i nomi delle colonne o usi un formato diverso,
              l&apos;Import Intelligente riconoscerà automaticamente i dati grazie all&apos;AI.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
