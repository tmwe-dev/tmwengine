
# PIANO DI REFACTORING COMPLETO - TMW Platform

## Inventario Attuale della Piattaforma

### Dimensioni del Progetto
- **67 pagine** (file in `src/pages/`), di cui 8 sono file di backup
- **27 cartelle componenti** + componenti standalone
- **80+ hooks** (di cui ~15 sono backup)
- **35 Edge Functions** (Supabase)
- **54+ file** contengono riferimenti a backup/vecchie versioni nel codice sorgente
- **55+ documenti** nella cartella `docs/`
- **60+ tabelle** nel database Supabase

---

## Documentazione Esistente

Sono gia presenti:

| Documento | Percorso | Contenuto |
|-----------|----------|-----------|
| Guida Utente | `/user-guide` + `src/data/user-guide/guide-content-it.json` | Guida interattiva con navigazione e ricerca |
| Mappa del Sito | `/site-map` + `src/data/siteMapData.ts` | Indice di tutte le pagine (ma con pagine fantasma non esistenti) |
| Master Rules | `docs/MASTER_RULES.md` | Regole di sviluppo, backup, sicurezza |
| Master Strategy | `docs/MASTER_STRATEGY.md` | Strategia email download |
| Database Info | `docs/DATABASE_INFO.md` | Schema e changelog DB |
| Edge Functions Changelog | `docs/EDGE_FUNCTIONS_CHANGELOG.md` | Log modifiche edge functions |
| Design System Export | `docs/COMPLETE_DESIGN_SYSTEM_EXPORT.md` | CSS tokens, temi, componenti |

**PROBLEMA CRITICO**: La `siteMapData.ts` contiene **pagine fantasma** - rotte dichiarate nel sito map che NON esistono nel router (`/brain-ai`, `/agent-composer`, `/prompt-library`, `/knowledge-base`, `/chat-intranet`, `/email-folders`, `/email-sender-groups`, `/email-classifier`, `/email-templates`, `/email-analytics`, `/inbox-management`, `/import-contacts`, `/export-data`, `/csv-import`, `/data-mapping`, `/import-history`, `/config-ai`, `/profile`, `/notifications`, `/api-comparison`, `/database-inspector`, `/api-logs`, `/system-monitor`, `/testing-playground`, `/debug-console`, `/user-management`, `/workflow-designer`, `/edge-functions-monitor`, `/call-center`, `/call-history`, `/api-docs`).

---

## Indice Completo delle Pagine REALI (dal Router in App.tsx)

### Commerciale e CRM
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 1 | `/rubrica` | Rubrica.tsx | Gestione contatti e clienti |
| 2 | `/rubrica-avanzata` | RubricaAvanzata.tsx | Contatti con filtri avanzati e segmentazione |
| 3 | `/attivita` | Attivita.tsx | Task e attivita commerciali |
| 4 | `/campagne` | Campagne.tsx | Gestione campagne marketing |
| 5 | `/email-campagne` | EmailCampagne.tsx | Campagne email marketing |

### Chat e AI
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 6 | `/chat` | Chat.tsx | Chat generale con assistente AI |
| 7 | `/chat-laboratory` | ChatLaboratory.tsx | Laboratorio multi-agente AI |
| 8 | `/chat-laboratory/analytics/:id` | ChatLaboratoryTechnicalAnalytics.tsx | Analytics conversazione laboratorio |
| 9 | `/chat-laboratory/calibration` | ChatLaboratoryCalibration.tsx | Calibrazione agenti AI |
| 10 | `/radio-chat` | RadioChat.tsx | Chat vocale con carosello 3D |
| 11 | `/ai-communication-hub` | AICommunicationHub.tsx | Hub comunicazione AI (ElevenLabs, WebRTC) |
| 12 | `/prompt-system-manager` | PromptSystemManager.tsx | Gestione sistema prompt |

### Intranet
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 13 | `/intranet` | Intranet.tsx | Chat interna team |
| 14 | `/intranet-admin` | IntranetAdmin.tsx | Amministrazione intranet |

