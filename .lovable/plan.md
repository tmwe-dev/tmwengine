

# Piano: Eliminazione Sidebar Duplicate Rimanenti

## Stato Attuale

Il sistema portal (`SidebarPortal` + `CRMSidebarContext`) e' gia' operativo per RadioChat e ChatLaboratory. Tuttavia rimangono **7 componenti `fixed left-0`** duplicati:

| Componente | Pagina | Tipo |
|---|---|---|
| `AISidebarSlider` | RadioChat | `fixed left-0 top-14 w-80 z-50` |
| `AISidebarSlider` | ChatLaboratory | `fixed left-0 top-14 w-80 z-50` |
| `AISidebarSlider` | FunEmail | `fixed left-0 top-14 w-80 z-50` |
| `AISidebarTrigger` | ChatLaboratory | `fixed left-0 bottom-[12rem] z-40` |
| `AISidebarTrigger` + Categories trigger | FunEmail | `fixed left-0 z-40` |
| `CollapsibleCategorySidebar` | FunEmail | `fixed left-0 top-14 w-80 z-50` |
| `RadioGhostIcons` | RadioChat | `fixed left-0 bottom-8 z-40` |

## Piano di Implementazione

### Fase 1 — Espandere CRMSidebarContext con AI state globale
Aggiungere al context:
- `aiSidebarOpen` / `setAiSidebarOpen` — stato globale AI sidebar
- Cosi' tutte le pagine condividono lo stesso toggle AI senza stato locale

File: `src/contexts/CRMLayoutContext.tsx`

### Fase 2 — AI Sidebar nel footer della CRM sidebar (globale)
Aggiungere un trigger Sparkles nel footer della sidebar CRM (`CRMLayout.jsx`), visibile su tutte le pagine (anche in stato collapsed `w-16`). Quando cliccato, il contenuto della sidebar CRM mostra `AISidebarSlider` come content-only (senza il suo wrapper `fixed`).

File: `src/components/layout/CRMLayout.jsx`, `src/components/ai/AISidebarSlider.tsx`

### Fase 3 — Rimuovere AISidebarSlider e AISidebarTrigger dalle 3 pagine
- **RadioChat.tsx**: Rimuovere import e render di `AISidebarSlider`. L'AI e' ora nel CRM sidebar.
- **ChatLaboratory.tsx**: Rimuovere `AISidebarSlider`, `AISidebarTrigger` (fixed), e stato locale `aiSidebarOpen`.
- **FunEmail.tsx**: Rimuovere `AISidebarSlider`, `AISidebarTrigger` (fixed), e stato locale `aiSidebarOpen`.

### Fase 4 — FunEmail: Categories sidebar via Portal
- Wrappare `CollapsibleCategorySidebar` in `SidebarPortal` (come RadioChat e ChatLab)
- Rimuovere il wrapper `fixed left-0` da `CollapsibleCategorySidebar.tsx`, renderlo content-only
- Rimuovere il trigger `📬` fixed da FunEmail — l'apertura avviene tramite hamburger CRM

File: `src/pages/FunEmail.tsx`, `src/components/email/smart-inbox/CollapsibleCategorySidebar.tsx`

### Fase 5 — Ghost Icons di RadioChat nel footer sidebar
- Spostare le 5 icone (AI, Sidebar trigger, FileText, Mic, Keyboard) come quick-actions nel footer della sidebar CRM, visibili solo su `/radio-chat`
- Renderle visibili anche in stato collapsed (`w-16`) come icone piccole
- Eliminare `RadioGhostIcons` come componente `fixed left-0` separato

File: `src/components/layout/CRMLayout.jsx`, `src/components/radio-chat/RadioGhostIcons.tsx`, `src/pages/RadioChat.tsx`

### File Modificati

| File | Azione |
|---|---|
| `src/contexts/CRMLayoutContext.tsx` | Aggiungere `aiSidebarOpen` state |
| `src/components/layout/CRMLayout.jsx` | AI trigger footer + ghost icons slot per radio-chat |
| `src/components/ai/AISidebarSlider.tsx` | Aggiungere modalita' content-only (senza fixed wrapper) |
| `src/pages/RadioChat.tsx` | Rimuovere AISidebarSlider, ghost icons diventa sidebar footer |
| `src/pages/ChatLaboratory.tsx` | Rimuovere AISidebarSlider + AISidebarTrigger fixed |
| `src/pages/FunEmail.tsx` | Rimuovere AISidebarSlider + trigger fixed, usare SidebarPortal per categories |
| `src/components/email/smart-inbox/CollapsibleCategorySidebar.tsx` | Content-only (rimuovere fixed wrapper) |
| `src/components/radio-chat/RadioGhostIcons.tsx` | Convertire da fixed a sidebar footer content |

### NON TOCCARE
- Header CRM (hamburger, logo, toolbar)
- Contenuto interno delle sidebar (liste conversazioni, tab agenti, categorie email)
- Carousel 3D, audio, zoom
- `AISidebarSliderUnified.tsx` (componente separato gia' in App.tsx)

### Rischio
**Medio-Alto** — Tocca 3 pagine e il layout globale. Backup obbligatorio. Test end-to-end su tutte le pagine dopo implementazione.

