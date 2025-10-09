# Sistema di Gestione Accessi alle Stanze - Documentazione

## Panoramica
Sistema completo per la gestione degli accessi alle stanze dell'intranet con tre livelli di accesso e personalizzazione dello stato utente.

## Componenti Implementati

### 1. Database (Migration)
- **Tabella**: `intranet_room_access_requests`
  - Gestisce richieste e inviti
  - Stati: pending, approved, rejected
  - Flag `is_invite` per distinguere inviti da richieste

- **Funzioni**:
  - `clean_expired_access_requests()`: Rimuove richieste > 7 giorni
  - `get_pending_requests_count()`: Conta richieste pendenti per utente
  - `auto_approve_public_room_request()`: Auto-approva stanze pubbliche
  - `add_member_on_approval()`: Aggiunge membri su approvazione

- **Trigger**:
  - Auto-approvazione per stanze pubbliche
  - Aggiunta automatica membri su approvazione

### 2. Hook: `useRoomAccessRequests`
**Posizione**: `src/hooks/useRoomAccessRequests.tsx`

**Funzionalità**:
- `requestAccess(roomId, message?)`: Richiede accesso a stanza
- `approveRequest(requestId)`: Approva richiesta
- `rejectRequest(requestId)`: Rifiuta richiesta
- `sendInvite(roomId, userId)`: Invia invito diretto
- Limite: max 3 richieste pendenti per utente
- Real-time: Sottoscrizione automatica ai cambiamenti

### 3. Componenti UI

#### RoomSelector
**Posizione**: `src/components/intranet/RoomSelector.tsx`

**Nuove Features**:
- Badge tipo accesso (Pubblica/Su Richiesta/Privata)
- Pulsante "Richiedi Accesso" per non-membri
- Dialog richiesta con messaggio opzionale
- Stato "In Attesa" per richieste pendenti
- Auto-refresh su cambiamenti membri

#### UserAvailabilityBadge
**Posizione**: `src/components/intranet/UserAvailabilityBadge.tsx`

**Stati Disponibili**:
- Online (🟢 verde)
- Occupato (🟡 giallo)
- Non Disturbare (🔴 rosso)
- Offline (⚫ grigio)

**Personalizzazioni**:
- Emoji custom
- Colore custom
- Messaggio di stato (max 50 caratteri)

#### UserAvailabilitySelector
**Posizione**: `src/components/intranet/UserAvailabilitySelector.tsx`

**Funzionalità**:
- Popover con selezione stato
- Input emoji personalizzata
- Color picker per colore
- Messaggio di stato
- Salvataggio automatico su `user_profiles`

#### AccessRequestsPanel
**Posizione**: `src/components/intranet/AccessRequestsPanel.tsx`

**Caratteristiche**:
- Visualizza solo richieste pendenti (non inviti)
- Nome utente e stanza
- Data richiesta
- Messaggio richiesta (se presente)
- Pulsanti Approva/Rifiuta
- ScrollArea per lista

#### OnlineUsers
**Posizione**: `src/components/intranet/OnlineUsers.tsx`

**Aggiornamenti**:
- Integrato `UserAvailabilitySelector` nell'header
- Mostra badge disponibilità per ogni utente
- Display nome utente da profilo
- Messaggio di stato personalizzato
- Caricamento profili real-time

#### AdminAccessRequests
**Posizione**: `src/components/intranet/admin/AdminAccessRequests.tsx`

**Funzionalità Admin**:
- Vista completa tutte richieste
- Filtri per stato
- Gestione inviti
- Badge colorati per stato

### 4. Integrazione Pagine

#### Intranet
**Posizione**: `src/pages/Intranet.tsx`

**Modifiche**:
- Aggiunto `AccessRequestsPanel` nella sidebar desktop
- Visibile solo per creatori stanza e admin
- Posizionato tra `OnlineUsers` e `OrganizationUsers`

#### IntranetAdmin
**Posizione**: `src/pages/IntranetAdmin.tsx`

**Nuova Tab**: "Richieste"
- Accesso a tutte le richieste di accesso
- Gestione centralizzata
- Solo per admin

## Flusso Utente

### Richiedere Accesso a Stanza
1. Utente vede stanza "Su Richiesta" o "Privata"
2. Clicca "Richiedi Accesso"
3. (Opzionale) Inserisce messaggio motivazione
4. Invia richiesta
5. Riceve notifica conferma

### Approvare/Rifiutare Richiesta
1. Creatore/Admin vede pannello richieste
2. Legge dettagli richiesta
3. Clicca "Approva" o "Rifiuta"
4. Sistema aggiorna stato
5. Se approvato: utente aggiunto automaticamente

### Personalizzare Disponibilità
1. Clicca badge stato in OnlineUsers
2. Seleziona stato da lista
3. (Opzionale) Personalizza emoji, colore, messaggio
4. Clicca "Salva"
5. Badge aggiornato per tutti

## Sicurezza RLS

### Politiche `intranet_room_access_requests`
- **SELECT**: Admin, creatori stanze, proprietari richieste
- **INSERT**: Utenti autenticati (proprie richieste), Admin/Creatori (inviti)
- **UPDATE**: Admin, creatori stanze
- **DELETE**: Nessuno

### Politiche `user_profiles`
- **SELECT**: Tutti utenti autenticati
- **INSERT/UPDATE**: Solo proprio profilo
- **DELETE**: Nessuno

## Limitazioni e Regole

1. **Max 3 richieste pendenti** per utente
2. **Timeout 7 giorni** per richieste non gestite
3. **Auto-approvazione** per stanze pubbliche
4. **Messaggio richiesta** max 500 caratteri
5. **Messaggio stato** max 50 caratteri
6. **Inviti** solo da admin e creatori stanza

## Test Eseguiti

✅ Richiesta accesso a stanza "Su Richiesta"
✅ Approvazione richiesta da creatore
✅ Rifiuto richiesta da admin
✅ Cambio stato disponibilità
✅ Personalizzazione emoji e colore
✅ Display badge in OnlineUsers
✅ Real-time update richieste
✅ Limite 3 richieste pendenti
✅ Auto-approvazione stanze pubbliche
✅ Pulizia richieste scadute

## Problemi Noti

Nessun problema noto al momento.

## Future Enhancements

- [ ] Notifiche push per nuove richieste
- [ ] Statistiche richieste per stanza
- [ ] Template messaggi richiesta
- [ ] Gestione batch richieste
- [ ] Cronologia stato disponibilità
- [ ] Inviti con scadenza temporale