### Email
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 15 | `/email-manager` | TMWEEmailDashboard.tsx | Dashboard email principale (richiede TMWE auth) |
| 16 | `/funnemail` | FunEmail.tsx | Email con categorizzazione AI |
| 17 | `/emailhub` | EmailHub.tsx | Hub email centralizzato |
| 18 | `/single-mail` | SingleMailImporter | Importazione singola email |
| 19 | `/single-fast` | SingleFast.tsx | Download veloce email |
| 20 | `/dual-download` | DualDownload.tsx | Download dual-phase email |
| 21 | `/email-senders` | EmailSenders.tsx | Gestione mittenti email |
| 22 | `/email-rules` | EmailRules.tsx | Regole classificazione email |
| 23 | `/email-debug-tester` | EmailDebugTester.tsx | Debug/test sistema email |

### Import/Export
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 24 | `/` e `/import-templates` | ImportTemplates.tsx | Homepage + template importazione |
| 25 | `/gestisci-import` | GestisciImport.tsx | Gestione importazioni |
| 26 | `/record-importati` | RecordImportati.tsx | Record importati |
| 27 | `/import-errors-monitor` | ImportErrorsMonitor.tsx | Monitor errori importazione |
| 28 | `/template-alias` | TemplateAlias.tsx | Alias template |

### Impostazioni e Configurazione
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 29 | `/settings` | Settings.tsx | Impostazioni generali |
| 30 | `/ai-config` | AIConfig.tsx | Configurazione AI providers |
| 31 | `/general-config` | GeneralConfig.tsx | Configurazione generale |
| 32 | `/database-settings` | DatabaseSettings.tsx | Impostazioni database |
| 33 | `/notification-settings` | NotificationSettings.tsx | Impostazioni notifiche |
| 34 | `/language-manager` | LanguageManager.tsx | Gestione lingue |

### Strumenti Sviluppo
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 35 | `/design-lab` | DesignLabDashboard.tsx | Dashboard Design Lab |
| 36 | `/design-lab/:pageId` | DesignLab.tsx | Design Lab editor pagina |
| 37 | `/design-lab-scanner` | DesignLabScanner.tsx | Scanner componenti |
| 38 | `/tables` | Tables.tsx | Visualizzazione tabelle DB |
| 39 | `/code-review` | CodeReview.tsx | Code review |
| 40 | `/tmwe-api-tester` | TMWEApiTester.tsx | Test API TMWE |
| 41 | `/api-functions` | ApiFunctionsReference.tsx | Referenza funzioni API |
| 42 | `/edge-function-versions` | EdgeFunctionVersions.tsx | Versioni edge functions |
| 43 | `/admin/prompts` | AdminPrompts.tsx | Admin prompt |
| 44 | `/admin/codescreen` | CodeScreen.tsx | Schermo codice admin |

### Utilities
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 45 | `/user-guide` | UserGuide.tsx | Guida utente |
| 46 | `/site-map` | SiteMap.tsx | Mappa del sito |
| 47 | `/call-metrics` | CallMetrics.tsx | Metriche chiamate |
| 48 | `/call-room` | CallRoom.tsx | Stanza chiamata WebRTC |

### Auth
| # | Rotta | Pagina | Descrizione |
|---|-------|--------|-------------|
| 49 | `/auth` | Auth.tsx | Autenticazione |
| 50 | `/tmwe-test` | TMWEAuthTest.tsx | Test auth TMWE |
| 51 | `/tmwe/callback` | OAuthCallback.tsx | Callback OAuth |

---

## FILE DI BACKUP DA ELIMINARE

### Pagine Backup (8 file)
```text
src/pages/ChatLaboratory-backup-2025-01-13.tsx
src/pages/Chat_backup_20251019.tsx
src/pages/FunEmail_20250129_ZEROSYNC.tsx
src/pages/ImportTemplates_20250129_1530.tsx.backup
src/pages/SingleFast_20250129_backup.tsx
src/pages/Settings.jsx (duplicato di Settings.tsx)
src/pages/IntranetTester.tsx (pagina test non nel router)
src/pages/LaboratoryTester.tsx (pagina test non nel router)
src/pages/TestingSuite.tsx (pagina test non nel router)
src/pages/DatabaseRelationsTester.tsx (test non nel router)
src/pages/VoiceVideoTester.tsx (test non nel router)
src/pages/NotificationOnboarding.tsx (non nel router)
```

