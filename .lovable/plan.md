

# Fix Radio Chat - Creazione Conversazione

## Problema

La creazione conversazione fallisce silenziosamente perche:

1. `useRadioAuth` non trova un utente autenticato (auth bypass attivo), quindi `currentUser?.id` e `undefined`
2. `createConversation` in `useRadioConversations.ts` ritorna `null` senza feedback quando `userId` e undefined (riga 66)
3. `createQuickConversation` inserisce senza `user_id`, ma `loadConversations` filtra per `user_id` -- le conversazioni create non appaiono mai
4. `useRadioAuth` ha `toast` nelle dipendenze del useEffect, causando ri-esecuzioni inutili

## Piano di Fix

### 1. Fix `useRadioAuth.ts`
- Rimuovere `toast` dalle dipendenze di `useEffect` (usa `useRef` per evitare loop)
- Aggiungere un fallback: se non c'e utente, provare `supabase.auth.getSession()` come backup

### 2. Fix `useRadioConversations.ts` - Unificare la creazione
- Modificare `createConversation` per funzionare anche senza `userId`:
  - Se `userId` e disponibile, inserire con `user_id`
  - Se `userId` e `undefined`, inserire senza `user_id` (come fa `createQuickConversation`)
- Aggiungere toast di errore quando `userId` e null (non fallire silenziosamente)
- Modificare `loadConversations` per caricare anche conversazioni senza `user_id` quando l'utente non e autenticato

### 3. Fix `createQuickConversation` - Includere `user_id`
- Passare `userId` anche a `createQuickConversation` cosi le conversazioni non sono orfane
- Se `userId` esiste, includerlo nell'insert

### 4. Fix `useRadioSendMessage.ts`
- Dopo il `sendMessage`, se la conversazione era appena creata, ricaricare i messaggi tramite realtime (gia funzionante) ma anche forzare `setIsSending(false)` in caso di errore non catturato

## Dettagli Tecnici

### File Modificati
- `src/hooks/useRadioAuth.ts` - Fix dipendenze useEffect
- `src/hooks/useRadioConversations.ts` - Unificare creazione, fix loadConversations, fix createQuickConversation
- `src/hooks/useRadioSendMessage.ts` - Fix finally block per sbloccare UI

### Rischio: BASSO
- Nessuna modifica DB (user_id e gia nullable)
- Nessuna modifica a componenti UI
- Solo logica hook

