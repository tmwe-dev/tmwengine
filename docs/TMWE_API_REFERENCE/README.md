# TMWE API Reference Documentation

Questa cartella contiene la documentazione di riferimento delle API del sistema TMWE ERP.

## File Disponibili

### 1. `jwt-api.yaml`
**JWT Authentication API**
- Autenticazione stateless con JWT (5x più veloce di OAuth2)
- Grant type: `client_credentials_jwt`
- Token firmati con HS256
- Endpoint: `POST /token`

### 2. `oauth2-api-3.yaml`
**OAuth2 Authentication API**
- Authorization Code Flow
- Token refresh
- Client credentials
- Endpoint: `POST /token`, `GET /authorize`

### 3. `email-api-3.yaml`
**Email Management API**
- Gestione account email (IMAP/SMTP)
- Invio, ricezione, sincronizzazione email
- Gestione allegati, cartelle, messaggi
- Endpoint: `/email_account`, `/email_message`, `/email_folder`, `/email_attachment`

### 4. `email-rule.yaml`
**Email Rules Automation API**
- Sistema di regole automatiche per email
- Condizioni configurabili (from, subject, body, to, cc)
- Azioni automatiche (mark_as_read, move_to_folder, delete, forward, etc.)
- Prioritizzazione regole
- Endpoint: `/email_rule`, `/email_rule_component`, `/email_rule_action`

## Stato Implementazione nel Progetto

### ✅ Implementato
- OAuth2 Authentication (`src/lib/tmwe-api-integrated.ts`)
- Email Send/Receive (`supabase/functions/tmwe-email-send/`)
- Email Sync (`supabase/functions/tmwe-email-sync-master/`)
- Gestione mittenti e gruppi (`src/pages/EmailSenders.tsx`)

### 🚧 In Implementazione
- JWT Authentication (integrazione in corso)

### ⏳ Da Implementare
- Email Rules Automation
- Email Folder Management
- Email Account Testing
- Email Quota Monitoring
- Advanced Email Search

## Note Tecniche

### JWT vs OAuth2
- **JWT**: Più veloce (5x), stateless, ideale per API machine-to-machine
- **OAuth2**: Più sicuro per user authentication, supporta refresh token

### Compatibilità
Tutte le implementazioni mantengono backward compatibility con il sistema esistente.

---
*Ultima modifica: 14 Gennaio 2025*