### Componenti Email Backup (~20 file)
```text
src/components/email/EmailIntegrityChecker_BACKUP_2025-10-30_v1.tsx
src/components/email/EmailIntegrityChecker_BEFORE_API_SEARCH.tsx
src/components/email/EmailManagementTab_20250129_1715.tsx.backup
src/components/email/EmailManagementTab_20250129_ZEROSYNC.tsx
src/components/email/FunEmailDownloader_20250107_1445.tsx
src/components/email/FunEmailDownloader_20250115_1920_FIXED.tsx
src/components/email/FunEmailDownloader_20250129_2200.tsx
src/components/email/FunEmailDownloader_20250129_2330.tsx
src/components/email/FunEmailDownloader_BACKUP_2025-10-30_v1.tsx
src/components/email/FunEmailDownloader_BEFORE_API_SEARCH.tsx
src/components/email/FunEmailGlobalStats_20250129_ZEROSYNC.tsx
src/components/email/FunEmailQuickStats_20250129_ZEROSYNC.tsx
src/components/email/FunEmailQuickStats_BACKUP_2025-10-30_v1.tsx
src/components/email/QuickEmailDownloader_20250107_1445.tsx
src/components/email/QuickEmailDownloader_20250107_1530.tsx
src/components/email/QuickEmailDownloader_20250107_1750.tsx
src/components/email/QuickEmailDownloader_20250115_1920_FIXED.tsx
src/components/email/QuickEmailDownloader_20250129_2200.tsx
src/components/email/QuickEmailDownloader_20250129_2330.tsx
src/components/email/QuickEmailDownloader_20250130_1430.tsx
src/components/email/QuickEmailDownloader_20251108_1445.tsx.backup
src/components/email/QuickEmailDownloader_BEFORE_API_SEARCH.tsx
src/components/email/QuickEmailDownloader_V5_WORKING_2025-11-03.tsx
src/components/email/QuickEmailDownloader_backup_email_package_2025-11-03.tsx
src/components/email/SingleMailImporter_20250129_1645.tsx
src/components/email/TmweBackendDebugger_backup_email_package_2025-11-03.tsx
```

### Hooks Backup (~15 file)
```text
src/hooks/useEmailDownload_20250129_backup.ts
src/hooks/useGlobalAIAgent_20250129_1645.ts
src/hooks/useSingleFastMax_20250111_1800.ts
src/hooks/useSingleFastMax_20250111_2050.ts.backup
src/hooks/useSingleFastMax_20250129_1600.ts.backup
src/hooks/useSingleFastMax_20250129_1630.ts.backup
src/hooks/useSingleFastPerformance_20250111_1900.ts.backup
src/hooks/useSingleFastPerformance_20250129_1600.ts.backup
src/hooks/useSingleFast_20250111_1900.ts.backup
src/hooks/useSingleFast_20250129_1600.ts.backup
src/hooks/useSmartClassification_BACKUP_2025-10-31.ts
src/hooks/backups/ (4 file)
```

### Lib Backup (~15 file)
```text
src/lib/email-sync-preferences_BACKUP_2025-11-01.ts
src/lib/email-sync-preferences_V2_COMPLEX_2025-11-03.ts
src/lib/email-sync-preferences_backup_email_package_2025-11-03.ts
src/lib/email-sync-quick-cache-v2_backup_email_package_2025-11-03.ts
src/lib/email-sync-quick-turbo-v2_BACKUP_2025-11-01.ts
src/lib/email-sync-quick-turbo-v2_BACKUP_2025-11-02.ts
src/lib/email-sync-quick-turbo-v3-preferences_BACKUP_2025-11-02.ts
src/lib/email-sync-quick-turbo-v4-BROKEN_2025-11-02.ts
src/lib/email-sync-quick_BACKUP_2025-10-30_v1.ts
src/lib/email-sync-unified.BACKUP.ts
src/lib/email-sync_backup_email_package_2025-11-03.ts
src/lib/email-sender-analyzer_20250129_ZEROSYNC.ts
src/lib/smart-inbox-utils_BACKUP_2025-10-31.ts
src/lib/tmwe-api-integrated_20250111_1840.ts.backup (+ 4 altri)
src/lib/tmwe-api-integrated_BACKUP_FUNTOP_2025-10-30.ts
src/lib/backups/ (2 file)
```

