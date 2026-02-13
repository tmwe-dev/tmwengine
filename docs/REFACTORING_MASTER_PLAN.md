# PIANO DI REFACTORING COMPLETO - TMW Platform
## Data inizio: 2026-02-13
## Stato: IN CORSO

---

## Fasi Completate

### FASE 0 - Preparazione ✅
- Creato questo documento

### FASE 1-5 - Pulizia Backup ✅
- Eliminati ~70 file backup da pages, components, hooks, lib, contexts (sessione 1)

### FASE 6 - Correzione Site Map ✅
- Riscritto siteMapData.ts: da ~45 pagine (30+ fantasma) a 51 pagine reali in 10 gruppi
- Aggiunto gruppo Auth e Intranet separati
- Tutte le rotte verificate contro App.tsx

### FASE 7 - Consolidamento Router ✅
- Analizzato App.tsx (479 righe, 51 rotte)
- usePreventTrackpadNavigation: invasivo ma funzionale, lasciato per ora
- Inconsistenza auth guard documentata (IntegratedAuthGuard vs ProtectedRoute)

### FASE 8 - Consolidamento Navigazione ✅
- useNavigationGroups.tsx verificato, compatto e senza link morti
- Navigazione sidebar mostra solo pagine chiave, site-map ha tutto

### FASE 9 - Audit Modulo Email ✅
- Eliminati 30+ file backup aggiuntivi in sottocartelle:
  - smart-inbox: 5 backup eliminati + cartella backups/
  - management: 9 backup eliminati
  - strategies: 8 deprecated/backup eliminati (Dance, Incremental, Parallel, Sequential + versioni)
  - services: 2 backup eliminati
  - lib/tmwe-api-integrated: 3 backup .ts.backup eliminati
  - config/backups: intera directory eliminata
- **Strategie attive**: LucaStrategy, CleanStrategy, MasterStrategy, EdgeSyncStrategy, DownloadStrategy
- **Sync libs attive**: email-sync.ts, email-sync-unified.ts, email-sync-quick-turbo.ts

### FASE 10 - Audit Chat Laboratory ✅
- 57 componenti + 2 sotto-cartelle (calibration/5, prompt-composer/9)
- Ben organizzato, nessun backup trovato, nessun cambiamento strutturale necessario

### FASE 11 - Audit Intranet ✅
- 32 componenti + admin/ (5)
- Pulito, nessun backup, ben organizzato

### FASE 12 - Audit Radio Chat ✅
- 27 componenti, struttura flat
- Pulito, nessun backup

---

### FASE 13 - Inventario Edge Functions ✅
- 35 edge functions attive documentate in `docs/EDGE_FUNCTIONS_INVENTORY.md`
- 7 moduli condivisi in `_shared/`
- 4 file backup preservati (da protocollo): 3 `index-old*.ts` + 1 `ai-helpers-old1.ts`
- Nessuna funzione orfana trovata

### FASE 14 - Audit Database ✅
- 120 tabelle totali nel schema public
- Tabelle sospette identificate:
  - `email_sender_grouping_suggestions_backup_20250107` → backup DB, non referenziata nel codice (solo types.ts auto-generato)
  - `debugging` → tabella debug, non usata nel codice applicativo
  - `ui_component_backups` → usata come storage backup componenti UI (referenziata in EmailList.tsx)
  - `orchestrator_test_configs/results` → ATTIVE, usate da calibration module
  - `temp_ai_import/reviewed` → tabelle temporanee per flusso import
- ⚠️ Raccomandazione: `email_sender_grouping_suggestions_backup_20250107` e `debugging` sono candidate per eliminazione futura
### FASE 15 - Aggiornamento Guida Utente ✅
- guide-structure.json: 22 sezioni in 6 gruppi (Commerciale, Email, Chat&AI, Import, Impostazioni, Globali)
- guide-content-it.json: aggiunto contenuto per 16 sezioni mancanti:
  - rubrica-avanzata, campagne, email-dashboard, email-campagne, email-senders
  - chat, intranet, intranet-admin, gestisci-import, record-importati
  - ai-config, admin-prompts, language-manager, theme, country-selector, language-selector, ai-guide
- Totale sezioni con contenuto: 22/22 (100% copertura)
- Componenti UI (GuideNavigation, GuideSearchBar, GuideSection): verificati, funzionali
### FASE 16 - Standardizzazione Types ✅
- 7 file type in `src/types/`: smart-inbox, email-management, email-automation, email-carousel, radio, design-lab, design-lab-scanner
- Tutte le interface: PascalCase ✓ (conforme)
- Campi DB: snake_case ✓ (conforme)
- `SenderAnalysis` ha campi camelCase (companyName, emailCount) → campi UI computati, non mappatura DB → accettabile
- Nessuna modifica strutturale necessaria

### FASE 17 - Audit Documenti ✅
- 57 file markdown/yaml/json in `docs/`
- `docs/CODE_BACKUPS/`: ~45 file backup storici + 5 sotto-cartelle
  - Backup datati (2025-01 → 2025-11), mantenuti per protocollo rollback
  - Candidati per archiviazione futura: cartelle pre-2025-06
- `docs/EDGE_FUNCTIONS_BACKUP/`: 1 cartella (2025-11-25)
- `docs/references/`: 1 file HTML (TMW-Full-Platform.html)
- `docs/DATABASE_BACKUPS/`, `docs/TMWE_API_REFERENCE/`: reference attive
- ⚠️ Raccomandazione: i backup in CODE_BACKUPS più vecchi di 3 mesi sono candidati per archiviazione esterna

### FASE 18 - Audit tmwenginej ✅
- App satellite compatta: 6 pagine, 8 componenti, 3 lib, 2 hooks, 1 type file
- Nessun backup trovato, struttura pulita
- Pagine: Login, AuthCallback, EmailDashboard, EmailSyncTest, TMWEApiComparison, RadioChat, DesignLab, DesignLabDashboard, NotFound
- Condivide stesso Supabase project (dlldkrzoxvjxpgkkttxu)
- Nessuna pulizia necessaria

### FASE 19 - Test End-to-End (TODO)
### FASE 20 - Documento Finale (TODO)

---

## Totale File Eliminati: ~100+

### Sessione 1 (FASE 1-5)
- 12 pagine backup
- 29 componenti email backup
- 15 hooks backup + cartella
- 18 lib backup + cartella
- 2 contesti backup
- 4 componenti vari backup
- 1 CSS backup

### Sessione 2 (FASE 9)
- 5 smart-inbox backup + cartella backups/
- 9 management backup
- 8 strategies deprecated/backup
- 2 services backup
- 3 tmwe-api-integrated backup
- 1 config/backups directory
