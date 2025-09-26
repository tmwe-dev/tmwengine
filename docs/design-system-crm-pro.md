# Design System: CRM Pro
**Versione 1.0 - Stile Professionale per Piattaforma CRM**

Questo documento definisce la veste grafica "CRM Pro" - un design system moderno, professionale e dark-first per applicazioni CRM aziendali.

## 🎨 PALETTE COLORI PRINCIPALE

### Colori di Brand
- **Primary Blue**: `hsl(220, 91%, 55%)` - Blu professionale moderno
- **Primary Hover**: `hsl(220, 91%, 50%)` - Versione più scura per interazioni
- **Primary Muted**: `hsl(220, 91%, 55% / 0.1)` - Sfondo trasparente

### Colori Semantici
- **Success Green**: `hsl(142, 76%, 36%)` - Verde per successo/conferme
- **Warning Yellow**: `hsl(48, 96%, 53%)` - Giallo per avvertimenti
- **Destructive Red**: `hsl(0, 84%, 60%)` - Rosso per errori/eliminazioni

### Palette Neutri (Dark Theme)
- **Background**: `hsl(240, 10%, 3.9%)` - Sfondo principale ultra-scuro
- **Surface**: `hsl(240, 10%, 3.9%)` - Superfici card/contenitori
- **Surface Secondary**: `hsl(240, 3.7%, 15.9%)` - Superfici secondarie
- **Foreground**: `hsl(0, 0%, 98%)` - Testo principale bianco
- **Muted**: `hsl(240, 5%, 64.9%)` - Testo secondario grigio

## 📏 SISTEMA DI SPAZIATURE

```css
--spacing-xs: 4px    /* Micro-spaziature */
--spacing-sm: 8px    /* Spaziature piccole */
--spacing-md: 16px   /* Spaziature standard */
--spacing-lg: 24px   /* Spaziature grandi */
--spacing-xl: 32px   /* Spaziature extra-large */
--spacing-2xl: 48px  /* Spaziature sezioni */
```

## 🔤 TIPOGRAFIA

### Font Sizes
- **XS**: 12px - Piccoli dettagli, badge
- **SM**: 14px - Testo secondario, didascalie
- **Base**: 16px - Testo corpo principale
- **LG**: 18px - Testo enfatizzato
- **XL**: 20px - Sottotitoli
- **2XL**: 24px - Titoli sezione
- **3XL**: 30px - Titoli pagina
- **4XL**: 36px - Titoli principali

### Font Weights
- **Normal**: 400 - Testo base
- **Medium**: 500 - Testo di enfasi leggera
- **Semibold**: 600 - Titoli secondari
- **Bold**: 700 - Titoli principali

## 🎯 GEOMETRIA

### Border Radius
- **Default**: 8px - Raggio standard
- **Large**: 12px - Elementi più grandi
- **XL**: 16px - Card e contenitori principali

## 🌟 OMBRE E EFFETTI

### Shadow System
```css
--shadow-sm: 0 1px 2px 0 hsl(240 3.7% 15.9% / 0.05)
--shadow-md: 0 4px 6px -1px hsl(240 3.7% 15.9% / 0.1), 0 2px 4px -2px hsl(240 3.7% 15.9% / 0.05)
--shadow-lg: 0 10px 15px -3px hsl(240 3.7% 15.9% / 0.1), 0 4px 6px -4px hsl(240 3.7% 15.9% / 0.05)
--shadow-glow: 0 0 20px hsl(220 91% 55% / 0.3) /* Glow blu per elementi attivi */
```

## ⚡ ANIMAZIONI E TRANSIZIONI

### Timing
- **Fast**: 150ms ease - Micro-interazioni
- **Normal**: 250ms ease - Transizioni standard
- **Slow**: 350ms ease - Animazioni complesse

### Animazioni Integrate
- **Fade In**: Ingresso elementi con movimento verticale
- **Scale In**: Zoom in per modali e popover
- **Slide Up**: Movimento dal basso verso l'alto
- **Accordion**: Espansione/contrazione contenuti

## 🎛️ COMPONENTI CHIAVE

### Sidebar
- **Background**: Stesso del background principale
- **Primary**: Blu brand per elementi attivi
- **Accent**: Grigio scuro per hover states
- **Border**: Bordi sottili grigi

### Cards
- **Background**: Stesso del background principale
- **Border**: Bordi grigi sottili
- **Foreground**: Testo bianco

### Buttons
- **Primary**: Blu brand con testo bianco
- **Secondary**: Grigio scuro con bordo
- **Destructive**: Rosso per azioni pericolose

## 📱 LAYOUT PATTERNS

### Spacing Classes Utility
- `.section-spacing` - Spaziatura tra sezioni (space-y-6)
- `.card-spacing` - Spaziatura interna card (space-y-4)
- `.item-spacing` - Spaziatura tra elementi (space-y-3)
- `.element-spacing` - Spaziatura micro (space-y-2)

## 🎨 PRINCIPI DI DESIGN

1. **Dark-First**: Progettato primariamente per tema scuro
2. **Professionale**: Colori sobri e corporate
3. **Accessibile**: Alto contrasto e leggibilità
4. **Consistente**: Token di design unificati
5. **Scalabile**: Sistema modulare e estendibile

## 🔧 IMPLEMENTAZIONE

Tutti i colori DEVONO essere in formato HSL e utilizzare i token CSS custom properties definiti in `src/index.css`. Mai usare colori hard-coded nei componenti.

Esempio corretto:
```css
.my-component {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: var(--radius);
  padding: var(--spacing-md);
}
```

---

**Mantieni sempre questa veste grafica in tutti i nuovi componenti e modifiche!**