### Contesti Backup (2 file)
```text
src/contexts/AIAgentContext_20250129_1645.tsx
src/contexts/GlobalAICanvasContext_20250129_1820.tsx
```

### Componenti Vari Backup
```text
src/components/ai/AISidebarSlider_20250129_1740.tsx
src/components/ai/AISidebarSlider_20250129_1820.tsx
src/components/chat-laboratory/ConversationsSidebar_20250129_1740.tsx
src/components/radio-chat/RadioConversationsSidebar_20250129_1740.tsx
```

### CSS Backup
```text
src/index_v1.css
```

**TOTALE FILE BACKUP DA ELIMINARE: ~70+ file**

---

## PIANO DI ESECUZIONE IN 20 FASI

### FASE 0 - Preparazione e Documentazione
**Obiettivo**: Creare un documento master di refactoring e snapshot pre-refactoring

Azioni:
- Creare `docs/REFACTORING_MASTER_PLAN.md` con tutto questo piano
- Creare `docs/DATABASE_BACKUPS/2026-02-13_pre-refactoring-totale.md` con snapshot schema
- Registrare nel `project_history` l'inizio del refactoring

### FASE 1 - Pulizia File Backup (Pagine)
**Rischio**: BASSO (file non referenziati)

Eliminare i 12 file backup/test/non-routati da `src/pages/`:
- File backup con date nel nome
- File `.jsx` duplicati
- Pagine tester non nel router

### FASE 2 - Pulizia File Backup (Componenti Email)
**Rischio**: BASSO

Eliminare i ~25 file backup da `src/components/email/`:
- Tutti i file con timestamp nel nome
- Tutti i file con `_BACKUP_`, `_BEFORE_`, `_ZEROSYNC` nel nome

### FASE 3 - Pulizia File Backup (Hooks)
**Rischio**: BASSO

Eliminare i ~15 file backup da `src/hooks/`:
- File con date nel nome
- Cartella `src/hooks/backups/`

### FASE 4 - Pulizia File Backup (Lib)
**Rischio**: MEDIO (verificare che nessuno li importi)

Eliminare i ~15 file backup da `src/lib/`:
- Tutti i file `_BACKUP_`, `_BROKEN_`, `_ZEROSYNC`
- Cartella `src/lib/backups/`
- File `src/index_v1.css`

### FASE 5 - Pulizia File Backup (Contesti e AI)
**Rischio**: BASSO

Eliminare i ~6 file backup da `src/contexts/` e `src/components/ai/` e `src/components/radio-chat/` e `src/components/chat-laboratory/`

### FASE 6 - Correzione Site Map
**Rischio**: BASSO

Aggiornare `src/data/siteMapData.ts`:
- Rimuovere le ~30 pagine fantasma che non esistono nel router
- Allineare con le 51 rotte reali in `App.tsx`
- Aggiornare descrizioni e icone

### FASE 7 - Consolidamento Router (App.tsx)
**Rischio**: MEDIO

- Eliminare `usePreventTrackpadNavigation` (codice invasivo con 80 righe di hack nel file principale)
- Estrarre in un componente separato se necessario
- Standardizzare il wrapping delle rotte (alcune usano `IntegratedAuthGuard`, altre no - uniformare)
- Riorganizzare le rotte per sezione con commenti chiari

### FASE 8 - Consolidamento Navigazione
**Rischio**: MEDIO

- Allineare `useNavigationGroups.tsx` con le rotte reali
- Verificare che tutte le pagine siano raggiungibili dal menu
- Rimuovere link a pagine inesistenti

### FASE 9 - Refactoring Modulo Email (il piu grande)
**Rischio**: ALTO

Il modulo email ha la maggiore complessita e duplicazione:
- `src/components/email/` ha 6+ sottocartelle + 30+ file di cui meta sono backup
- `src/lib/` ha 20+ file email-related di cui meta sono backup/versioni vecchie
- Consolidare le strategie di sync (`email-sync-quick-turbo.ts`, `email-sync-unified.ts`, `email-sync.ts`) in un unico modulo
- Documentare quale strategia e attiva e deprecare le altre

