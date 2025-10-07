# Riferimento Completo Strumenti AI CRM

## Strumenti Disponibili

L'AI del CRM ha accesso a **9 strumenti** per interagire con i dati:

### 1. count_records
**Descrizione:** Conta i record in una tabella con filtri opzionali  
**Tabelle supportate:** rubrica, campagne, attivita, email_messages, imported_contacts

**Parametri:**
- `table` (obbligatorio): Nome della tabella
- `filters` (opzionale): Oggetto con filtri (es: `{stato: 'aperta'}`)

**Esempi di utilizzo:**
```
"Quanti contatti ho in rubrica?"
"Conta le attività con stato 'aperta'"
"Quante email ho ricevuto?"
```

---

### 2. get_table_data
**Descrizione:** Recupera dati da una tabella con filtri, ordinamento e limite  
**Tabelle supportate:** rubrica, campagne, attivita, email_messages, imported_contacts

**Parametri:**
- `table` (obbligatorio): Nome della tabella
- `columns` (opzionale): Colonne da selezionare (default: '*')
- `filters` (opzionale): Oggetto con filtri
- `order_by` (opzionale): Ordinamento `{column: 'nome_colonna', ascending: true/false}`
- `limit` (opzionale): Numero massimo risultati (default: 10)

**Esempi di utilizzo:**
```
"Mostrami le ultime 5 attività ordinate per data"
"Vedi tutti i contatti dell'azienda XYZ"
"Lista le campagne attive"
```

---

### 3. get_statistics
**Descrizione:** Ottieni statistiche generali complete del CRM  
**Parametri:** Nessuno

**Statistiche fornite:**
- Contatti totali
- Campagne totali e attive
- Attività totali e in scadenza (prossimi 7 giorni)
- Email totali

**Esempi di utilizzo:**
```
"Dammi le statistiche generali del CRM"
"Panoramica dati CRM"
"Mostra i numeri principali"
```

---

### 4. search_contacts
**Descrizione:** Cerca contatti specifici per nome, azienda o email  
**Parametri:**
- `query` (obbligatorio): Termine di ricerca
- `limit` (opzionale): Numero massimo risultati (default: 10)

**Esempi di utilizzo:**
```
"Cerca Mario Rossi"
"Trova tutti i contatti di Acme Corp"
"Cerca email contenente @example.com"
```

---

### 5. get_campaign_status
**Descrizione:** Ottieni informazioni sulle campagne  
**Parametri:**
- `campaign_id` (opzionale): ID campagna specifica (se omesso, ritorna tutte)

**Esempi di utilizzo:**
```
"Mostra tutte le campagne"
"Qual è lo stato della campagna X?"
"Lista campagne attive"
```

---

### 6. get_activities
**Descrizione:** Lista attività filtrate  
**Parametri:**
- `status` (opzionale): Filtra per stato (aperta, in_corso, completata)
- `priority` (opzionale): Filtra per priorità (bassa, media, alta)
- `assignee` (opzionale): UUID dell'assegnatario
- `limit` (opzionale): Numero massimo risultati (default: 10)

**Esempi di utilizzo:**
```
"Mostrami le attività aperte"
"Lista task con priorità alta"
"Attività completate oggi"
```

---

### 7. insert_activity
**Descrizione:** Crea una nuova attività  
**Parametri:**
- `titolo` (obbligatorio): Titolo dell'attività
- `tipo` (opzionale): chiamata, email, meeting, task, follow_up
- `descrizione` (opzionale): Descrizione dettagliata
- `priorita` (opzionale): bassa, media, alta, urgente (default: media)
- `stato` (opzionale): aperta, in_corso, completata (default: aperta)
- `scadenza` (opzionale): Data in formato ISO
- `rubrica_id` (opzionale): UUID del contatto collegato
- `note` (opzionale): Note aggiuntive

**Esempi di utilizzo:**
```
"Crea un task per chiamare il cliente XYZ domani"
"Pianifica meeting con ABC Ltd tra 3 giorni"
"Aggiungi attività di follow-up email per Mario Rossi"
```

---

### 8. update_record
**Descrizione:** Aggiorna un record esistente  
**Tabelle supportate:** rubrica, campagne, attivita, email_messages

**Parametri:**
- `table` (obbligatorio): Nome della tabella
- `id` (obbligatorio): UUID del record
- `updates` (obbligatorio): Oggetto con campi da aggiornare

**Esempi di utilizzo:**
```
"Segna l'attività X come completata"
"Aggiorna l'email del contatto Y"
"Cambia lo stato della campagna Z in 'pausata'"
```

---

