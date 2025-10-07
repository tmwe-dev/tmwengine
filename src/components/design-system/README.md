# CRM Pro Design System

Sistema di design completo e riutilizzabile per applicazioni CRM moderne.

## 🎨 Filosofia del Design

- **Glassmorphism**: Effetti di vetro sfumato con backdrop blur
- **Gradients**: Gradienti diagonali con colori primari
- **Semantic Tokens**: Tutti i colori sono token semantici HSL
- **Responsive**: Mobile-first con breakpoints standard
- **Accessible**: WCAG 2.1 AA compliant

## 📦 Componenti

### Cards
- `GlassCard` - Card con effetto glassmorphism
- `GradientCard` - Card con gradiente di sfondo
- `DataCard` - Card per visualizzare dati con icona e valore
- `StatCard` - Card per statistiche con trend

### Buttons
- `ActionButton` - Bottone per azioni primarie
- `IconButton` - Bottone con solo icona
- `ButtonGroup` - Gruppo di bottoni allineati

### Badges
- `StatusBadge` - Badge per stati (success, warning, error, info)
- `CountBadge` - Badge con contatore numerico

### Forms
- `FormField` - Campo form con label e validazione
- `SearchInput` - Input di ricerca con icona
- `DateRangeInput` - Selettore di range date

### Data Display
- `DataTable` - Tabella dati responsive
- `EmptyState` - Stato vuoto con icona e messaggio
- `LoadingState` - Stato di caricamento

## 🚀 Utilizzo

```tsx
import { GlassCard, ActionButton, StatusBadge } from '@/components/design-system';

function MyComponent() {
  return (
    <GlassCard>
      <h2>Titolo</h2>
      <StatusBadge status="success">Attivo</StatusBadge>
      <ActionButton onClick={handleClick}>Salva</ActionButton>
    </GlassCard>
  );
}
```

## 🎨 Token di Design

Tutti i colori sono definiti in `src/index.css` come variabili HSL:
- `--primary` - Colore primario
- `--secondary` - Colore secondario
- `--success` - Verde per stati positivi
- `--warning` - Giallo per avvisi
- `--destructive` - Rosso per azioni distruttive

## 📱 Esportazione per Altri Progetti

Per usare questo design system in altri progetti:

1. Copia la cartella `src/components/design-system`
2. Copia le variabili CSS da `src/index.css`
3. Copia la configurazione Tailwind da `tailwind.config.ts`
4. Installa le dipendenze: `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`

## 🎯 Best Practices

- Usa sempre i token semantici invece di colori diretti
- Non usare `text-white`, `bg-white` - usa i token del design system
- Preferisci `variant` props invece di classi custom
- Mantieni la consistenza con i componenti esistenti
