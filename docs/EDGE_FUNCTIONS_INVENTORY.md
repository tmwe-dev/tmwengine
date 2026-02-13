# EDGE FUNCTIONS INVENTORY
## Data: 2026-02-13
## Stato: Aggiornato post-refactoring FASE 13

---

## Funzioni Attive (35 totali)

### AI & Chat
| Funzione | Descrizione | Backup |
|----------|-------------|--------|
| `chat-with-ai` | Chat generale con AI | - |
| `chat-laboratory-orchestrator` | Orchestratore multi-agente laboratorio | - |
| `bar-chat-orchestrator` | Orchestratore chat bar mode | `index-old-2025-01-19.ts` |
| `radio-chat-orchestrator` | Orchestratore radio chat vocale | `index-old-2025-01-19.ts` |
| `ai-canvas-chat` | Chat canvas AI | - |
| `ai-crm-manager` | Gestione CRM con AI | - |
| `test-ai-connection` | Test connessione AI providers | - |
| `calculate-basic-convergence` | Calcolo convergenza conversazioni | - |
| `generate-conversation-summary` | Generazione riassunti conversazioni | - |
| `execute-ai-actions` | Esecuzione azioni AI automatiche | - |

### Email
| Funzione | Descrizione | Backup |
|----------|-------------|--------|
| `email-ai-processor` | Processore AI email (classificazione + automazione) | `index-old2.ts` |
| `email-campagne-scheduler` | Scheduler campagne email | - |
| `fun-email-ai-analysis` | Analisi AI per FunEmail | - |
| `tmwe-api-proxy` | Proxy API TMWE (OAuth) | - |
| `tmwe-email-webhook` | Webhook email TMWE | - |
| `migrate-classification-tmwe-ids` | Migrazione ID classificazioni TMWE | - |
| `suggest-sender-grouping` | Suggerimenti raggruppamento mittenti | - |
| `generate-group-context` | Generazione contesto gruppi mittenti | - |

### Import/Export
| Funzione | Descrizione | Backup |
|----------|-------------|--------|
| `process-ai-import` | Import dati con AI | - |
| `process-import-errors-ai` | Gestione errori import con AI | - |
| `process-import-file-ai` | Processamento file import | - |
| `process-saved-file-ai` | Processamento file salvati | - |
| `process-single-error-ai` | Correzione singolo errore AI | - |
| `confirm-corrected-errors` | Conferma errori corretti | - |
| `generate-normalized-file` | Generazione file normalizzato | - |
| `optimize-company-profile` | Ottimizzazione profilo azienda | - |

### Audio & Media
| Funzione | Descrizione | Backup |
|----------|-------------|--------|
| `generate-audio` | Generazione audio ElevenLabs | - |
| `text-to-speech` | Text-to-speech | - |
| `voice-to-text` | Voice-to-text (STT) | - |
| `generate-image` | Generazione immagini AI | - |

### Intranet & Notifiche
| Funzione | Descrizione | Backup |
|----------|-------------|--------|
| `intranet-ai-processor` | Processore AI intranet | - |
| `send-push-notification` | Invio notifiche push | - |

### Sistema
| Funzione | Descrizione | Backup |
|----------|-------------|--------|
| `auto-assign-admin` | Assegnazione automatica ruolo admin | - |
| `sync-ai-pricing` | Sincronizzazione prezzi AI | - |

---

## Moduli Condivisi (_shared/)

| File | Descrizione | Backup |
|------|-------------|--------|
| `ai-helpers.ts` | Helper AI multi-provider | `ai-helpers-old1.ts` |
| `cors.ts` | Headers CORS condivisi | - |
| `deliverable-utils.ts` | Utility deliverables | - |
| `email-sender-context-loader.ts` | Loader contesto mittenti | - |
| `email-sync-helpers.ts` | Helper sincronizzazione email | - |
| `learning-helpers.ts` | Helper sistema apprendimento AI | - |
| `oauth-manager.ts` | Gestione OAuth TMWE | - |

---

## File Backup Preservati (da protocollo)

| File | Motivo | Data |
|------|--------|------|
| `bar-chat-orchestrator/index-old-2025-01-19.ts` | Pre-integrazione ElevenLabs TTS | 2025-01-19 |
| `radio-chat-orchestrator/index-old-2025-01-19.ts` | Pre-integrazione ElevenLabs TTS | 2025-01-19 |
| `email-ai-processor/index-old2.ts` | Pre-progressive exclusion refactor | 2025-01-29 |
| `_shared/ai-helpers-old1.ts` | Versione precedente helper AI | N/D |

> ⚠️ Per protocollo, i file `-oldX.ts` NON vengono eliminati. Servono come punto di rollback.

---

## Backup Esterni (docs/)

| File | Contenuto |
|------|-----------|
| `docs/EDGE_FUNCTIONS_BACKUP/2025-11-25/summarize-user-message-backup.ts` | Backup funzione summarize (rimossa) |
| `docs/EDGE_FUNCTIONS_BACKUP/2025-11-25/search-document-embeddings-backup.ts` | Backup funzione search embeddings (rimossa) |
| `docs/EDGE_FUNCTIONS_BACKUP/2025-11-25/email-ai-learning-backup.ts` | Backup funzione learning (integrata in _shared) |
| `docs/CODE_BACKUPS/2025-01-29_pre-zero-sync/edge-functions/email-ai-processor-index.ts.backup` | Backup pre zero-sync |
