

# Piano: Deprecare Autenticazione OAuth

## Situazione Attuale

L'autenticazione OAuth e' gia' **parzialmente bypassata** — sia `ProtectedRoute` che `IntegratedAuthGuard` fanno solo `return <>{children}</>`. Pero' restano file, rotte, e logica OAuth attivi che vanno rimossi/deprecati.

## Cosa viene DEPRECATO

### Pagine da Eliminare (3 file)
| File | Rotta | Motivo |
|------|-------|--------|
| `src/pages/Auth.tsx` | `/auth` | Pagina login OAuth |
| `src/pages/OAuthCallback.tsx` | `/tmwe/callback` | Callback OAuth |
| `src/pages/TMWEAuthCallbackIntegrated.tsx` | (non in rotta ma importato) | Callback OAuth integrato |

### Rotte da Rimuovere da App.tsx
- `<Route path="/auth" ...>`
- `<Route path="/tmwe/callback" ...>`
- Import di `Auth`, `OAuthCallback`, `TMWEAuthCallbackIntegrated`

### Semplificazione TMWEAuthProvider
Il provider `src/hooks/useTMWEAuth.tsx` (289 righe) va semplificato:
- Rimuovere tutta la logica OAuth (login con token exchange, sessionStorage)
- Mantenere solo `userEmail`, `userProfile`, `isAuthenticated: true` (sempre autenticato)
- Il provider resta come wrapper leggero per non rompere i 6+ componenti che usano `useTMWEAuth()`

### File da Semplificare
- `src/components/tmwe/IntegratedAuthGuard.tsx` — gia' bypass, rimuovere import inutili (`initiateAuthorizationCodeFlow`, ecc.)
- `src/components/ProtectedRoute.tsx` — gia' bypass, rimuovere import inutili
- `src/components/email/sync/FolderSyncPreferencesManager.tsx` — rimuovere redirect a `/tmwe/callback` (riga 173)

### Logica OAuth in tmwe-api-integrated.ts
- `initiateAuthorizationCodeFlow()` — commentare/deprecare (non eliminare il file, e' usato per API calls)
- Costanti `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` — marcare come deprecated

## Cosa NON viene toccato
- `TMWEAuthManager.ts` — gestisce token per API calls (JWT), serve ancora
- `tmwe-api-proxy` edge function — gestisce auth server-side, serve
- `user_tmwe_credentials` table — contiene credenziali API, serve
- `useAuth.tsx` — Supabase auth separata, non coinvolta
- Tutto il resto del progetto

## Fasi

```text
Fase  Azione                                          File
────  ──────────────────────────────────────────────  ────
1     Eliminare 3 pagine OAuth                        3 file pages
2     Rimuovere rotte e import da App.tsx              App.tsx
3     Semplificare TMWEAuthProvider (bypass totale)    useTMWEAuth.tsx
4     Pulire IntegratedAuthGuard e ProtectedRoute      2 file
5     Fix riferimento in FolderSyncPreferencesManager  1 file
6     Deprecare initiateAuthorizationCodeFlow          tmwe-api-integrated.ts
```

## Rischio
**Basso** — L'auth e' gia' bypassata. Si tratta di rimuovere codice morto e semplificare.

