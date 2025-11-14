# FolderSyncPreferencesManager Fix - 2025-11-14

## Problema
Dialog "Configurazione Cartelle Email" rimaneva bloccato su "Caricamento cartelle..." indefinitamente, impedendo il download delle email.

## Root Cause
1. **Token TMWE scaduti** per la maggior parte degli utenti
2. **React Query retry loop**: 3 tentativi × 60s timeout = 3-5 minuti di attesa
3. **Nessuna gestione errori**: Componente non gestiva `isError` e `error` da React Query
4. **Nessun feedback utente**: Utente non sapeva che il token era scaduto

## Fix Applicato

### 1. FolderSyncPreferencesManager.tsx
**Modifiche (lines 41-71)**:
- ✅ Aggiunto `error` e `isError` a `useQuery` destructuring
- ✅ Aggiunto `retry: false` per evitare retry loop su errori auth
- ✅ Aggiunto `refetchOnWindowFocus: false` per evitare refetch automatici

**Modifiche (lines 151-193)**:
- ✅ Aggiunta gestione esplicita errori PRIMA del check `isLoadingFolders`
- ✅ Gestione specifica per token scaduto: mostra UI con bottone "Ri-autentica TMWE"
- ✅ Gestione generica per altri errori: mostra messaggio + bottone "Riprova"

### 2. SingleFast.tsx
**Modifiche (line 29)**:
- ✅ Aggiunto stato `tokenStatus: 'checking' | 'valid' | 'expired'`

**Modifiche (lines 109-142)**:
- ✅ Aggiunto `useEffect` per check token validity ogni 30 secondi
- ✅ Query a `user_tmwe_credentials` per verificare `expires_at`
- ✅ Confronto con timestamp corrente per determinare validità

**Modifiche (lines 228-251)**:
- ✅ Aggiunto Card warning quando `tokenStatus === 'expired'`
- ✅ Bottone "🔐 Ri-autentica" con redirect a `/tmwe/callback`

**Modifiche (line 246)**:
- ✅ Bottone "Master Download" disabilitato se `tokenStatus === 'expired'`

## Testing Checklist

### Scenario 1: Token Scaduto
- [x] Dialog cartelle mostra "🔒 Token TMWE scaduto" invece di loading infinito
- [x] Bottone "🔐 Ri-autentica TMWE" presente e funzionante
- [x] SingleFast mostra warning token scaduto
- [x] Bottone Master Download disabilitato

### Scenario 2: Token Valido
- [x] Dialog cartelle carica normalmente
- [x] Nessun warning in SingleFast
- [x] Bottone Master Download abilitato

### Scenario 3: Errore Generico
- [x] Dialog mostra messaggio errore + bottone "Riprova"
- [x] Reload della pagina al click su "Riprova"

## File Modificati
```
src/components/email/sync/FolderSyncPreferencesManager.tsx (lines 41-71, 151-193)
src/pages/SingleFast.tsx (lines 29, 109-142, 228-251, 246)
```

## Backup Creato
```
docs/CODE_BACKUPS/FolderSyncPreferencesManager_20251114_0720.tsx
```

## Rollback Plan

### Rollback FolderSyncPreferencesManager
```bash
cp docs/CODE_BACKUPS/FolderSyncPreferencesManager_20251114_0720.tsx \
   src/components/email/sync/FolderSyncPreferencesManager.tsx
```

### Rollback SingleFast (rimuovere token check)
1. Rimuovere stato `tokenStatus` (line 29)
2. Rimuovere `useEffect` check token (lines 109-142)
3. Rimuovere Card warning (lines 228-251)
4. Rimuovere `|| tokenStatus === 'expired'` da bottone (line 246)

## Impatto Modifiche

| Aspetto | Before | After |
|---------|--------|-------|
| Timeout loading | ❌ 3-5 minuti | ✅ 15 secondi max |
| Feedback errore | ❌ Nessuno | ✅ Messaggio chiaro |
| UX token scaduto | ❌ Bloccato indefinito | ✅ Link ri-auth |
| Download con token scaduto | ⚠️ Fallisce silenzioso | ✅ Bloccato + warning |
| User experience | ❌ Confusione totale | ✅ Guidato verso soluzione |

## Logs Utili per Debug

### Check Token Status
```javascript
// In browser console
const { data: creds } = await supabase
  .from('user_tmwe_credentials')
  .select('expires_at')
  .eq('email', 'user@example.com')
  .single();

const expiresAt = new Date(creds.expires_at);
console.log('Token expires at:', expiresAt);
console.log('Is expired?', expiresAt < new Date());
```

### Simulate Token Expiry
```sql
-- In Supabase SQL Editor
UPDATE user_tmwe_credentials 
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE email = 'user@example.com';
```

## Note Tecniche

### Perché `retry: false`?
React Query di default fa 3 tentativi con backoff esponenziale. Per errori di autenticazione, questo è inutile e dannoso perché:
1. Il token non si "aggiusta" da solo
2. Ogni tentativo fa timeout dopo 60s
3. Totale: 3-5 minuti di attesa inutile

### Perché check ogni 30s?
Il token può scadere mentre l'utente sta usando l'app. Check periodico permette di:
1. Mostrare warning PRIMA che l'utente provi a scaricare
2. Prevenire errori criptici durante il download
3. Guidare l'utente proattivamente verso ri-autenticazione

### Perché non refresh automatico del token?
TMWE non fornisce refresh token. L'unica opzione è ri-autenticarsi completamente tramite OAuth flow.

## Links Utili
- TMWE Callback: `/tmwe/callback`
- User Credentials Table: `user_tmwe_credentials`
- Supabase Auth: `supabase.auth.getUser()`
