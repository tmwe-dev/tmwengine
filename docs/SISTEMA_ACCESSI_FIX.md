# Sistema Gestione Accessi Stanze - CHANGELOG FIX

## Fix Implementati - 2025-10-09

### 1. ✅ Query useRoomAccessRequests
**Problema**: Errore PGRST100 nella query con `.or()` e join
**Soluzione**: Split in due query separate e merge dei risultati
```typescript
// Prima: richieste utente
.eq('user_id', user.id)
// Poi: richieste per stanze create
.eq('intranet_rooms.created_by', user.id)
// Infine: merge e deduplicazione
```

### 2. ✅ Auto-join Solo Stanze Pubbliche
**Problema**: `ensureRoomMembership()` aggiungeva utente a TUTTE le stanze
**Soluzione**: Verifica `access_type` prima di aggiungere
```typescript
const { data: room } = await supabase
  .from('intranet_rooms')
  .select('access_type')
  .eq('id', selectedRoomId)
  .single();

// Solo se pubblica
if (room?.access_type !== 'public') return;
```

### 3. ✅ Ordine canAccess Corretto
**Problema**: `room.is_member || room.access_type === 'public'` poteva fallire
**Soluzione**: Priorità a `access_type`
```typescript
const canAccess = room.access_type === 'public' || room.is_member;
```

## Comportamento Corretto Post-Fix

### Stanza PUBBLICA
1. Utente clicca → sempre accessibile (`canAccess = true`)
2. `ensureRoomMembership()` verifica `access_type === 'public'`
3. Se non membro → INSERT automatico in `intranet_room_members`
4. Messaggi caricati correttamente

### Stanza SU RICHIESTA
1. Se non membro → mostra "Richiedi Accesso"
2. Click richiesta → INSERT in `intranet_room_access_requests`
3. Creatore vede in `AccessRequestsPanel`
4. Approva → trigger `add_member_on_approval` aggiunge a membri
5. NESSUN auto-join

### Stanza PRIVATA
1. Badge "Privata" rosso
2. Nessun pulsante accesso
3. Solo tramite invito diretto (non in UI)
4. NESSUN auto-join

## Notifiche - Stato Attuale

### Chi Vede le Richieste
- **Creatore stanza**: `AccessRequestsPanel` in sidebar (desktop)
- **Admin globali**: Tab "Richieste" in `IntranetAdmin`

### Limitazioni Attuali
- ❌ Nessuna notifica real-time quando arriva richiesta
- ❌ Nessuna notifica quando richiesta viene approvata
- ❌ `AccessRequestsPanel` non visibile su mobile

## Test Verificati

### ✅ Test 1: Stanza Pubblica
- Utente non membro clicca stanza pubblica
- Auto-join funziona
- Messaggi visibili

### ✅ Test 2: Stanza Su Richiesta
- Utente vede "Richiedi Accesso"
- Limite 3 richieste pendenti rispettato
- Creatore vede richiesta
- Approvazione funziona

### ✅ Test 3: Query Performance
- Split query evita errore
- Deduplicazione corretta
- Real-time subscription funzionante

## Problemi Rimanenti (Non Critici)

1. **Sistema Notifiche Real-time**: Mancante
2. **Mobile AccessRequestsPanel**: Non disponibile
3. **UI Inviti Diretti**: Non implementata
4. **Notifica Approvazione**: L'utente non sa quando viene approvato

## Codice Modificato

### File Modificati
1. `src/hooks/useRoomAccessRequests.tsx` - Query split
2. `src/pages/Intranet.tsx` - Auto-join condizionale
3. `src/components/intranet/RoomSelector.tsx` - Ordine canAccess

### File Creati
1. `docs/TEST_SISTEMA_ACCESSI.md` - Documentazione test
2. `src/components/intranet/AccessSystemDebugger.tsx` - Tool debug
3. `docs/SISTEMA_ACCESSI_FIX.md` - Questo changelog
