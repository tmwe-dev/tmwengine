# Email Sync Architecture

## ✅ Metodo Unico di Sincronizzazione

**Edge Function**: `tmwe-email-sync-master`

### Cosa fa:
1. Scarica email da TMWE API (`/email_message` endpoint)
2. Salva body completo (HTML + TEXT) nella tabella `email_messages` del database Supabase
3. Gestisce attachments come JSONB
4. Evita duplicati controllando `message_id`
5. Supporta sincronizzazione incrementale e completa

### Come usarlo:

#### Opzione 1: Funzione diretta
```typescript
import { syncEmailsToDatabase } from '@/lib/email-sync';

// Sync automatico (incrementale se già presenti email, altrimenti full)
await syncEmailsToDatabase('INBOX', 'auto');

// Sync iniziale completo
await syncEmailsToDatabase('INBOX', 'initial', 1000);

// Sync incrementale (solo nuove email)
await syncEmailsToDatabase('INBOX', 'incremental');
```

#### Opzione 2: Hook React (con stato)
```typescript
import { useEmailSync } from '@/lib/email-sync';

const { isSyncing, syncedCount, syncError, startSync, reset } = useEmailSync({
  folder: 'INBOX',
  totalEmails: 1000
});

// Avvia sincronizzazione
await startSync();

// Reset stato
reset();
```

### Performance:
- Batch size: 10 email alla volta (limite API TMWE)
- Tempo stimato per 1000 email: 2-3 minuti
- Con indici DB ottimizzati: Query mittenti < 100ms

### Database Indexes:
```sql
-- Index per query veloci
CREATE INDEX idx_email_messages_from_email ON email_messages(from_email);
CREATE INDEX idx_email_messages_cartella ON email_messages(cartella);
CREATE INDEX idx_email_messages_user_email ON email_messages(user_email);
CREATE INDEX idx_email_messages_data_ricezione ON email_messages(data_ricezione DESC);
CREATE INDEX idx_email_messages_user_cartella ON email_messages(user_email, cartella);
CREATE INDEX idx_email_messages_from_date ON email_messages(from_email, data_ricezione DESC);
```

## ❌ Metodi Deprecati

I seguenti metodi sono stati rimossi perché non salvavano le email nel database Supabase locale:

1. `useSyncSmart` hook → Sostituito da `useEmailSync`
2. `emailSyncApi.fullSync()` → Sostituito da `syncEmailsToDatabase()`
3. `emailSyncApi.incrementalSync()` → Sostituito da `syncEmailsToDatabase()`
4. `emailSyncApi.syncFolder()` → Sostituito da `syncEmailsToDatabase()`

### Metodi mantenuti (solo monitoring):
- `emailSyncApi.getSyncStatus()` - Monitoraggio stato sync server TMWE
- `emailSyncApi.cancelSync()` - Cancellazione sync server TMWE

## Architettura

```
┌─────────────────┐
│   Frontend      │
│  React Component│
└────────┬────────┘
         │
         │ useEmailSync() hook
         │ o syncEmailsToDatabase()
         │
         ▼
┌─────────────────────────┐
│  Edge Function          │
│  tmwe-email-sync-master │
└────────┬────────────────┘
         │
         │ HTTP Request
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│   TMWE API      │       │  Supabase DB     │
│  /email_message │◀──────│  email_messages  │
└─────────────────┘       └──────────────────┘
     (Source)                  (Destination)
```

## Migrazione da useSyncSmart

### Prima:
```typescript
import { useSyncSmart } from '@/hooks/useSyncSmart';

const { isSyncing, syncedCount, startSync } = useSyncSmart({
  folder: 'INBOX',
  totalEmails: 1000
});
```

### Dopo:
```typescript
import { useEmailSync } from '@/lib/email-sync';

const { isSyncing, syncedCount, startSync } = useEmailSync({
  folder: 'INBOX',
  totalEmails: 1000
});
```

**Interfaccia identica**: Nessuna modifica al codice necessaria!

## Test

Pagina di test disponibile su: `/email-sync-test`

Confronta:
- Edge Function `tmwe-email-sync-master`
- API TMWE diretta (deprecata)

Con metriche real-time:
- Durata esecuzione
- Email salvate nel DB
- Response data
- Errori

## Logs

Per monitorare l'Edge Function:
```bash
supabase functions logs tmwe-email-sync-master
```

Oppure nella dashboard Supabase:
https://supabase.com/dashboard/project/dlldkrzoxvjxpgkkttxu/functions/tmwe-email-sync-master/logs
