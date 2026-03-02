

## Piano: Spostare i pulsanti export nella riga Azioni dello Storico Import

### Problema
I pulsanti "Scarica File Originale" e "Esporta Contatti Importati" sono stati messi nella pagina DatabaseSettings invece che nella pagina GestisciImport, dove l'utente li vuole -- nella colonna Azioni di ogni riga dello Storico Import.

### Cosa fare

**1. Aggiornare `useExportImportedData.ts`**
- Modificare `download_original_file` per accettare un `import_log_id` come parametro e filtrare `file_imports` per quel specifico import (via `import_log_id`), non prendere l'ultimo generico.
- Modificare `download_imported_contacts` per accettare un `import_log_id` e filtrare `imported_contacts` per quello specifico import.

**2. Aggiungere 2 icone nella colonna Azioni di `GestisciImport.tsx`**
- Icona `FileDown` (download file originale) con tooltip "Scarica CSV originale"
- Icona `TableProperties` (export elaborati) con tooltip "Esporta contatti elaborati CSV"
- Entrambe nella `div` delle azioni (riga 640), accanto a Eye, PlayCircle, Wrench, Trash2.
- Disabilitate durante loading. Visibili solo per import con stato completato/completato_con_errori.
- Importare e usare l'hook `useExportImportedData`, passando `log.id` a ciascuna funzione.

**3. Rimuovere i 2 pulsanti da `DatabaseSettings.tsx`**
- Rimuovere le voci "Scarica File Originale (13K)" e "Esporta Contatti Importati (8K)" dal menu.
- Rimuovere import di `useExportImportedData` e relativi state da DatabaseSettings.

**4. Aggiornare anche `ImportLogMobileCard.tsx`**
- Aggiungere le stesse 2 icone download nella versione mobile della card.

### File da modificare

| File | Azione |
|------|--------|
| `src/hooks/useExportImportedData.ts` | Parametrizzare per `import_log_id` |
| `src/pages/GestisciImport.tsx` | Aggiungere icone download nella riga Azioni |
| `src/pages/DatabaseSettings.tsx` | Rimuovere i 2 pulsanti export |
| `src/components/import/ImportLogMobileCard.tsx` | Aggiungere icone download mobile |

### Rischio: Basso
- Nessuna modifica a tabelle DB. Solo spostamento UI e parametrizzazione query esistenti.

