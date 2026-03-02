

# Piano: Download dei dati dal database

## Situazione
Il file originale da 13,034 righe e' gia' salvato integralmente nella colonna `file_content` della tabella `file_imports` (4.5MB di CSV). I restanti 8,059 record sono nella tabella `imported_contacts`.

## Soluzione
Aggiungere un pulsante "Scarica CSV" nella pagina dei Record Importati che permette di scaricare entrambi i dataset:

### Opzione 1: File Originale (13,034 righe)
- Query `file_imports` per `id = bf387b3b-...`, prende `file_content`
- Crea un Blob CSV e lo scarica come `tmwe_commercial_contact.csv`
- Nessuna edge function necessaria: il contenuto e' gia' testo nel DB

### Opzione 2: Record Elaborati (8,059 righe)
- Query paginata su `imported_contacts` (blocchi da 1000 per il limite Supabase)
- Concatena tutti i risultati e genera CSV lato client
- Scarica come `imported_contacts_export.csv`

### Implementazione
1. Creare un hook `useExportImportedData.ts` con due funzioni: `downloadOriginalFile()` e `downloadImportedContacts()`
2. Aggiungere due pulsanti Download nella pagina che gestisce i record importati (o nella pagina DatabaseSettings)

### File da modificare/creare
| File | Azione |
|------|--------|
| `src/hooks/useExportImportedData.ts` | Nuovo — logica export CSV |
| Pagina record importati (da identificare) | Aggiunta pulsanti download |

### Rischio: Basso
- Operazione read-only, nessuna modifica a tabelle o dati esistenti