### 9. insert_contact
**Descrizione:** Aggiunge un nuovo contatto nella rubrica  
**Parametri:** (tutti opzionali)
- `nome`: Nome del contatto
- `responsabile`: Nome del responsabile
- `azienda`: Nome azienda
- `email`: Indirizzo email
- `telefono`: Numero di telefono
- `cellulare`: Numero cellulare
- `indirizzo`: Indirizzo completo
- `citta`: Città
- `paese`: Paese
- `zip_code`: CAP
- `note`: Note sul contatto
- `stato`: Stato (A=Attivo, default: A)

**Esempi di utilizzo:**
```
"Aggiungi un nuovo contatto: Mario Rossi, email: mario@example.com"
"Crea contatto per l'azienda XYZ con telefono 123456789"
"Inserisci nuovo cliente con tutti i dati"
```

---

## Pagine con Prompt AI Specializzati

### 1. /attivita - Gestione Attività CRM
**Strumenti principali:**
- get_activities, insert_activity, update_record
- count_records (per statistiche)
- search_contacts (per collegamenti)

**Workflow supportati:**
- Pianificazione giornata
- Follow-up post-chiamata
- Gestione pipeline vendita
- Recovery task overdue
- Automazioni workflow

---

### 2. /campagne - Gestione Campagne
**Strumenti principali:**
- get_campaign_status
- get_table_data (campagne)
- update_record (campagne)
- count_records

**Workflow supportati:**
- Creazione campagne
- Tracking performance
- Analisi conversioni
- Segmentazione target

---

### 3. /rubrica - Gestione Rubrica CRM
**Strumenti principali:**
- search_contacts
- insert_contact
- get_table_data (rubrica)
- update_record (rubrica)
- count_records

**Workflow supportati:**
- Ricerca avanzata contatti
- Segmentazione clienti
- Aggiornamento anagrafiche
- Analisi portfolio clienti

---

### 4. /email-manager - Dashboard Email
**Strumenti principali:**
- get_table_data (email_messages)
- count_records (email_messages)
- search_contacts (per mittenti)

**Workflow supportati:**
- Ricerca email
- Analisi conversazioni
- Classificazione messaggi
- Tracking comunicazioni

---

### 5. /gestisci-import - Gestione Import
**Strumenti principali:**
- get_table_data (imported_contacts)
- count_records (imported_contacts)

**Workflow supportati:**
- Validazione dati importati
- Pulizia duplicati
- Trasferimento in rubrica

---

## Linee Guida per l'Uso

### Query Efficaci
1. **Sii specifico**: "Mostra attività alta priorità in scadenza oggi" invece di "mostra attività"
2. **Usa filtri**: Sfrutta i parametri opzionali per risultati precisi
3. **Combina strumenti**: L'AI può usare più strumenti in sequenza
4. **Contesto**: L'AI ricorda la conversazione, fai domande di follow-up

### Best Practices
- Usa linguaggio naturale italiano
- L'AI capisce sinonimi e varianti
- Specifica date in formato chiaro (es: "domani", "tra 3 giorni", "15 ottobre")
- Per operazioni su record specifici, fornisci identificatori univoci quando possibile

### Limitazioni
- Limite risultati default: 10 record (aumentabile con parametro `limit`)
- Le operazioni batch richiedono più chiamate sequenziali
- I filtri complessi potrebbero richiedere più passaggi

---

## Esempi di Workflow Complessi

### 1. Onboarding Nuovo Cliente
```
"Nuovo cliente Acme Corp, prepara l'onboarding"

→ insert_contact (Acme Corp)
→ insert_activity (chiamata benvenuto +1gg)
→ insert_activity (invio materiale +2gg)
→ insert_activity (follow-up +5gg)
→ insert_activity (meeting setup +7gg)
```

### 2. Analisi Performance
```
"Analizza le mie performance commerciali questo mese"

→ get_statistics (panoramica generale)
→ count_records (attività completate con filtro mese corrente)
→ get_table_data (campagne con risultati)
→ Calcoli e confronti
→ Suggerimenti miglioramento
```

### 3. Recupero Task in Ritardo
```
"Ho task in ritardo, aiutami a gestirli"

→ get_activities (filtro scadenza < oggi, stato ≠ completata)
→ count_records per priorità
→ Analisi dipendenze
→ Suggerimenti ri-prioritizzazione
→ Proposte accorpamento
```

---

## Verifica Disponibilità Strumenti

Per verificare che tutti gli strumenti siano correttamente configurati:

1. Controlla `supabase/functions/chat-with-ai/index.ts` - definisce i 9 tools
2. Controlla `supabase/functions/crm-tools/index.ts` - implementa le funzioni
3. Controlla `page_system_prompts` nel database - contiene i prompt specializzati

---

**Ultimo aggiornamento:** 07 Ottobre 2025  
**Versione:** 2.0 - Include get_table_data