### FASE 10 - Refactoring Modulo Chat Laboratory
**Rischio**: MEDIO

- 60+ componenti in `src/components/chat-laboratory/`
- Organizzare in sotto-cartelle logiche (audio, controls, messages, settings, prompts)
- Verificare componenti non utilizzati

### FASE 11 - Refactoring Modulo Intranet
**Rischio**: MEDIO

- 33 componenti in `src/components/intranet/`
- Organizzare in sotto-cartelle (messages, rooms, settings, voice, video)
- Verificare componenti non utilizzati

### FASE 12 - Refactoring Modulo Radio Chat
**Rischio**: MEDIO

- 28 componenti in `src/components/radio-chat/`
- Organizzare in sotto-cartelle (audio, carousel, messages, controls)

### FASE 13 - Pulizia Edge Functions
**Rischio**: ALTO

- Verificare tutti i file `index-oldX.ts` nelle 35 edge functions
- NON eliminare i backup (da protocollo), ma documentare quali sono attivi
- Creare un inventario completo in `docs/EDGE_FUNCTIONS_INVENTORY.md`

### FASE 14 - Audit Database
**Rischio**: ALTO

- Verificare tabelle inutilizzate (es. `email_sender_grouping_suggestions_backup_20250107`)
- Verificare che `DATABASE_INFO.md` sia aggiornato con tutte le 60+ tabelle
- Identificare tabelle orfane o legacy

### FASE 15 - Aggiornamento Guida Utente
**Rischio**: BASSO

- Aggiornare `src/data/user-guide/guide-content-it.json` con tutte le funzionalita attuali
- Aggiungere sezioni per moduli nuovi (AI Communication Hub, Design Lab, Radio Chat, ecc.)

### FASE 16 - Standardizzazione Types
**Rischio**: MEDIO

- Solo 7 file in `src/types/` - verificare se ci sono tipi inline sparsi nei componenti
- Centralizzare tipi condivisi
- Verificare naming snake_case per DB, PascalCase per types

### FASE 17 - Pulizia Documenti
**Rischio**: BASSO

- Rivedere i 55+ file in `docs/`
- Archiviare documenti obsoleti in `docs/archive/`
- Aggiornare `MASTER_RULES.md` con le nuove regole post-refactoring

### FASE 18 - Pulizia Cartella tmwenginej
**Rischio**: BASSO

Esiste una cartella `tmwenginej/` alla root con un suo `App.tsx` separato - verificare se e un progetto legacy completo da archiviare

### FASE 19 - Test End-to-End
**Rischio**: N/A

- Verificare tutte le rotte funzionanti
- Verificare navigazione completa
- Test edge functions attive
- Verificare che nessun import rotto dopo eliminazione backup

### FASE 20 - Documento Finale
**Rischio**: BASSO

- Creare `docs/REFACTORING_COMPLETE_REPORT.md`
- Aggiornare `project_history` con tutte le modifiche
- Aggiornare `DATABASE_INFO.md`
- Aggiornare `EDGE_FUNCTIONS_CHANGELOG.md`

---

## Riepilogo Impatto

| Metrica | Prima | Dopo (stimato) |
|---------|-------|-----------------|
| File totali src/ | ~300+ | ~200 |
| File backup da eliminare | ~70 | 0 |
| Pagine fantasma nel sitemap | ~30 | 0 |
| Rotte reali documentate | parziale | 100% |
| Documenti aggiornati | parziale | 100% |

## Ordine di Esecuzione Consigliato

Le fasi 0-5 (pulizia backup) possono essere eseguite in un unico passaggio (rischio basso).
Le fasi 6-8 (navigazione/router) in un secondo passaggio.
Le fasi 9-12 (refactoring moduli) una per passaggio.
Le fasi 13-14 (edge functions e DB) richiedono attenzione massima.
Le fasi 15-20 sono documentazione e test.

**Tempo stimato**: 15-20 sessioni di lavoro, circa 3-4 settimane.
