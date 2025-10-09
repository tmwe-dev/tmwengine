# Test Sistema Accesso Stanze - Report Comportamento

## Test 1: Utente entra in stanza PUBBLICA

### Scenario
- Utente non è membro della stanza
- Stanza ha `access_type = 'public'`
- Utente clicca sulla stanza

### Comportamento Atteso
1. ✅ Utente viene automaticamente aggiunto come membro tramite `ensureRoomMembership()` in `Intranet.tsx`
2. ✅ Trigger `auto_approve_public_room_request` (SE l'utente fa una richiesta, viene auto-approvata)
3. ✅ Utente vede tutti i messaggi esistenti
4. ✅ Badge mostra "Pubblica" (verde)

### Flusso Tecnico
```typescript
// 1. Click su stanza in RoomSelector
onRoomSelect(room.id) // se canAccess = true

// 2. URL change in Intranet.tsx
setSearchParams({ room: roomId })

// 3. useEffect in Intranet.tsx
ensureRoomMembership() {
  // Verifica se già membro
  // Se NO: INSERT in intranet_room_members
}

// 4. ChatMessages carica messaggi
loadMessages() {
  // SELECT * FROM intranet_messages WHERE room_id = ...
  // RLS policy: "Users can view messages in their rooms"
}
```

### Possibili Problemi
❌ **PROBLEMA IDENTIFICATO**: Il `canAccess` nel RoomSelector controlla solo `is_member`
- Se utente non è ancora membro, `canAccess = false`
- Non può cliccare sulla stanza pubblica!

## Test 2: Utente richiede accesso a stanza SU RICHIESTA

### Scenario
- Utente non è membro
- Stanza ha `access_type = 'request'`
- Utente clicca "Richiedi Accesso"

### Comportamento Atteso
1. ✅ Dialog si apre con campo messaggio opzionale
2. ✅ Controllo limite 3 richieste pendenti
3. ✅ INSERT in `intranet_room_access_requests`
4. ✅ Notifica "Richiesta inviata"
5. ✅ Badge cambia in "Richiesta in attesa" (blu)

### Chi Riceve la Notifica?
**PROBLEMA**: Non c'è sistema di notifiche implementato!

Le richieste sono visibili solo a:
- **Creatore della stanza**: Vede le richieste in `AccessRequestsPanel` (sidebar desktop)
- **Admin globali**: Vedono tutte le richieste nella tab "Richieste" di IntranetAdmin

### Caricamento Richieste
```typescript
// useRoomAccessRequests.tsx
loadRequests() {
  // Query 1: Richieste dell'utente
  .eq('user_id', user.id)
  
  // Query 2: Richieste per stanze create dall'utente
  .eq('intranet_rooms.created_by', user.id)
}
```

### RLS Policies
```sql
-- Users can create access requests
INSERT: (auth.uid() = user_id)

-- Room creators can view requests for their rooms
SELECT: EXISTS (SELECT 1 FROM intranet_rooms 
                WHERE id = room_id AND created_by = auth.uid())

-- Admins can view all requests
SELECT: is_admin(auth.uid())
```

## Test 3: Creatore/Admin APPROVA richiesta

### Flusso
1. Creatore vede richiesta in `AccessRequestsPanel`
2. Clicca "Approva"
3. `approveRequest(requestId)` viene chiamato
4. UPDATE: `status = 'approved', reviewed_at = now(), reviewed_by = user.id`
5. **Trigger `add_member_on_approval`** aggiunge utente a `intranet_room_members`
6. Toast "Richiesta approvata"

### Chi Viene Notificato?
**PROBLEMA**: L'utente che ha fatto la richiesta NON riceve notifica!

## Test 4: Utente cerca di entrare in stanza PRIVATA

### Comportamento Atteso
- Badge "Privata" (rosso)
- Nessun pulsante di accesso visibile
- `canAccess = false` → non può cliccare

### Accesso Possibile Solo Tramite
- Invito diretto da admin/creatore usando `sendInvite()`
- Funzione non esposta in UI al momento

## Problemi Identificati

### 🔴 CRITICO: Stanze pubbliche non accessibili da non-membri
**Problema**: 
```typescript
const canAccess = room.is_member || room.access_type === 'public';
```
Ma se `is_member = false`, `canAccess` dipende da `is_member` essere caricato correttamente.

**Soluzione**: 
```typescript
const canAccess = room.is_member || room.access_type === 'public';
// Dovrebbe funzionare MA verificare che is_member sia calcolato correttamente
```

### 🟡 MEDIO: Nessun sistema di notifiche real-time
**Problema**: 
- Creatore non sa quando arriva una richiesta
- Utente non sa quando viene approvato

**Soluzione proposta**:
- Aggiungere notifiche real-time via Supabase Realtime
- Toast quando arriva nuova richiesta
- Toast quando richiesta viene approvata

### 🟡 MEDIO: Inviti non esposti in UI
**Problema**: 
- `sendInvite()` esiste nell'hook
- Non c'è UI per inviare inviti

**Soluzione proposta**:
- Aggiungere pulsante "Invita Utente" per creatori/admin
- Lista utenti da invitare

### 🟢 MINOR: AccessRequestsPanel visibile solo su desktop
**Problema**: 
- Su mobile non c'è modo di vedere/gestire richieste
- Admin devono andare su IntranetAdmin

## Raccomandazioni

1. ✅ **FATTO**: Auto-join per stanze pubbliche
2. ⚠️ **DA VERIFICARE**: Controllare che `canAccess` funzioni per stanze pubbliche
3. ❌ **MANCANTE**: Sistema notifiche real-time
4. ❌ **MANCANTE**: UI per inviti diretti
5. ❌ **MANCANTE**: AccessRequestsPanel su mobile

## Test da Eseguire

### Test Manuale 1: Stanza Pubblica
1. Creare stanza pubblica (access_type='public')
2. Con altro utente, vedere se può cliccare
3. Verificare auto-join
4. Verificare caricamento messaggi

### Test Manuale 2: Stanza Su Richiesta
1. Creare stanza request (access_type='request')
2. Con altro utente, richiedere accesso
3. Verificare che creatore vede richiesta
4. Approvare richiesta
5. Verificare che utente diventa membro

### Test Manuale 3: Limite Richieste
1. Fare 3 richieste
2. Tentare 4a richiesta
3. Verificare messaggio errore

## Query di Test

```sql
-- Verifica membri stanza
SELECT * FROM intranet_room_members WHERE room_id = 'xxx';

-- Verifica richieste
SELECT * FROM intranet_room_access_requests WHERE room_id = 'xxx';

-- Verifica messaggi
SELECT * FROM intranet_messages WHERE room_id = 'xxx';
```
