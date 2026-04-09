

# Piano: Sostituzione Sistema Download Email

## Obiettivo
Eliminare tutti i motori e pagine di download email dal progetto attuale (4+ pagine, 6+ componenti, 5 strategie) e sostituirli con il sistema server-side del repo `wca-network-navigator`, adattato per usare `email_messages` + `tmwe-api-proxy` esistenti.

## Cosa viene ELIMINATO

### Pagine (3 rotte da rimuovere da App.tsx)
- `/single-mail` → `SingleMailImporter`
- `/single-fast` → `SingleFast.tsx`
- `/dual-download` → `DualDownload.tsx`

### Componenti Download (6 file da eliminare)
- `src/components/email/FunEmailDownloader.tsx` (311 righe)
- `src/components/email/QuickEmailDownloader.tsx` (392 righe)
- `src/components/email/SingleMailImporter.tsx` (1090 righe)
- `src/components/email/DualPhaseDownloader.tsx` (374 righe)
- `src/components/email/LucaDownloadTester.tsx` (228 righe)
- `src/components/email/EmailSyncMonitor.tsx` (573 righe)

### Engine / Strategie (10 file da eliminare)
- `src/lib/email/strategies/CleanStrategy.ts`
- `src/lib/email/strategies/LucaStrategy.ts`
- `src/lib/email/strategies/MasterStrategy.ts`
- `src/lib/email/strategies/EdgeSyncStrategy.ts`
- `src/lib/email/strategies/DownloadStrategy.ts`
- `src/lib/email/services/EmailDownloadService.ts`
- `src/lib/email/services/EdgeFunctionSyncService.ts`
- `src/lib/email/services/UIDRangeService.ts`
- `src/lib/single-mail-api.ts`
- `src/lib/parallel-download-controller.ts`

### Hook da eliminare
- `src/hooks/useEmailDownload.ts` (466 righe)
- `src/hooks/useSyncProgress.ts`

### View da rimuovere da FunEmail.tsx
- `quick-download`, `single-mail` (e relativi import)
- Il tab "fun" con `FunEmailDownloader` dentro

## Cosa viene CREATO (dal repo, adattato)

### 1. Tabella DB: `email_sync_jobs`
Migrazione SQL identica al repo. Tabella per gestire job server-side con stati `running/paused/completed/error`, contatori download/skip, realtime abilitato.

### 2. Nuova Pagina: `src/pages/EmailDownloadPage.tsx`
Portata dal repo con modifiche:
- Usa `email_messages` invece di `channel_messages` per conteggio
- Layout adattato per `CRMLayout` + `PageLayout`
- Rotta: `/email-download` (sostituisce le 3 rotte eliminate)

### 3. Nuovi Hook (dal repo, adattati)
- `src/hooks/useServerSyncJob.ts` — CRUD su `email_sync_jobs`, realtime subscription, polling
- `src/hooks/useEmailCount.ts` — count su `email_messages` (non `channel_messages`)
- `src/hooks/useDownloadedEmailsFeed.ts` — ultime 50 email scaricate da `email_messages`, realtime INSERT

### 4. Nuovi Componenti (dal repo)
- `src/components/email/download/DownloadedEmailList.tsx` — lista virtualizzata con `@tanstack/react-virtual`
- `src/components/email/download/DownloadedEmailPreview.tsx` — preview email con sanitizzazione HTML

### 5. Edge Function: `email-sync-worker`
Portata dal repo, adattata per chiamare `tmwe-api-proxy` (con handler `tmwe-email-sync-master`) invece di `check-inbox`. Il worker:
- Trova job `running` in `email_sync_jobs`
- Chiama `tmwe-api-proxy` per batch di email
- Aggiorna contatori nel job
- Loop fino a 50s di wall-clock time
- Continua anche a browser chiuso (invocato da pg_cron ogni minuto)

## Modifiche a File Esistenti

### `src/App.tsx`
- Rimuovere import e rotte: `SingleMailImporter`, `SingleFast`, `DualDownload`
- Aggiungere rotta `/email-download` → `EmailDownloadPage`

### `src/pages/FunEmail.tsx`
- Rimuovere import: `FunEmailDownloader`, `QuickEmailDownloader`, `SingleMailImporter`, `LucaDownloadTester`
- Rimuovere view `quick-download` e `single-mail` dal switch
- Rimuovere stato `preSelectedFolders`, `isDownloadActive`, `globalStats`
- Nel tab "fun", sostituire il downloader con link a `/email-download`

### `src/components/email/ToolsDropdownMenu.tsx`
- Cambiare link da `quick-download` e `single-mail` a `/email-download`

## Fasi di Implementazione

```text
Fase  Cosa                                          Rischio
────  ────────────────────────────────────────────  ───────
1     Migrazione DB: creare email_sync_jobs          Basso
2     Creare hook adattati (3 file)                  Basso
3     Creare componenti download (2 file)            Basso
4     Creare EmailDownloadPage.tsx                   Basso
5     Creare edge function email-sync-worker         Medio
6     Aggiornare App.tsx (rotte)                     Basso
7     Pulire FunEmail.tsx (rimuovere import/view)    Medio
8     Eliminare 18+ file vecchi                      Basso
9     Setup pg_cron per email-sync-worker             Basso
```

## NON TOCCARE
- `EmailManagementTab`, `EmailGroupingSuggestionsTab`
- `SmartInboxTabIntelligent`, `EmailIntegrityChecker`
- `tmwe-api-proxy` edge function
- `email_messages` table schema
- CRMLayout, sidebar, header
- RadioChat, ChatLaboratory
- `src/lib/tmwe-email-search-api.ts`
- `src/components/tmwe/email-fast/*`

## Rischio Complessivo
**Medio** — Elimina molto codice legacy ma la nuova implementazione e' piu' semplice (1 pagina, 1 edge function, 3 hook). Backup obbligatorio prima dell'eliminazione.

