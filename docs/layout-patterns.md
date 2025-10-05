# Layout Patterns - FindAir CRM

Questo documento descrive i pattern di layout standardizzati per le pagine del CRM FindAir.

## Clean_Top Pattern

Pattern per l'header delle pagine con filtri collassabili.

### Struttura

```
┌─────────────────────────────────────────────────────┐
│ Titolo Pagina                            [ChevronUp]│
│ Sottotitolo descrittivo                             │
│                                                      │
│ [+] [🔍] [⚙️]                      [Settings] [AI]   │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ 🔍 Campo di ricerca...                       │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Elementi Chiave

1. **Header con Toggle**
   - Titolo principale (h1, text-heading-1, font-bold)
   - Sottotitolo descrittivo (text-body, text-text-secondary)
   - Pulsante ChevronUp/Down in alto a destra (h-8 w-8, mt-2.5)
   - Spacing: mb-4 tra header e contenuto

2. **Barra Azioni**
   - Layout: flex justify-between items-center
   - Sinistra: bottoni azione principali
     - Bottone "+" (Plus icon, size-icon, shadow-soft)
     - Bottone Cerca (ghost, size-icon, h-10 w-10)
     - Bottone Filtri (ghost, size-icon, h-10 w-10)
   - Destra: icone AI/Settings
     - PagePromptManager
     - AIChatPopup
   - Gap tra elementi: gap-1 o gap-2

3. **Card Ricerca**
   - Wrapper: Card con bg-card-transparent border-card shadow-soft
   - Content: CardContent con p-4
   - Input con icona Search a sinistra (pl-10)
   - Input full width con border-radius standard

### Comportamento Toggle

Quando `isHeaderVisible = false`:
- Mantiene visibile solo il titolo principale
- Nasconde il sottotitolo (con animate-accordion-down)
- Nasconde completamente la barra azioni e la card ricerca
- L'icona ChevronUp diventa ChevronDown

Quando `isHeaderVisible = true`:
- Mostra tutto con animazione accordion-down
- Spacing verticale compatto: space-y-4

### Codice Template

```tsx
{/* Header with Title and Toggle */}
<div className="flex justify-between items-start gap-4 mb-4">
  <div>
    <h1 className="text-heading-1 font-bold text-text-primary">Titolo</h1>
    {isHeaderVisible && (
      <p className="text-body text-text-secondary animate-accordion-down">
        Sottotitolo descrittivo
      </p>
    )}
  </div>
  
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setIsHeaderVisible(!isHeaderVisible)}
    className="h-8 w-8 shrink-0 mt-2.5"
  >
    {isHeaderVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
  </Button>
</div>

{/* Action Buttons and Filters */}
{isHeaderVisible && (
  <div className="animate-accordion-down space-y-4">
    <div className="flex justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        {/* Left-aligned action buttons */}
        <Button size="icon" className="shadow-soft">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Filter className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        {/* Right-aligned AI/Settings icons */}
        <PagePromptManager pageRoute="/route" />
        <AIChatPopup pageRoute="/route" />
      </div>
    </div>

    {/* Search Card */}
    <Card className="bg-card-transparent border-card shadow-soft">
      <CardContent className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Cerca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

---

## Clean_View Pattern

Pattern completo per pagine di gestione con lista di record.

### Struttura Completa

```
┌─────────────────────────────────────────────────────┐
│ [Clean_Top Pattern - vedi sopra]                    │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ Card Record 1                                │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Card Record 2                                │   │
│ └──────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────┐   │
│ │ Card Record 3                                │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Elementi Chiave

1. **Container Principale**
   - Classe: `space-y-6` per spacing consistente
   - Background: `backgroundImage: linear-gradient(...)`

2. **Sezione Lista Records**
   - Grid layout: `grid grid-cols-1 lg:grid-cols-2 gap-6`
   - Cards con: `bg-card-transparent border-card shadow-soft`
   - Hover effect: `hover:shadow-medium transition-shadow`

3. **Empty State**
   - Card centralizzata con icona
   - Testo descrittivo
   - CTA button per azione principale

### Caratteristiche UX

- **Responsive**: layout si adatta da 1 colonna mobile a 2 colonne desktop
- **Compact**: spacing verticale ridotto (space-y-4 invece di space-y-6)
- **Consistent icons**: tutte le icone di azione sono h-10 w-10 o h-8 w-8
- **Visual hierarchy**: 
  - Azioni principali: shadow-soft
  - Azioni secondarie: variant="ghost"
  - AI tools: sempre a destra, gap-1

### Stati Interattivi

1. **Filtri Espansi** (`isHeaderVisible = true`)
   - Mostra tutto il Clean_Top
   - Animazione accordion-down su sottotitolo e contenuto

2. **Filtri Nascosti** (`isHeaderVisible = false`)
   - Solo titolo e freccia visibili
   - Più spazio per la lista records
   - Freccia ChevronDown invita a espandere

### Design System Compliance

- **Colors**: usa semantic tokens (text-primary, text-secondary, etc.)
- **Spacing**: usa scale Tailwind (gap-1, gap-2, gap-4, space-y-4, mb-4)
- **Shadows**: shadow-soft per elevazione leggera, shadow-medium per hover
- **Animations**: animate-accordion-down per transizioni smooth
- **Typography**: text-heading-1 per titoli, text-body per testi

---

## Note di Implementazione

### Variabili di Stato Necessarie

```tsx
const [isHeaderVisible, setIsHeaderVisible] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [isFormOpen, setIsFormOpen] = useState(false);
const [isFiltersOpen, setIsFiltersOpen] = useState(false);
```

### Import Richiesti

```tsx
import { ChevronUp, ChevronDown, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AIChatPopup } from '@/components/ai/AIChatPopup';
import { PagePromptManager } from '@/components/ai/PagePromptManager';
```

### Quando Usare Questi Pattern

- **Clean_Top**: Per qualsiasi pagina che necessita filtri collassabili e ricerca
- **Clean_View**: Per pagine di gestione con liste (Campagne, Contatti, Attività, etc.)

### Adattamenti Possibili

1. **Filtri Aggiuntivi**: Aggiungi altri bottoni/dropdown nella barra azioni sinistra
2. **Multiple Views**: Aggiungi toggle griglia/lista tra le icone a destra
3. **Batch Actions**: Aggiungi checkbox e barra azioni contestuale
4. **Sorting**: Aggiungi dropdown ordinamento vicino alla ricerca

---

*Documento creato: 2025-10-05*
*Ultima modifica: 2025-10-05*
*Implementato in: src/pages/Campagne.tsx*
