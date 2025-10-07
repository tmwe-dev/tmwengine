# Esportazione Design System per Altri Progetti

## 📦 File da Copiare

### 1. Componenti Design System
Copia l'intera cartella:
```
src/components/design-system/
```

### 2. Componenti UI Base (Shadcn)
Copia i componenti base necessari:
```
src/components/ui/
  ├── button.tsx
  ├── badge.tsx
  ├── card.tsx
  ├── input.tsx
  ├── tooltip.tsx
  └── ... (altri componenti usati)
```

### 3. Utilità
Copia il file utilities:
```
src/lib/utils.ts
```

### 4. Stili CSS
Da `src/index.css`, copia le sezioni:
```css
/* Token di Design HSL */
:root {
  --background: ...;
  --foreground: ...;
  --primary: ...;
  --secondary: ...;
  /* ... tutti i token colore */
}

/* Stili per dark mode se necessario */
.dark {
  --background: ...;
  /* ... */
}
```

### 5. Configurazione Tailwind
Da `tailwind.config.ts`, copia le sezioni:
```typescript
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      background: "hsl(var(--background))",
      // ... tutti i colori semantici
    },
    // Altre estensioni (spacing, animations, etc.)
  }
}
```

## 🔧 Setup nel Nuovo Progetto

### 1. Installa Dipendenze
```bash
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot @radix-ui/react-tooltip
npm install tailwindcss postcss autoprefixer
```

### 2. Configura Tailwind
```bash
npx tailwindcss init -p
```

### 3. Importa gli Stili
Nel file CSS principale:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Token Design System HSL */
/* ... copia i token da index.css */
```

### 4. Usa i Componenti
```tsx
import { GlassCard, ActionButton, StatusBadge } from '@/components/design-system';

function MyApp() {
  return (
    <GlassCard title="Dashboard">
      <StatusBadge status="success">Attivo</StatusBadge>
      <ActionButton onClick={handleSave}>Salva</ActionButton>
    </GlassCard>
  );
}
```

## 🎨 Personalizzazione

### Modifica i Colori
Modifica i valori HSL in `index.css`:
```css
:root {
  --primary: 250 100% 60%;  /* Modifica hue, saturation, lightness */
  --secondary: 200 100% 55%;
}
```

### Aggiungi Nuove Varianti
Estendi i componenti con nuove varianti:
```tsx
// Esempio: aggiungere variant "info" a StatusBadge
const statusStyles = {
  // ... esistenti
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};
```

## 📱 Esempio Completo per tmwenginej

Per integrare nel progetto `tmwenginej`:

1. **Copia i file**:
   ```
   cp -r src/components/design-system tmwenginej/src/components/
   cp -r src/components/ui tmwenginej/src/components/
   cp src/lib/utils.ts tmwenginej/src/lib/
   ```

2. **Aggiorna index.css**:
   Copia le variabili CSS HSL in `tmwenginej/src/index.css`

3. **Aggiorna tailwind.config.ts**:
   Copia le estensioni theme in `tmwenginej/tailwind.config.ts`

4. **Installa dipendenze**:
   ```bash
   cd tmwenginej
   npm install lucide-react class-variance-authority clsx tailwind-merge
   ```

5. **Usa nel progetto**:
   ```tsx
   // tmwenginej/src/App.tsx
   import { GlassCard, ActionButton } from '@/components/design-system';
   
   function App() {
     return (
       <GlassCard title="Email Dashboard">
         <ActionButton>Componi Email</ActionButton>
       </GlassCard>
     );
   }
   ```

## ✅ Checklist Esportazione

- [ ] Componenti design-system copiati
- [ ] Componenti UI base copiati
- [ ] utils.ts copiato
- [ ] Token CSS HSL copiati in index.css
- [ ] Configurazione Tailwind aggiornata
- [ ] Dipendenze installate
- [ ] Build test eseguito
- [ ] Componenti testati nel nuovo progetto
