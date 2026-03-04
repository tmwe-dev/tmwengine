

# Piano: Unificazione Sidebar a Livello Piattaforma

## Problema Attuale

La piattaforma ha **6 sidebar indipendenti** che competono per lo stesso spazio `fixed left-0`:

| Sidebar | Pagina | Posizione | z-index |
|---------|--------|-----------|---------|
| **CRMLayout sidebar** | Globale (tutte le pagine) | `fixed left-0 top-28, w-64, z-50` | Sempre presente, collassa a `w-16` su desktop |
| **RadioSidebarPanel** | `/radio-chat` | `fixed left-0 top-24, w-[320px], z-50` | Slide-in/out |
| **RadioGhostIcons** | `/radio-chat` | `fixed left-0 bottom-8, z-40` | 5 icone verticali |
| **ConversationsSidebar** | `/chat-laboratory` | `fixed left-0 top-14, w-80, z-50` | Slide-in/out |
| **CollapsibleCategorySidebar** | `/funnemail` (inbox) | `fixed left-0 top-14, w-80, z-50` | Slide-in/out |
| **AISidebarSlider** | Radio, ChatLab, FunEmail | `fixed left-0 top-14, w-80, z-50` | Slide-in/out |

Il CRM sidebar (`w-16` collapsed) è **sempre visibile su desktop** (`lg:translate-x-0 lg:w-16`). Quando le pagine aprono le loro sidebar, si sovrappongono alla CRM sidebar. La mutua esclusione è gestita manualmente via `useCRMLayout` con prop drilling in RadioChat e con nessun meccanismo in ChatLaboratory/FunEmail.

## Soluzione: Sidebar Unica Contextuale

Trasformare il CRMLayout sidebar in un **contenitore universale** che cambia contenuto in base alla pagina corrente, eliminando tutte le sidebar `fixed left-0` duplicate.

### Architettura

```text
┌─────────────────────────────────────────────┐
│  CRMLayout Sidebar (unica, w-64 / w-16)    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Tab superiori (contextual by page) │    │
│  ├─────────────────────────────────────┤    │
│  │                                     │    │
│  │  GENERIC pages:                     │    │
│  │    → Navigation groups (attuale)    │    │
│  │                                     │    │
│  │  /radio-chat:                       │    │
│  │    → Tab Chat/Agenti/Config         │    │
│  │    → (RadioSidebarPanel content)    │    │
│  │                                     │    │
│  │  /chat-laboratory:                  │    │
│  │    → ConversationsSidebar content   │    │
│  │                                     │    │
│  │  /funnemail (inbox):                │    │
│  │    → Categories sidebar content     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Footer: AI Trigger (sempre presente)       │
└─────────────────────────────────────────────┘
```

### Fasi di Implementazione

**Fase 1 — Creare `CRMSidebarContext`**
Sostituire `CRMLayoutContext` con un context più ricco che gestisce:
- `menuOpen` / `setMenuOpen` (esistente)
- `sidebarContent: 'nav' | 'radio' | 'chatlab' | 'email' | 'ai'` — cosa mostrare nel corpo della sidebar
- `setSidebarContent(content)` — le pagine registrano il loro contenuto
- `closeSidebar()` — chiude tutto in un colpo

Questo elimina il prop drilling di `crmMenuOpen/setCrmMenuOpen` in RadioChat, ChatLab, FunEmail.

**Fase 2 — Refactoring CRMLayout sidebar**
- La sidebar CRM diventa un contenitore generico con uno slot per il contenuto
- Quando `menuOpen=true`:
  - Su pagine generiche: mostra navigation groups (come ora)
  - Su `/radio-chat`: mostra il contenuto di `RadioSidebarPanel` (3 tab)
  - Su `/chat-laboratory`: mostra il contenuto di `ConversationsSidebar`
  - Su `/funnemail`: mostra il contenuto di `CollapsibleCategorySidebar`
- Il comportamento collapsed (`w-16` icon strip) resta invariato
- Un solo hamburger button nell'header controlla tutto

**Fase 3 — Eliminare sidebar duplicate**
- `RadioSidebarPanel.tsx`: rimuovere il wrapper `fixed left-0` e renderlo un componente "content-only" che si innesta dentro la sidebar CRM
- `ConversationsSidebar.tsx`: stessa operazione — solo contenuto, niente posizionamento
- `CollapsibleCategorySidebar.tsx`: stessa operazione
- `AISidebarSlider.tsx`: integrare come tab/sezione nella sidebar CRM (footer della sidebar o tab dedicato)

**Fase 4 — Ghost Icons → Sidebar footer**
- Spostare le 5 icone di RadioChat (AI, Sidebar, FileText, Mic, Keyboard) come **quick actions nel footer della sidebar** quando siamo su `/radio-chat`
- Eliminare `RadioGhostIcons.tsx` come componente `fixed left-0` separato
- Le icone appaiono nella parte bassa della sidebar (anche in stato collapsed `w-16`)

**Fase 5 — AI Sidebar unificato**
- `AISidebarSliderUnified` è già montato globalmente in App.tsx ma non utilizzato
- Rendere l'AI trigger sempre presente nel footer della sidebar CRM (tutte le pagine)
- Quando aperto, l'AI sidebar diventa il contenuto della sidebar CRM (non una seconda sidebar sovrapposta)
- Eliminare le istanze locali di `AISidebarSlider` da RadioChat, ChatLab, FunEmail

### File da modificare

| File | Azione |
|------|--------|
| `src/contexts/CRMLayoutContext.tsx` | Espandere con `sidebarContent`, rinominare a `CRMSidebarContext` |
| `src/components/layout/CRMLayout.jsx` | Sidebar contextuale con slot per contenuto page-specific |
| `src/pages/RadioChat.tsx` | Registrare contenuto sidebar via context, rimuovere `RadioSidebarPanel` fixed |
| `src/pages/ChatLaboratory.tsx` | Registrare contenuto sidebar via context |
| `src/pages/FunEmail.tsx` | Registrare contenuto sidebar via context |
| `src/components/radio-chat/RadioSidebarPanel.tsx` | Content-only (rimuovere fixed positioning) |
| `src/components/chat-laboratory/ConversationsSidebar.tsx` | Content-only |
| `src/components/email/smart-inbox/CollapsibleCategorySidebar.tsx` | Content-only |
| `src/components/radio-chat/RadioGhostIcons.tsx` | Trasformare in sidebar footer actions |
| `src/components/ai/AISidebarSlider.tsx` | Integrare nella sidebar unificata |

### NON TOCCARE
- Header CRM (hamburger button, logo, toolbar destra)
- Contenuto delle sidebar (liste conversazioni, tab agenti/config, categorie email)
- Carousel 3D, zoom, audio playback
- Routing, auth, query

### Rischio
**Medio-Alto** — Tocca 3 pagine principali e il layout globale. Richiede test end-to-end su tutte le pagine. Backup obbligatorio prima dell'implementazione.

### Risultato Atteso
- **1 sola sidebar** in tutta la piattaforma
- **1 solo hamburger** per aprirla/chiuderla
- Nessuna sovrapposizione possibile
- Contenuto contextuale per pagina
- AI assistant accessibile ovunque dal footer sidebar
- Zero prop drilling di `crmMenuOpen/setCrmMenuOpen`

