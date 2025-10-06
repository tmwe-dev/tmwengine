# Configurazione EmailDetail Component

## Struttura Layout Attuale

### Container Principale
```tsx
<div className="flex h-full flex-col bg-card-transparent">
```
- Layout: `flex flex-col` (colonna verticale)
- Altezza: `h-full` (100% del contenitore padre)
- Background: `bg-card-transparent` (dal design system)

---

## Sezioni del Layout (dall'alto verso il basso)

### 1. Top Bar (Management + Navigation)
**Righe 265-398**

```tsx
<div className="grid grid-cols-3 items-center p-4 border-b bg-card-transparent">
```

**Layout:**
- Grid a 3 colonne: `grid-cols-3`
- Padding: `p-4`
- Border bottom: `border-b`

**Colonne:**
1. **Sinistra** (Management): FolderCog, Star, Trash2 buttons
2. **Centro** (Navigation): Vuoto attualmente
3. **Destra** (Actions): Settings dropdown

**Visibilità:** Nascosta quando `isHeaderCollapsed === true`

---

### 2. Action Buttons Bar
**Righe 401-425**

```tsx
<div className="flex items-center justify-center border-b p-6 md:p-8 gap-4 bg-card-transparent">
```

**Layout:**
- Flexbox orizzontale: `flex`
- Allineamento: `items-center justify-center`
- Padding: `p-6 md:p-8` (responsive)
- Gap: `gap-4`
- Border bottom: `border-b`

**Bottoni:**
- Reply (con icona User)
- Reply All (con icona Users)
- Forward (con icona Megaphone)
- Tutti con dimensione: `h-12 w-12`

**Visibilità:** Nascosta quando `isHeaderCollapsed === true`

---

### 3. Scroll Area (Contenuto Email)
**Righe 427-447**

```tsx
<ScrollArea className="flex-1">
  <div className="p-6 space-y-4">
```

**Layout:**
- ScrollArea: `flex-1` (prende tutto lo spazio rimanente)
- Padding interno: `p-6`
- Spacing verticale: `space-y-4`

**Contenuto:**
1. **Subject:**
   ```tsx
   <h2 className="text-2xl font-bold text-foreground break-words">
   ```

2. **Body:**
   ```tsx
   <div className="prose prose-sm max-w-none text-foreground/90 break-words">
   ```
   - Con `dangerouslySetInnerHTML` per HTML
   - Stili inline per word wrapping

---

## Props Importanti

```typescript
interface EmailDetailProps {
  email: { id, subject, from, to, cc, date, body, attachments }
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
  onDelete?: () => void
  onBack?: () => void
  isMobile?: boolean
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  onMarkAsRead?: (emailId: string) => void
  isHeaderCollapsed?: boolean
  onToggleCollapse?: () => void
}
```

---

## Stati Header Collapsed

### Quando `isHeaderCollapsed === false` (Default)
- Top bar visibile con tutti i bottoni
- Action buttons bar visibile
- ScrollArea prende lo spazio rimanente

### Quando `isHeaderCollapsed === true`
- Top bar nascosta
- Action buttons bar nascosta
- ScrollArea occupa quasi tutto lo spazio (solo subject e body)

---

## Integrazione con TMWEEmailDashboard

**File:** `src/pages/TMWEEmailDashboard.tsx`

### Desktop Layout (righe 603-678):
```tsx
{/* Desktop: two-column layout when email selected */}
<div className="hidden lg:flex flex-1 overflow-hidden">
  <div className={cn(
    "transition-all duration-300",
    selectedEmailId ? "w-96 border-r" : "flex-1"
  )}>
    <EmailList ... />
  </div>
  
  {selectedEmailId && (
    <div className="flex-1 overflow-hidden">
      <EmailDetail 
        isHeaderCollapsed={isHeaderCollapsed}
        onToggleCollapse={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
        ...
      />
    </div>
  )}
</div>
```

**Comportamento Desktop:**
- Quando `selectedEmailId` è null: EmailList prende tutto lo spazio (`flex-1`)
- Quando `selectedEmailId` è impostato:
  - EmailList: `w-96` (larghezza fissa 384px) + `border-r`
  - EmailDetail: `flex-1` (resto dello spazio disponibile)

### Mobile Layout (righe 680-735):
```tsx
{/* Mobile: stack layout with conditional rendering */}
<div className="flex lg:hidden flex-1 overflow-hidden">
  {showEmailList ? (
    <EmailList ... />
  ) : (
    <EmailDetail 
      isMobile={true}
      onBack={handleBackToList}
      ...
    />
  )}
</div>
```

**Comportamento Mobile:**
- Mostra O EmailList O EmailDetail (non contemporaneamente)
- Pulsante back per tornare alla lista

---

## Problemi Risolti

✅ Larghezze hardcoded rimosse da EmailList
✅ Layout responsive desktop/mobile
✅ EmailDetail sempre visibile su desktop quando email selezionata
✅ Transizioni smooth con `transition-all duration-300`

---

## Token Design System Usati

```css
bg-card-transparent
text-foreground
text-foreground/90
border-b
```

Tutti i colori usano il design system, nessun valore hardcoded.
